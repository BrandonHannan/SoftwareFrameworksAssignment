var express = require('express');
const cors = require('cors');
var app = express();
const port = 3000;
var http = require('http').Server(app);
const connectDB = require('./database'); // Import the connectDB function

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/'));

app.post('/api/login', require('./auth/login/login'));
app.post('/api/register', require('./auth/signup/signup'));
app.post('/api/createGroup', require('./auth/post/createGroup'));
app.post('/api/acceptRequest', require('./auth/requests/acceptRequest'));
app.post('/api/requestGroup', require('./auth/requests/requestGroup'));
app.post('/api/reportUser', require('./auth/report/reportUser'));
app.post('/api/banUserFromChannel', require('./auth/channel/banUserFromChannel'));
app.post('/api/addUserToChannel', require('./auth/channel/addUsertoChannel'));
app.post('/api/createChannel', require('./auth/channel/createChannel'));
app.post('/api/addNewUser', require('./auth/post/addNewUserToGroup'));
app.post('/api/acceptReport', require('./auth/post/acceptReport'));
app.delete('/api/removeChannel', require('./auth/channel/removeChannel'));
app.delete('/api/deleteAccount', require('./auth/removeAccount/removeAccount'));
app.delete('/api/removeGroup', require('./auth/removeGroup/removeGroup'));
app.delete('/api/rejectRequest', require('./auth/requests/rejectRequest'));
app.delete('/api/removeUserFromGroup', require('./auth/removeAccount/removeUserFromGroup'));
app.patch('/api/updateUser/username', require('./auth/updateUser/updateUserUsername'));
app.patch('/api/updateUser/email', require('./auth/updateUser/updateUserEmail'));
app.patch('/api/updateUser/groups', require('./auth/updateUser/updateUserGroups'));
app.post('/api/promoteUser', require('./auth/updateUser/updateUserRole'));
app.patch('/api/updateUser/password', require('./auth/updateUser/updateUserPassword'));
app.patch('/api/updateUser/profilePicture', require('./auth/updateUser/updateUserProfilePicture'));
app.patch('/api/updateUser/adminGroups', require('./auth/updateUser/updateUserAdminGroups'));
app.get('/api/get/group', require('./auth/get/getGroup'));
app.get('/api/get/allGroups', require('./auth/get/getAllGroups'));
app.get('/api/get/userInfo', require('./auth/get/getUserInfo'));
app.get('/api/getAllUsers', require('./auth/get/getAllUsers'));

async function startServer() {
    try {
        await connectDB();
        http.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    } catch (e) {
        console.error("Failed to start server:", e);
        process.exit(1);
    }
}

startServer();