var net = require("net");
var client = new net.Socket();

var args = process.argv.slice(2);
var port = parseInt(args[0]);
client.connect(port, '127.0.0.1', function() {
	console.log('Connected to '+port);
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