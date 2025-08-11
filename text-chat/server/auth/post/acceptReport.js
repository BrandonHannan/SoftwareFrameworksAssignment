const connectDB = require('../../database');

module.exports = async function (req, res) {
    const report = req.body;
    if (!report || !report.usernameReported || typeof report.groupId !== 'number') {
        return res.status(400).json({ "valid": false, "error": "Invalid report object provided." });
    }
    const { usernameReported, groupId } = report;

    try {
        const db = await connectDB();
        let dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found." });
        }
        
        const [userGroupsResult, userAdminGroupsResult, mainGroupResult, reportCleanupResult] = await Promise.all([
            // Remove the group from the user's 'groups' array
            db.collection('db').updateOne(
                { "users.username": usernameReported },
                { $pull: { "users.$.groups": { id: groupId } } }
            ),
            // Remove the group from the user's 'adminGroups' array
            db.collection('db').updateOne(
                { "users.username": usernameReported },
                { $pull: { "users.$.adminGroups": { id: groupId } } }
            ),
            // Remove the user from the main group's 'users' array
            db.collection('db').updateOne(
                { "groups.id": groupId },
                { $pull: { "groups.$.users": { username: usernameReported } } }
            ),
            // Remove this specific report from all SuperAdmins
            db.collection('db').updateMany(
                { },
                { $pull: { "users.$[admin].reports": report } },
                { arrayFilters: [{ "admin.roles": "SuperAdmin" }] }
            )
        ]);

        // Check if removing the user from the group was successful
        if (mainGroupResult.modifiedCount === 0) {
            return res.status(404).json({ "valid": false, "error": "User was not found in the specified group." });
        }

        // Get the newly updated group object to propagate the changes
        dataDocument = await db.collection('db').findOne({});
        const updatedGroup = dataDocument.groups.find(g => g.id === groupId);
        
        if (updatedGroup) {
            // Propagate the updated group to all other users who have it
            await Promise.all([
                db.collection('db').updateMany(
                    { "users.groups.id": groupId },
                    { $set: { "users.$[elem].groups.$[group]": updatedGroup } },
                    { arrayFilters: [{ "elem.groups.id": groupId }, { "group.id": groupId }] }
                ),
                db.collection('db').updateMany(
                    { "users.adminGroups.id": groupId },
                    { $set: { "users.$[elem].adminGroups.$[group]": updatedGroup } },
                    { arrayFilters: [{ "elem.adminGroups.id": groupId }, { "group.id": groupId }] }
                )
            ]);
        }

        // Check if the banned user needs their "GroupAdmin" role removed
        const bannedUser = dataDocument.users.find(u => u.username === usernameReported);
        if (bannedUser && bannedUser.adminGroups.length === 0) {
            await db.collection('db').updateOne(
                { "users.username": usernameReported },
                { $pull: { "users.$.roles": "GroupAdmin" } }
            );
        }

        res.status(200).json({ "valid": true, "error": "" });

    } 
    catch (err) {
        console.error("Error accepting report:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
};