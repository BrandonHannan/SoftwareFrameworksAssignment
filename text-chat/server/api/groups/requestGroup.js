const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.body){
        return res.status(400).json({"valid": false, "error": "Invalid request"});
    }

    const request = req.body;

    try {
        const db = await connectDB();
        const dataDoc = await db.collection('db').findOne({});
        if (!dataDoc) {
            return res.status(404).json({ "valid": false, "error": "Database document not found." });
        }

        // Find the usernames of admins within the specified group
        const targetGroup = dataDoc.groups.find(g => g.id === request.groupId);
        if (!targetGroup) {
            return res.status(404).json({ "valid": false, "error": "Specified group not found." });
        }
        const groupAdminUsernames = targetGroup.users
            .filter(user => user.role === 'SuperAdmin' || user.role === 'GroupAdmin')
            .map(user => user.username);

        // Find the usernames of all global SuperAdmins
        const globalSuperAdminUsernames = dataDoc.users
            .filter(user => user.roles.includes('SuperAdmin'))
            .map(user => user.username);

        // Combine and deduplicate the lists of admin usernames
        const uniqueAdminUsernames = [...new Set([...groupAdminUsernames, ...globalSuperAdminUsernames])];

        if (uniqueAdminUsernames.length === 0) {
            return res.status(200).json({"valid": true, "message": "Request processed, but no admins found to notify."});
        }

        // Check if a duplicate request already exists for any target admin
        const existingRequest = await db.collection('db').findOne({
            "users": {
                $elemMatch: {
                    "username": { $in: uniqueAdminUsernames },
                    "requests": {
                        $elemMatch: {
                            "username": request.username,
                            "groupId": request.groupId
                        }
                    }
                }
            }
        });

        // If a duplicate is found, stop and return a conflict error
        if (existingRequest) {
            return res.status(409).json({ "valid": false, "error": "This request has already been sent and is pending." });
        }

        const result = await db.collection('db').updateOne(
            { },
            { 
                $push: { "users.$[admin].requests": request } 
            },
            {
                arrayFilters: [
                    { "admin.username": { $in: uniqueAdminUsernames } }
                ]
            }
        );

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