const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.body){
        return res.status(400).json({"group": null, "valid": false, "error": "Invalid new group"});
    }
    const { username, name } = req.body;

    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "group": null, "valid": false, "error": "Database document not found." });
        }

        // Find the creator and all SuperAdmins
        const creator = dataDocument.users.find(u => u.username === username);
        if (!creator) {
            return res.status(404).json({ "group": null, "valid": false, "error": "Creator user not found." });
        }
        
        const superAdmins = dataDocument.users.filter(u => u.roles.includes('SuperAdmin'));

        // Prepare the list of users for the new group
        const groupUsers = [];
        // Add the creator as GroupAdmin
        groupUsers.push({
            username: creator.username,
            profilePicture: creator.profilePicture,
            role: req.body.role
        });

        // Add all SuperAdmins (avoiding duplicates if the creator is one)
        superAdmins.forEach(admin => {
            if (admin.username !== creator.username) {
                groupUsers.push({
                    username: admin.username,
                    profilePicture: admin.profilePicture,
                    role: 'SuperAdmin'
                });
            }
        });

        // Determine the new group's ID and create the group object
        const newId = dataDocument.groups.length > 0 ? Math.max(...dataDocument.groups.map(group => group.id)) + 1 : 0;
        
        const newGroup = {
            id: newId,
            name: name,
            users: groupUsers,
            channels: []
        };

        const [addGroupResult, updateUserResult] = await Promise.all([
            // Add the new group to the top-level 'groups' array
            db.collection('db').updateOne(
                { _id: dataDocument._id },
                { $push: { groups: newGroup } }
            ),
            // Add the new group to the creator's 'groups' and 'adminGroups' arrays
            db.collection('db').updateOne(
                { "_id": dataDocument._id, "users.username": username },
                {
                    $push: {
                        "users.$.groups": newGroup,
                        "users.$.adminGroups": newGroup
                    }
                }
            )
        ]);

        if (addGroupResult.modifiedCount > 0 && updateUserResult.modifiedCount > 0) {
            res.status(200).json({ "group": newGroup, "valid": true, "error": "" });
        } else {
            res.status(400).json({ "group": null, "valid": false, "error": "Error creating new group." });
        }
    }
    catch (err) {
        console.error("Error creating group:", err);
        res.status(500).json({ "group": null, "valid": false, "error": "A server error occurred." });
    }
}