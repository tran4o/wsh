var net = require("net");
var client = new net.Socket();
client.connect(1234, '127.0.0.1', function() {
	console.log('Connected');
	client.write('Hello, server! Love, Client.');
});

var t=0;
client.on('data', function(data) {
	console.log('Received: ' + data);
	if (t++ < 5) {
		client.write("Respond "+t+"\n");
	} else {
		setTimeout(function() {
			client.destroy();
		},1000);
	}
});

client.on('close', function() {
	console.log('Connection closed');
});