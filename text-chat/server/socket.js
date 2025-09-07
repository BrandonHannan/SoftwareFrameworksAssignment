module.exports = {
    connect: function(io, port){
        io.on('connection', (socket) => {
            console.log('User connected on port ' + port + " : " + socket.id);

            socket.on('message', (message) => {
                io.emit('message', message);
            });
        });
    }
}