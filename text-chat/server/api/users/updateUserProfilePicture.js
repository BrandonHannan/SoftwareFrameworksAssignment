const connectDB = require('../../database');

module.exports = async function (req, res) {
    if (!req.body || !req.body.currentUsername) {
        return res.status(400).json({ "valid": false, "error": "Invalid update details. Username is required." });
    }

    const userInfo = {
        currentUsername: req.body.currentUsername,
        profilePicture: req.body.profilePicture
    };

    try {
        const db = await connectDB();
        
        const operations = [
            // Update the main user object's profilePicture
            {
                updateOne: {
                    filter: { "users.username": userInfo.currentUsername },
                    update: { $set: { "users.$.profilePicture": userInfo.profilePicture } }
                }
            },
            // Update the profilePicture in the main 'groups' array's user list
            {
                updateMany: {
                    filter: { "groups.users.username": userInfo.currentUsername },
                    update: { $set: { "groups.$[].users.$[user].profilePicture": userInfo.profilePicture } },
                    arrayFilters: [{ "user.username": userInfo.currentUsername }]
                }
            },
            // Update the profilePicture for messages in the main 'groups' array
            {
                updateMany: {
                    filter: { "groups.channels.messages.username": userInfo.currentUsername },
                    update: { $set: { "groups.$[].channels.$[].messages.$[message].profilePicture": userInfo.profilePicture } },
                    arrayFilters: [{ "message.username": userInfo.currentUsername }]
                }
            },
            // Update the profilePicture in every user's 'requests' array
            {
                updateMany: {
                    filter: { "users.requests.username": userInfo.currentUsername },
                    update: { $set: { "users.$[].requests.$[request].profilePicture": userInfo.profilePicture } },
                    arrayFilters: [{ "request.username": userInfo.currentUsername }]
                }
            },
            // Update the profilePicture for reports where the user was reported
            {
                updateMany: {
                    filter: { "users.reports.usernameReported": userInfo.currentUsername },
                    update: { $set: { "users.$[].reports.$[report].userProfilePicture": userInfo.profilePicture } },
                    arrayFilters: [{ "report.usernameReported": userInfo.currentUsername }]
                }
            },
            // Update the profilePicture for reports where the user was the admin
            {
                updateMany: {
                    filter: { "users.reports.adminReport": userInfo.currentUsername },
                    update: { $set: { "users.$[].reports.$[report].adminProfilePicture": userInfo.profilePicture } },
                    arrayFilters: [{ "report.adminReport": userInfo.currentUsername }]
                }
            },
            // Update messages within each user's 'groups' array copy
            {
                updateMany: {
                    filter: { "users.groups.channels.messages.username": userInfo.currentUsername },
                    update: { $set: { "users.$[user].groups.$[].channels.$[].messages.$[message].profilePicture": userInfo.profilePicture } },
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
                    update: { $set: { "users.$[user].adminGroups.$[].channels.$[].messages.$[message].profilePicture": userInfo.profilePicture } },
                    arrayFilters: [
                        { "user.username": userInfo.currentUsername },
                        { "message.username": userInfo.currentUsername }
                    ]
                }
            }
        ];

        const result = await db.collection('db').bulkWrite(operations);

        if (result.modifiedCount > 0) {
            res.status(200).json({ "valid": true, "error": "" });
        } 
        else {
            res.status(404).json({ "valid": false, "error": "User not found or profile picture is already up to date." });
        }
    }
    catch (err){
        console.error("Error updating profile picture:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
};