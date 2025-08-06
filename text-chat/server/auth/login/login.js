const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.body){
        return res.status(400).json({"user": null, "valid": false, "error": "Invalid registration"});
    }
    loginAttempt = {
        "username": req.body.username,
        "password": req.body.password
    }

    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});
        const users = dataDocument ? dataDocument.users : [];
        const foundUser = users.find(user => 
            (user.username === loginAttempt.username || user.email === loginAttempt.username) && 
            user.password === loginAttempt.password);
        if (foundUser) {
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
            res.status(200).json({"user": null, "valid": false, "error": "Invalid login credentials"})
        }
    }
    catch (err) {
        res.status(500).json({"user": null, "valid": false, "error": "Error connecting to mongo database"});
    }
}