var net = require('net');

var server = net.createServer(function(socket) {
	socket.write('AJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJDDDDDDDDDDDEEEEEEEEEEEEE!\n');
	socket.on("data",function(data) {
		console.log("TCLIENT SENT "+data);
	});
	socket.pipe(socket);
});

server.listen(1337, '127.0.0.1');

