const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.query){
        return res.status(400).json({"valid": false, "error": "Invalid account"});
    }

    const groupRequest = {
        "id": parseInt(req.query.id, 10)
    }

    try {
        const db = await connectDB();
        const dataDoc = await db.collection('db').findOne(
            { "groups.id": groupRequest.id },
            { projection: { "groups.$": 1 } }
        );

        if (!dataDoc || !dataDoc.groups || dataDoc.groups.length === 0) {
            return res.status(404).json({ "valid": false, "error": "Group not found." });
        }

        const groupToDelete = dataDoc.groups[0];
        const memberUsernames = groupToDelete.users.map(user => user.username);

        const operations = [
            // Remove the group from the main 'groups' array
            {
                updateOne: {
                    filter: {},
                    update: { $pull: { groups: { id: groupRequest.id } } }
                }
            },
            // Remove the group from each member's personal 'groups' array
            {
                updateOne: {
                    filter: {}, // Target the single document
                    update: { 
                        $pull: { "users.$[elem].groups": { id: groupRequest.id } } 
                    },
                    arrayFilters: [
                        { "elem.username": { $in: memberUsernames } }
                    ]
                }
            },
            // Remove the group from every user's 'adminGroups' array
            {
                updateOne: {
                    filter: {},
                    update: { $pull: { "users.$[].adminGroups": { id: groupRequest.id } } }
                }
            },
            // Remove all requests associated with this group
            {
                updateOne: {
                    filter: {},
                    update: { $pull: { "users.$[].requests": { groupId: groupRequest.id } } }
                }
            },
            // Remove all reports associated with this group
            {
                updateOne: {
                    filter: {},
                    update: { $pull: { "users.$[].reports": { groupId: groupRequest.id } } }
                }
            }
        ];

        const result = await db.collection('db').bulkWrite(operations);

        if (result.modifiedCount > 0) {
            res.status(200).json({"valid": true, "error": "Group deleted successfully"});
        } else {
            res.status(404).json({"valid": false, "error": "Group not found"});
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({"valid": false, "error": err.message});
    }
};