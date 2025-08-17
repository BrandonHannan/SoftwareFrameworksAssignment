const connectDB = require('../../database');
const { ObjectId } = require('mongodb');

module.exports = async function(req, res) {
    if (!req.query){
        return res.status(400).json({"valid": false, "error": "Invalid account"});
    }

    const userGroupToDelete = {
        "user": JSON.parse(req.query.user),
        "groupId": parseInt(req.query.groupId)
    }

    try {
        const user = JSON.parse(req.query.user);
        const groupId = parseInt(req.query.groupId);

        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found." });
        }

        const [userUpdateResult, groupUpdateResult] = await Promise.all([
            // Find the user by username and pull the group from their 'groups' array
            db.collection('db').updateOne(
                { "_id": dataDocument._id, "users.username": user.username },
                { $pull: { "users.$.groups": { id: groupId } } }
            ),
            // Find the group by its ID and pull the user from its 'users' array
            db.collection('db').updateOne(
                { "_id": dataDocument._id, "groups.id": groupId },
                { $pull: { "groups.$.users": { username: user.username } } }
            ),
            // Remove the group from the user's 'adminGroups' array
            db.collection('db').updateOne(
                { "_id": dataDocument._id, "users.username": user.username },
                { $pull: { "users.$.adminGroups": { id: groupId } } }
            ),
            // Remove associated channels from the user's 'allowedChannels' array
            db.collection('db').updateOne(
                { "_id": dataDocument._id, "users.username": user.username },
                { $pull: { "users.$.allowedChannels": { groupId: groupId } } }
            )
        ]);

        // Check if both operations modified the document
        if (userUpdateResult.modifiedCount > 0 && groupUpdateResult.modifiedCount > 0) {
            // Re-fetch the user document to check the state of adminGroups
            const updatedDataDoc = await db.collection('db').findOne({ "users.username": user.username }, { projection: { "users.$": 1 } });
            const updatedUser = updatedDataDoc.users[0];

            // If adminGroups is now empty, remove the "GroupAdmin" role
            if (updatedUser && updatedUser.adminGroups.length === 0) {
                await db.collection('db').updateOne(
                    { "_id": dataDocument._id, "users.username": user.username },
                    { $pull: { "users.$.roles": "GroupAdmin" } }
                );
            }
            
            res.status(200).json({ "valid": true, "error": "" });
        } 
        else {
            res.status(404).json({ "valid": false, "error": "Could not find user in group or group in user's list." });
        }
    }
    catch (err) {
        res.status(500).json({"valid": false, "error": err.message});
    }
};