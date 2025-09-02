const connectDB = require('../../database');

module.exports = async function (req, res) {
    const { username, groupId, role } = req.body;
    if (!req.body || !username || typeof groupId !== 'number' || !role) {
        return res.status(400).json({ "valid": false, "error": "Invalid request. Username, groupId, and role are required." });
    }

    try {
        let db = await connectDB();
        let dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found" });
        }

        // SuperAdmin Promotion
        if (role === 'SuperAdmin') {
            const userDoc = dataDocument.users.find(u => u.username === username);
            if (!userDoc) {
                return res.status(404).json({ "valid": false, "error": `User '${username}' not found.` });
            }

            const groupUserPayload = {
                username: userDoc.username,
                profilePicture: userDoc.profilePicture,
                role: 'SuperAdmin'
            };

            // Perform the global SuperAdmin promotion
            const [roleResult, updateExistingResult, addNewResult] = await Promise.all([
                db.collection('db').updateOne(
                    { "_id": dataDocument._id, "users.username": username }, 
                    { $addToSet: { "users.$.roles": "SuperAdmin" } }),
                db.collection('db').updateMany(
                    { "_id": dataDocument._id }, 
                    { $set: { "groups.$[].users.$[user].role": "SuperAdmin" } }, 
                    { arrayFilters: [{ "user.username": username }] }),
                db.collection('db').updateMany(
                    { "_id": dataDocument._id }, 
                    { $addToSet: { "groups.$[group].users": groupUserPayload } }, 
                    { arrayFilters: [{ "group.users.username": { $nin: [username] } }] })
            ]);

            if (roleResult.modifiedCount === 0 && updateExistingResult.modifiedCount === 0 && addNewResult.modifiedCount === 0) {
                return res.status(400).json({ "valid": false, "error": "Could not promote user. They may already be a SuperAdmin in all groups." });
            }

            // Get the fresh data containing all updated groups
            dataDocument = await db.collection('db').findOne({});
            const allUpdatedGroups = dataDocument.groups;

            // Synchronisation of groups
            const syncTasks = allUpdatedGroups.map(groupToSync => {
                return Promise.all([
                    // Sync with 'adminGroups' arrays for the current group
                    db.collection('db').updateMany(
                        { "_id": dataDocument._id, "users.adminGroups.id": groupToSync.id }, 
                        { $set: { "users.$[user].adminGroups.$[group]": groupToSync } }, 
                        { arrayFilters: [{ "user.adminGroups.id": groupToSync.id }, { "group.id": groupToSync.id }] }),
                    // Sync with 'groups' arrays for the current group
                    db.collection('db').updateMany(
                        { "_id": dataDocument._id, "users.groups.id": groupToSync.id }, 
                        { $set: { "users.$[user].groups.$[group]": groupToSync } }, 
                        { arrayFilters: [{ "user.groups.id": groupToSync.id }, { "group.id": groupToSync.id }] })
                ]);
            });

            await Promise.all(syncTasks);

            res.status(200).json({ "valid": true, "error": "" });

        }
        else {
            // Standard Role Promotion
            const [roleResult, groupResult] = await Promise.all([
                db.collection('db').updateOne(
                    { "_id": dataDocument._id, "users.username": username }, 
                    { $addToSet: { "users.$.roles": role } }),
                db.collection('db').updateOne(
                    { "_id": dataDocument._id }, 
                    { $set: { "groups.$[group].users.$[user].role": role } }, 
                    { arrayFilters: [{ "group.id": groupId }, { "user.username": username }] })
            ]);

            if (groupResult.modifiedCount === 0) {
                return res.status(404).json({ "valid": false, "error": "Could not promote user. They may already have that role in the group." });
            }

            dataDocument = await db.collection('db').findOne({});
            const updatedGroup = dataDocument.groups.find(g => g.id === groupId);
            if (!updatedGroup) {
                return res.status(404).json({ "valid": false, "error": `Group with ID ${groupId} not found after update.` });
            }

            await db.collection('db').updateOne(
                { "users.username": username },
                {
                    $pull: {
                        "users.$.groups": { id: groupId },
                        "users.$.adminGroups": { id: groupId } // Also pull from adminGroups
                    }
                }
            );

            const pushOperations = {
                "users.$.groups": updatedGroup // Always add/update in the main 'groups' array
            };

            // Conditionally add the group to 'adminGroups' only if the role is 'GroupAdmin'.
            if (role === 'GroupAdmin') {
                pushOperations["users.$.adminGroups"] = updatedGroup;
            }
            
            // Execute the push operation to add the updated group back
            await db.collection('db').updateOne(
                { "users.username": username },
                { $push: pushOperations }
            );

            res.status(200).json({ "valid": true, "error": "" });
        }
    }
    catch (err) {
        console.error("Error promoting user:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
};