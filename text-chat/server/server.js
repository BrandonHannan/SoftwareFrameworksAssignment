var express = require('express');
const cors = require('cors');
var app = express();
const port = 3000;
var http = require('http').Server(app);
const connectDB = require('./database'); // Import the connectDB function

const io = require('socket.io')(http,{
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"],
    }
});
const sockets = require('./socket.js');

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(__dirname + '/'));

app.post('/api/login', require('./api/auth/login'));
app.post('/api/register', require('./api/auth/signup'));
app.post('/api/createGroup', require('./api/groups/createGroup'));
app.post('/api/acceptRequest', require('./api/groups/acceptRequest'));
app.post('/api/requestGroup', require('./api/groups/requestGroup'));
app.post('/api/reportUser', require('./api/reports/reportUser'));
app.post('/api/banUserFromChannel', require('./api/channels/banUserFromChannel'));
app.post('/api/addUserToChannel', require('./api/channels/addUsertoChannel'));
app.post('/api/createChannel', require('./api/channels/createChannel'));
app.post('/api/addNewUser', require('./api/groups/addNewUserToGroup'));
app.post('/api/acceptReport', require('./api/reports/acceptReport'));
app.post('/api/sendMessage', require('./api/messages/sendMessage'));
app.delete('/api/removeChannel', require('./api/channels/removeChannel'));
app.delete('/api/deleteAccount', require('./api/auth/removeAccount'));
app.delete('/api/removeGroup', require('./api/groups/removeGroup'));
app.delete('/api/rejectRequest', require('./api/groups/rejectRequest'));
app.delete('/api/removeUserFromGroup', require('./api/groups/removeUserFromGroup'));
app.patch('/api/updateUser/username', require('./api/users/updateUserUsername'));
app.patch('/api/updateUser/email', require('./api/users/updateUserEmail'));
app.patch('/api/updateUser/groups', require('./api/users/updateUserGroups'));
app.post('/api/promoteUser', require('./api/users/updateUserRole'));
app.patch('/api/updateUser/password', require('./api/users/updateUserPassword'));
app.patch('/api/updateUser/profilePicture', require('./api/users/updateUserProfilePicture'));
app.patch('/api/updateUser/adminGroups', require('./api/users/updateUserAdminGroups'));
app.get('/api/get/group', require('./api/groups/getGroup'));
app.get('/api/get/allGroups', require('./api/groups/getAllGroups'));
app.get('/api/get/userInfo', require('./api/users/getUserInfo'));
app.get('/api/getAllUsers', require('./api/users/getAllUsers'));

async function startServer() {
    try {
        await connectDB();
        sockets.connect(io, port);
        http.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    } catch (e) {
        console.error("Failed to start server:", e);
        process.exit(1);
    }
}

startServer();