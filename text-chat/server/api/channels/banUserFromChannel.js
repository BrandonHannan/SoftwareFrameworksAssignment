const connectDB = require('../../database');

module.exports = async function (req, res) {
    const { groupId, id: channelId, username } = req.body;
    if (!req.body || typeof groupId !== 'number' || typeof channelId !== 'number' || !username) {
        return res.status(400).json({ "valid": false, "error": "Invalid request. groupId, channel id, and username are required." });
    }

    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found" });
        }

        const [userUpdateResult, groupUpdateResult] = await Promise.all([
            // Find the user and pull the channel from their 'allowedChannels'
            db.collection('db').updateOne(
                { "_id": dataDocument._id, "users.username": username },
                { $pull: { "users.$.allowedChannels": { "id": channelId } } }
            ),
            // Find the channel and pull the username from its 'allowedUsers'
            db.collection('db').updateOne(
                { "_id": dataDocument._id },
                { $pull: { "groups.$[group].channels.$[channel].allowedUsers": username } },
                {
                    arrayFilters: [
                        { "group.id": groupId },
                        { "channel.id": channelId }
                    ]
                }
            )
        ]);

        if (userUpdateResult.modifiedCount > 0 && groupUpdateResult.modifiedCount > 0) {
            res.status(200).json({ "valid": true, "error": "" });
        } else {
            res.status(404).json({ "valid": false, "error": "Could not find user or channel to update." });
        }
    }
    catch (err) {
        console.error("Error banning user from channel:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
}