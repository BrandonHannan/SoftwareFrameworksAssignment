// Holds the state of the video chat rooms
let videoChatRooms = {};

module.exports = {
    connect: function(io, port){
        io.on('connection', (socket) => {
            console.log(`User connected on port ${port} with socket ID: ${socket.id}`);
            // Stores the current message room and the username of the user for each connection
            let currentMessageRoom = null;
            let currentUsername = null;

            socket.on('message', (message) => {
                io.emit('message', message);
            });

            // When a user joins a channel
            socket.on('join-messages', ({ groupId, channelId, username }) => {
                if (groupId !== undefined && groupId !== null &&
                    channelId !== undefined && channelId !== null &&
                    username) {
                    // Establishes a unique name for the channel room
                    const roomName = `group-${groupId}-channel-${channelId}`;
                    currentMessageRoom = roomName;
                    currentUsername = username;
                    
                    // Subscribes the given client socket to the specific channel room
                    socket.join(roomName);

                    // Notify everyone in the given channel that a user has joined
                    socket.to(roomName).emit('user-joined-messages', { username });
                } 
                else {
                    console.error(`Failed join-messages: Received incomplete data`, { groupId, channelId, username });
                }
            });

            socket.on('leave-messages', ({ groupId, channelId, username }) => {
                if (groupId !== undefined && groupId !== null &&
                    channelId !== undefined && channelId !== null &&
                    username){
                    
                    // Establishes a unique name for the channel room
                    const roomName = `group-${groupId}-channel-${channelId}`;
                    // Unsubscribes the given client socket from the specific channel room
                    socket.leave(roomName);

                    // Notify everyone else in the room that a user has left
                    socket.to(roomName).emit('user-left-messages', { username });

                    // Clear the tracked variables
                    currentMessageRoom = null;
                    currentUsername = null;
                }
            });

            socket.on('join-video-chat', ({ channelId, peerId, username }) => {
                const id = Number(channelId);
                if (id == null || peerId == null || !username) {
                    console.error(`Failed join-video-chat: Received incomplete data`, { id, peerId, username });
                    return;
                }
                
                // Subscribes the client socket to the given channel Id video chat room
                socket.join(id);
                
                // Establishes the video chat room if it does not exist
                if (!videoChatRooms[id]) {
                    videoChatRooms[id] = [];
                }

                // Adds the user if they are not already within the video chat room
                if (!videoChatRooms[id].some(user => user.socketId === socket.id)) {
                    videoChatRooms[id].push({ username, peerId, socketId: socket.id });
                }
                
                // Notify everyone of the updated video chat room
                io.to(id).emit('video-chat-users-update', videoChatRooms[id]);
            });

            socket.on('leave-video-chat', ({ channelId }) => {
                const id = Number(channelId);
                if (isNaN(id)) {
                    console.error(`Failed leave-video-chat: Invalid channelId received`, { channelId });
                    return;
                }

                if (!videoChatRooms[id]) {
                    console.log(`leave-video-chat: Room '${id}' does not exist. No action is needed`);
                    return;
                }

                // Unsubscribes the given client socket from the specific video chat room
                socket.leave(id);
                // Removes the user from the stored video chat room state
                videoChatRooms[id] = videoChatRooms[id].filter(user => user.socketId !== socket.id);
                // Notifies everyone of the updated room
                io.to(id).emit('video-chat-users-update', videoChatRooms[id]);
            });

            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`);
                // Used to emit to everyone if a user leaves a given channel
                if (currentMessageRoom && currentUsername) {
                    console.log(`User '${currentUsername}' leaving message room '${currentMessageRoom}'`);
                    // Notify the room that the user has left
                    io.to(currentMessageRoom).emit('user-left-messages', { username: currentUsername });
                }
                // Used to emit to everyone if they are no longer within the video chat room
                for (const channelId in videoChatRooms) {
                    const userWasInRoom = videoChatRooms[channelId].some(user => user.socketId === socket.id);
                    if (userWasInRoom) {
                        // Removes user from the stored video chat room state
                        videoChatRooms[channelId] = videoChatRooms[channelId].filter(user => user.socketId !== socket.id);
                        // Notifies everyone of the new state
                        io.to(channelId).emit('video-chat-users-update', videoChatRooms[channelId]);
                    }
                }
            });
        });
    }
}