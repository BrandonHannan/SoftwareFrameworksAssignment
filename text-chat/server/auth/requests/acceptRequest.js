const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.body){
        return res.status(400).json({"valid": false, "error": "Invalid request"});
    }

    const request = req.body;

    try {
        const db = await connectDB();
        const dataDoc = await db.collection('db').findOne(
            { "groups.id": request.groupId },
            { projection: { "groups.$": 1 } }
        );

        if (!dataDoc || !dataDoc.groups || dataDoc.groups.length === 0) {
            return res.status(404).json({ "valid": false, "error": "Group to join not found." });
        }
        const groupToAdd = dataDoc.groups[0];

        const operations = [
            // Add the group to the user's 'groups' array
            {
                updateOne: {
                    filter: {},
                    update: { $push: { "users.$[user].groups": groupToAdd } },
                    arrayFilters: [ { "user.username": request.username } ]
                }
            },
            // Add the user to the group's 'users' array
            {
                updateOne: {
                    filter: {},
                    update: { $push: { "groups.$[group].users": { username: request.username, 
                        profilePicture: request.profilePicture,role: "User" } } },
                    arrayFilters: [ { "group.id": request.groupId } ]
                }
            },
            // Remove the request from all users' 'requests' arrays
            {
                updateOne: {
                    filter: {},
                    update: { 
                        $pull: { "users.$[].requests": { username: request.username, groupId: request.groupId } } 
                    }
                }
            }
        ];

        const result = await db.collection('db').bulkWrite(operations);

        if (result.modifiedCount > 0) {
            res.status(200).json({"valid": true, "error": "Request accepted successfully!"});
        } else {
            res.status(404).json({"valid": false, "error": "Group not found"});
        }
    }
    catch (err) {
        res.status(500).json({"valid": false, "error": err.message});
    }
};