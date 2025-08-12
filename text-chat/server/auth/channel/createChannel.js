const connectDB = require('../../database');

module.exports = async function (req, res) {
    const { channelName, groupId } = req.body;
    if (!req.body || !channelName || typeof groupId !== 'number') {
        return res.status(400).json({ "valid": false, "error": "Invalid request. Channel name and group ID are required." });
    }

    try {
        const db = await connectDB();
        let dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found." });
        }

        // Find the target group and check for duplicate channel names
        const groupIndex = dataDocument.groups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) {
            return res.status(404).json({ "valid": false, "error": "Group not found." });
        }
        
        const targetGroup = dataDocument.groups[groupIndex];
        const channelExists = targetGroup.channels.some(c => c.name === channelName);
        if (channelExists) {
            return res.status(409).json({ "valid": false, "error": `A channel named '${channelName}' already exists in this group.` });
        }

        // Create the new channel
        const newChannelId = targetGroup.channels.length > 0 ? Math.max(...targetGroup.channels.map(c => c.id)) + 1 : 0;
        const newChannel = {
            groupId: groupId,
            id: newChannelId,
            name: channelName,
            messages: [],
            allowedUsers: []
        };

        // Add the new channel to the group in the main groups array
        const mainUpdateResult = await db.collection('db').updateOne(
            { "groups.id": groupId },
            { $push: { "groups.$.channels": newChannel } }
        );

        if (mainUpdateResult.modifiedCount === 0) {
            return res.status(500).json({ "valid": false, "error": "Failed to add channel to the main group list." });
        }

        // Get the fully updated group object
        dataDocument = await db.collection('db').findOne({});
        const updatedGroup = dataDocument.groups.find(g => g.id === groupId);

        // Update the group for all users in their 'groups' and 'adminGroups' arrays
        await Promise.all([
            db.collection('db').updateMany(
                { "users.groups.id": groupId },
                { $set: { "users.$[elem].groups.$[group]": updatedGroup } },
                { arrayFilters: [{ "elem.groups.id": groupId }, { "group.id": groupId }] }
            ),
            db.collection('db').updateMany(
                { "users.adminGroups.id": groupId },
                { $set: { "users.$[elem].adminGroups.$[group]": updatedGroup } },
                { arrayFilters: [{ "elem.adminGroups.id": groupId }, { "group.id": groupId }] }
            )
        ]);

        res.status(200).json({ "valid": true, "error": "" });

    } catch (err) {
        console.error("Error creating channel:", err);
        res.status(500).json({ "valid": false, "error": "A server error occurred." });
    }
};