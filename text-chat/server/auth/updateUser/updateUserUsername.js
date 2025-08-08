const connectDB = require('../../database');

module.exports = async function (req, res) {
    if (!req.body || !req.body.currentUsername || !req.body.username) {
        return res.status(400).json({ "valid": false, "error": "Invalid update details. Both current and new usernames are required." });
    }

    const userInfo = {
        currentUsername: req.body.currentUsername,
        username: req.body.username
    };

    try {
        const db = await connectDB();
        
        // First, check if the new username is already taken
        const existingUser = await db.collection('db').findOne({ "users.username": userInfo.username });
        if (existingUser) {
            return res.status(409).json({ "valid": false, "error": "Username is already taken." });
        }

        const operations = [
            // Update the main user object's username
            {
                updateOne: {
                    filter: { "users.username": userInfo.currentUsername },
                    update: { $set: { "users.$.username": userInfo.username } }
                }
            },
            // Update the username in the main 'groups' array's user list
            {
                updateMany: {
                    filter: { "groups.users.username": userInfo.currentUsername },
                    update: { $set: { "groups.$[].users.$[user].username": userInfo.username } },
                    arrayFilters: [{ "user.username": userInfo.currentUsername }]
                }
            },
            // Update the username for messages in the main 'groups' array
            {
                updateMany: {
                    filter: { "groups.channels.messages.username": userInfo.currentUsername },
                    update: { $set: { "groups.$[].channels.$[].messages.$[message].username": userInfo.username } },
                    arrayFilters: [{ "message.username": userInfo.currentUsername }]
                }
            },
            // Update the username in the main 'groups' channels' allowedUsers array
            {
                updateMany: {
                    filter: { "groups.channels.allowedUsers": userInfo.currentUsername },
                    update: { $set: { "groups.$[].channels.$[].allowedUsers.$[user]": userInfo.username } },
                    arrayFilters: [{ "user": userInfo.currentUsername }]
                }
            },
            // Update the username in every user's 'requests' array
            {
                updateMany: {
                    filter: { "users.requests.username": userInfo.currentUsername },
                    update: { $set: { "users.$[].requests.$[request].username": userInfo.username } },
                    arrayFilters: [{ "request.username": userInfo.currentUsername }]
                }
            },
            // Update the username for reports where the user was reported
            {
                updateMany: {
                    filter: { "users.reports.usernameReported": userInfo.currentUsername },
                    update: { $set: { "users.$[].reports.$[report].usernameReported": userInfo.username } },
                    arrayFilters: [{ "report.usernameReported": userInfo.currentUsername }]
                }
            },
            // Update the username for reports where the user was the admin
            {
                updateMany: {
                    filter: { "users.reports.adminReport": userInfo.currentUsername },
                    update: { $set: { "users.$[].reports.$[report].adminReport": userInfo.username } },
                    arrayFilters: [{ "report.adminReport": userInfo.currentUsername }]
                }
            },
            // Update messages within each user's 'groups' array copy
            {
                updateMany: {
                    filter: { "users.groups.channels.messages.username": userInfo.currentUsername },
                    update: { $set: { "users.$[user].groups.$[].channels.$[].messages.$[message].username": userInfo.username } },
                    arrayFilters: [
                        { "user.username": userInfo.currentUsername },
                        { "message.username": userInfo.currentUsername }
                    ]
                }
            },
            // Update messages within each user's 'adminGroups' array copy
            {
                updateMany: {
                    filter: { "users.adminGroups.channels.messages.username": userInfo.currentUsername },
                    update: { $set: { "users.$[user].adminGroups.$[].channels.$[].messages.$[message].username": userInfo.username } },
                    arrayFilters: [
                        { "user.username": userInfo.currentUsername },
                        { "message.username": userInfo.currentUsername }
                    ]
                }
            },
            // Update allowedUsers within each user's 'groups' array copy
            {
                updateMany: {
                    filter: { "users.groups.channels.allowedUsers": userInfo.currentUsername },
                    update: { $set: { "users.$[user].groups.$[].channels.$[].allowedUsers.$[allowed]": userInfo.username } },
                    arrayFilters: [
                        { "user.username": userInfo.currentUsername },
                        { "allowed": userInfo.currentUsername }
                    ]
                }
            },
            // Update allowedUsers within each user's 'adminGroups' array copy
            {
                updateMany: {
                    filter: { "users.adminGroups.channels.allowedUsers": userInfo.currentUsername },
                    update: { $set: { "users.$[user].adminGroups.$[].channels.$[].allowedUsers.$[allowed]": userInfo.username } },
                    arrayFilters: [
                        { "user.username": userInfo.currentUsername },
                        { "allowed": userInfo.currentUsername }
                    ]
                }
            }
        ];

        const result = await db.collection('db').bulkWrite(operations);
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({ "valid": false, "error": "Current user not found or no updates were needed." });
        }

        res.status(200).json({ "valid": true, "error": "" });
    }
    catch (err){
        console.error("Error updating username:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
};