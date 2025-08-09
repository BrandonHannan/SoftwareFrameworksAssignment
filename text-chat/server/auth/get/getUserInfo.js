const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.query){
        return res.status(400).json({"user": null, "valid": false, "error": "Invalid user request"});
    }
    const usernameToFind = req.query.username;

    try {
        const db = await connectDB();
        const result = await db.collection('db').findOne(
            { "users.username": usernameToFind },
            { projection: { "users.$": 1, _id: 0 } }
        );

        if (result && result.users && result.users.length > 0){
            const foundUser = result.users[0];
            const userToReturn = {
                "id": foundUser.id,
                "username": foundUser.username,
                "email": foundUser.email,
                "profilePicture": foundUser.profilePicture,
                "roles": foundUser.roles,
                "groups": foundUser.groups,
                "adminGroups": foundUser.adminGroups,
                "requests": foundUser.requests,
                "allowedChannels": foundUser.allowedChannels,
                "reports": foundUser.reports
            }
            res.status(200).json({"user": userToReturn, "valid": true, "error": ""});
        }
        else{
            res.status(200).json({"user": null, "valid": false, "error": "Invalid user"})
        }
    }
    catch (err) {
        res.status(500).json({"user": null, "valid": false, "error": "Error connecting to mongo database"});
    }
}