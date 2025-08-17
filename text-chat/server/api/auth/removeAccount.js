const connectDB = require('../../database');
const { ObjectId } = require('mongodb');

module.exports = async function(req, res) {
    if (!req.query){
        return res.status(400).json({"valid": false, "error": "Invalid account"});
    }

    const userIdToDelete = parseInt(req.query.id, 10);

    try {
        const db = await connectDB();

        const dataDoc = await db.collection('db').findOne(
            { "users.id": userIdToDelete },
            { projection: { "users.$": 1 } }
        );

        if (!dataDoc || !dataDoc.users || dataDoc.users.length === 0) {
            return res.status(404).json({ "valid": false, "error": "User not found." });
        }

        const usernameToDelete = dataDoc.users[0].username;

        const operations = [
            // Remove the main user object from the top-level 'users' array
            {
                updateOne: {
                    filter: {},
                    update: { $pull: { users: { id: userIdToDelete } } }
                }
            },
            // Remove the user from every group's internal 'users' list
            {
                updateOne: {
                    filter: {},
                    update: { $pull: { "groups.$[].users": { username: usernameToDelete } } }
                }
            },
            // Remove any pending requests made by this user from other users' lists
            {
                updateOne: {
                    filter: {},
                    update: { $pull: { "users.$[].requests": { username: usernameToDelete } } }
                }
            },
            // Remove the user from every channel's 'allowedUsers' list
            {
                updateOne: {
                    filter: {},
                    update: { $pull: { "groups.$[].channels.$[].allowedUsers": usernameToDelete } }
                }
            }
        ];

        const result = await db.collection('db').bulkWrite(operations);

        if (result.modifiedCount > 0) {
            res.status(200).json({"valid": true, "error": "User deleted successfully"});
        } else {
            res.status(404).json({"valid": false, "error": "User not found"});
        }
    }
    catch (err) {
        res.status(500).json({"valid": false, "error": err.message});
    }
};