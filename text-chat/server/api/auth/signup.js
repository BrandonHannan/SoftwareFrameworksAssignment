const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.body){
        return res.status(400).json({"user": null, "valid": false, "error": "Invalid registration"});
    }
    registerAttempt = {
        "username": req.body.username,
        "email": req.body.email,
        "password": req.body.password
    }

    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});
        const users = dataDocument ? dataDocument.users : [];
        const foundUser = users.find(user => user.username == registerAttempt.username || user.email == registerAttempt.email);
        if (foundUser) {
            var errorMsg = "Email already exists";
            if (foundUser.email != registerAttempt.email){
                errorMsg = "Username already exists";
            }
            res.status(200).json({"user": null, "valid": false, "error": errorMsg});
        }
        else{
            const newId = users.length > 0 ? Math.max(...users.map(user => user.id)) + 1 : 0;
            const newUser = {
                id: newId,
                username: registerAttempt.username,
                email: registerAttempt.email,
                profilePicture: null,
                roles: ["User"],
                password: registerAttempt.password,
                groups: [],
                adminGroups: [],
                requests: [],
                allowedChannels: [],
                reports: []
            };
            const result = await db.collection('db').updateOne(
                { _id: dataDocument._id },
                { $push: { users: newUser } }
            );
            if (result.modifiedCount === 1){
                const userToReturn = {
                    "id": newUser.id,
                    "username": newUser.username,
                    "email": newUser.email,
                    "profilePicture": newUser.profilePicture,
                    "roles": newUser.roles,
                    "groups": newUser.groups,
                    "adminGroups": newUser.adminGroups,
                    "requests": newUser.requests,
                    "allowedChannels": newUser.allowedChannels,
                    "reports": []
                };
                res.status(200).json({"user": userToReturn, "valid": true, "error": ""});
            }
            else {
                res.status(400).json({"user": null, "valid": false, "error": "Error creating new account"});
            }
        }
    }
    catch (err){
        res.status(500).json({"user": null, "valid": false, "error": "Error connecting to mongo database"});
    }
}