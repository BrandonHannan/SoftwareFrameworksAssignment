var fs = require('fs');

module.exports = function(req, res) {
    if (!req.body){
        return res.status(400).json({"valid": false, "error": "Invalid registration"});
    }
    loginAttempt = {
        "user": req.body.user,
        "password": req.body.password
    }
    // Will need to change code when connecting to a database
    const usersJsonFile = fs.readFileSync(__dirname + '/../../data/users.json', 'utf-8');
    if (usersJsonFile) {
        const usersJson = JSON.parse(usersJsonFile);
        const users = usersJson.users;
        const foundUser = users.find(user => user.name == loginAttempt.user && user.password == loginAttempt.password);
        if (foundUser) {
            const userToReturn = {
                "id": foundUser.id,
                "username": foundUser.username,
                "email": foundUser.email,
                "roles": foundUser.roles,
                "groups": foundUser.groups,
                "valid": true
            }
            res.status(200).json(userToReturn);
        }
        else{
            res.status(401).json({"valid": false})
        }
    }
    else{
        return res.status(400).json({"valid": false, "error": "Error opening file"});
    }
}