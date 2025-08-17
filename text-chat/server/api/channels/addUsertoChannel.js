const connectDB = require('../../database');

module.exports = async function (req, res) {
    const { groupId, channelId, username, channelObject } = req.body;
    if (!req.body || typeof groupId !== 'number' || typeof channelId !== 'number' || !username || !channelObject) {
        return res.status(400).json({ "valid": false, "error": "Invalid request. All fields are required." });
    }

    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found" });
        }

        const [userUpdateResult, groupUpdateResult] = await Promise.all([
            // Find user, add channel to 'allowedChannels' if it doesn't exist
            db.collection('db').updateOne(
                { "_id": dataDocument._id, "users.username": username },
                { $addToSet: { "users.$.allowedChannels": channelObject } }
            ),
            // Find channel, add username to 'allowedUsers' if it doesn't exist
            db.collection('db').updateOne(
                { "_id": dataDocument._id },
                { $addToSet: { "groups.$[group].channels.$[channel].allowedUsers": username } },
                {
                    arrayFilters: [
                        { "group.id": groupId },
                        { "channel.id": channelId }
                    ]
                }
            )
        ]);

        if (userUpdateResult.matchedCount === 0) {
            return res.status(404).json({ "valid": false, "error": `User '${username}' not found.` });
        }
        if (groupUpdateResult.matchedCount === 0) {
            return res.status(404).json({ "valid": false, "error": `Group with ID ${groupId} or Channel with ID ${channelId} not found.` });
        }

        res.status(200).json({ "valid": true, "error": "" });

    }
    catch (err) {
        console.error("Error adding user to channel:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
};