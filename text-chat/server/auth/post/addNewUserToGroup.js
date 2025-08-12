const connectDB = require('../../database');

module.exports = async function (req, res) {
    const { groupId, user } = req.body;
    if (!req.body || typeof groupId !== 'number' || !user || !user.username) {
        return res.status(400).json({ "valid": false, "error": "Invalid request. Group ID and user object are required." });
    }

    try {
        const db = await connectDB();
        let dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found." });
        }

        const targetGroup = dataDocument.groups.find(g => g.id === groupId);
        if (!targetGroup) {
            return res.status(404).json({ "valid": false, "error": "Group not found." });
        }

        const userExists = targetGroup.users.some(u => u.username === user.username);
        if (userExists) {
            return res.status(409).json({ "valid": false, "error": "User is already a member of this group." });
        }

        const newGroupUser = {
            username: user.username,
            profilePicture: user.profilePicture,
            role: 'User'
        };

        const [groupUpdateResult, userUpdateResult, requestCleanupResult] = await Promise.all([
            // Add the new user to the main group's 'users' array
            db.collection('db').updateOne(
                { "groups.id": groupId },
                { $push: { "groups.$.users": newGroupUser } }
            ),
            // Add the group to the target user's 'groups' array
            db.collection('db').updateOne(
                { "users.username": user.username },
                { $push: { "users.$.groups": targetGroup } }
            ),
            // Remove pending join requests for this user and group from all admins
            db.collection('db').updateMany(
                { },
                { $pull: { "users.$[].requests": { username: user.username, groupId: groupId } } }
            )
        ]);

        if (groupUpdateResult.modifiedCount === 0 || userUpdateResult.modifiedCount === 0) {
            return res.status(500).json({ "valid": false, "error": "Failed to add user to group." });
        }
        
        dataDocument = await db.collection('db').findOne({});
        const updatedGroup = dataDocument.groups.find(g => g.id === groupId);
        if (!updatedGroup) {
            return res.status(404).json({ "valid": false, "error": "Could not find the updated group to sync." });
        }

        await Promise.all([
            // Update new group to all user's groups array
            db.collection('db').updateMany(
                { "users.groups.id": groupId },
                { $set: { "users.$[elem].groups.$[group]": updatedGroup } },
                { arrayFilters: [{ "elem.groups.id": groupId }, { "group.id": groupId }] }
            ),
            // Update new group to all user's adminGroups array
            db.collection('db').updateMany(
                { "users.adminGroups.id": groupId },
                { $set: { "users.$[elem].adminGroups.$[group]": updatedGroup } },
                { arrayFilters: [{ "elem.adminGroups.id": groupId }, { "group.id": groupId }] }
            )
        ]);
        
        res.status(200).json({ "valid": true, "error": "" });

    } catch (err) {
        console.error("Error adding new user to group:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
};