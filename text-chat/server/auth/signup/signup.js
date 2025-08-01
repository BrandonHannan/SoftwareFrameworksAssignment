const fs = require('fs');
const path = require('path');

module.exports = function(req, res) {
    if (!req.body){
        return res.status(400).json({"valid": false, "error": "Invalid registration"});
    }
    registerAttempt = {
        "username": req.body.username,
        "email": req.body.email,
        "password": req.body.password
    }
    const filePath = path.join(__dirname, '../../data/users.json');
    const usersJsonFile = fs.readFileSync(filePath, 'utf-8');
    if (usersJsonFile) {
        const usersData = JSON.parse(usersJsonFile);
        const users = usersData.users;
        const foundUser = users.find(user => user.name == registerAttempt.username);
        if (foundUser) {
            res.status(401).json({"valid": false, "error": "Username already exists"});
        }
        else{
            const newUser = {
                id: users[users.length - 1],
                username: registerAttempt.username,
                email: registerAttempt.email,
                roles: ["User"],
                password: registerAttempt.password,
                groups: []
            };
            usersData.users.push(newUser);
            fs.writeFileSync(filePath, JSON.stringify(usersData, null, 4), 'utf-8');
            const userToReturn = {
                "id": newUser.id,
                "username": newUser.username,
                "email": newUser.email,
                "roles": newUser.roles,
                "groups": newUser.groups,
                "valid": true
            }
            res.status(200).json(userToReturn);
        }
    }
    else{
        res.status(400).json({"valid": false, "error": "Error opening file"});
    }
}