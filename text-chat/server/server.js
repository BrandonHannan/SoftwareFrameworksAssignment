var express = require('express');
const cors = require('cors');
var app = express();

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

module.exports = app;

if (require.main === module) {
    const https = require('https');
    const fs = require('fs');
    const { ExpressPeerServer } = require('peer');
    const port = 3000;

    const sockets = require('./socket.js');
    const connectDB = require('./database'); // Import the connectDB function

    const httpsServer = https.createServer({
        key: fs.readFileSync('./key.pem'),
        cert: fs.readFileSync('./cert.pem'),
    }, app);

    const io = require('socket.io')(httpsServer,{
        path: "/socket.io/", 
        cors: {
            origin: "http://localhost:4200",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    const peerServer = ExpressPeerServer(httpsServer, {
        debug: true,
        path: '/video-chat'
    });

    app.use('/peerjs', peerServer);
    async function startServer() {
        try {
            await connectDB();
            sockets.connect(io, port);
            httpsServer.listen(port, () => {
                console.log(`Server listening on port ${port}`);
            });
        }
        catch (e) {
            console.error("Failed to start server:", e);
            process.exit(1);
        }
    }

    startServer();
}