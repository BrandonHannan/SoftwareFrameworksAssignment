const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.body) {
        return res.status(400).json({ "valid": false, "error": "Invalid request" });
    }

    const message = req.body;

    if (message.groupId === undefined || message.channelId === undefined || !message.username) {
        return res.status(400).json({ "valid": false, "error": "Missing required message fields." });
    }

    try {
        const db = await connectDB();
        const dataCollection = db.collection('db');

        // Add the message to the correct channel 
        const updateResult = await dataCollection.updateOne(
            { "groups.id": message.groupId },
            { 
                $push: { "groups.$[group].channels.$[channel].messages": message } 
            },
            {
                arrayFilters: [
                    { "group.id": message.groupId },
                    { "channel.id": message.channelId }
                ]
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(404).json({ "valid": false, "error": "Group or Channel not found to add message." });
        }

        // Find the newly updated group
        const updatedDoc = await dataCollection.findOne(
            { "groups.id": message.groupId },
            { projection: { "groups.$": 1 } }
        );

        if (!updatedDoc || !updatedDoc.groups || updatedDoc.groups.length === 0) {
            return res.status(404).json({ "valid": false, "error": "Failed to retrieve updated group." });
        }
        
        const updatedGroup = updatedDoc.groups[0];

        // Propagate the updated group to all relevant users
        // Update users who have this group in their 'groups' array
        await dataCollection.updateOne(
            { "users.groups.id": message.groupId },
            { $set: { "users.$[userElement].groups.$[groupElement]": updatedGroup } },
            {
                arrayFilters: [
                    { "userElement.groups.id": message.groupId },
                    { "groupElement.id": message.groupId }
                ]
            }
        );

        // Update users who have this group in their 'adminGroups' array
        await dataCollection.updateOne(
            { "users.adminGroups.id": message.groupId },
            { $set: { "users.$[userElement].adminGroups.$[groupElement]": updatedGroup } },
            {
                arrayFilters: [
                    { "userElement.adminGroups.id": message.groupId },
                    { "groupElement.id": message.groupId }
                ]
            }
        );

        res.status(200).json({ "valid": true, "message": "Message sent successfully!" });

    } catch (err) {
        console.error("Error in sendMessage API:", err);
        res.status(500).json({ "valid": false, "error": "An internal server error occurred." });
    }
};