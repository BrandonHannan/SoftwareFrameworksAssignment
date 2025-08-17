const connectDB = require('../../database');

module.exports = async function (req, res) {
    if (!req.query.request) {
        return res.status(400).json({ "valid": false, "error": "Invalid request. Request object is required." });
    }

    try {
        const { groupId, channelId } = JSON.parse(req.query.request);

        const db = await connectDB();
        let dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found." });
        }

        const [groupUpdateResult, userChannelUpdateResult] = await Promise.all([
            // Remove the channel from the main group's 'channels' array
            db.collection('db').updateOne(
                { "groups.id": groupId },
                { $pull: { "groups.$.channels": { id: channelId } } }
            ),
            // Remove the channel from all users' 'allowedChannels' arrays
            db.collection('db').updateMany(
                {},
                { $pull: { "users.$[].allowedChannels": { id: channelId } } }
            )
        ]);

        // Check if the channel was successfully removed from the main group
        if (groupUpdateResult.modifiedCount === 0) {
            return res.status(404).json({ "valid": false, "error": "Group or channel not found." });
        }

        // Get the newly updated group object to propagate the changes
        dataDocument = await db.collection('db').findOne({});
        const updatedGroup = dataDocument.groups.find(g => g.id === groupId);

        // Propagate the updated group to all users who have it in their lists
        await Promise.all([
            // Update the group in every user's 'groups' array
            db.collection('db').updateMany(
                { "users.groups.id": groupId },
                { $set: { "users.$[elem].groups.$[group]": updatedGroup } },
                { arrayFilters: [{ "elem.groups.id": groupId }, { "group.id": groupId }] }
            ),
            // Update the group in every user's 'adminGroups' array
            db.collection('db').updateMany(
                { "users.adminGroups.id": groupId },
                { $set: { "users.$[elem].adminGroups.$[group]": updatedGroup } },
                { arrayFilters: [{ "elem.adminGroups.id": groupId }, { "group.id": groupId }] }
            )
        ]);

        res.status(200).json({ "valid": true, "error": "" });

    } catch (err) {
        console.error("Error removing channel:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
};