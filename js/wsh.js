#!/usr/bin/env node
var server = require("./server");
var client = require("./client");
var net = require('net');

var args = [];
var options = {};
var t = process.argv.slice(2);
exports.originalArgv = process.argv.slice(); 
while (t.length) 
{
	var e = t.shift();
	if (e.startsWith("-")) 
	{
		switch (e.substring(1)) 
		{

		}
	} else {
		args.push(e);
	}
}
exports.options=options;
exports.args=args;
//----------------------------
function usage() {
	console.log("USAGE : ");
	console.log("wsh server [port DEF 4000]");
	console.log("wsh client CODE [server DEF dev2-bg.plan-vision.com:4000]");
	coneole.log("\nThen : wsh <CODE> [local_port DEF 1234]\nExample : wsh BUS0001 2323)");
}
if (!args.length)  {
	usage();
}
var code=args.shift();
switch (code) {
	case "server":
	case "s":
	case "srv":
		return server.exec(args);
	case "client":
	case "c":
	case "cli":
		return client.exec(args);
}
if (!code) {
	return usage;
}
var port = parseInt(args.shift());
if (!port || isNaN(port))
	port=1234;
var url = "dev2-bg.plan-vision.com:4000";
console.log("Connect to '"+code+' by '+url+" forward to localhost:"+port);
//------------------------------------------------------------------------------
var socket = io.connect(url);
var sockets={};
socket.on("connection",function() 
{
	console.log("CONNECTED 1!")
	net.createServer(function(sock) 
	{
		console.log("Listen to "+port)
		var channel = (new Date()).getTime();
		socket.emit("wsh-connect",{code:code,channel:channel});
		sockets[channel]=sock;
		sock.on("close",function() {
			delete sockets[channel];
			socket.emit("wsh-disconnect",{channel:channel});
		})
	}).listen(port, "localhost");
});

socket.on("client-disconnect",function(data) {
	var s = sockets[data.channel];
	if (!s)
		return;
	s.destroy();
	delete sockets[data.channel];;
});

socket.on("client-data",function(data) {
	var s = sockets[data.channel];
	if (!s)
		return;
	s.send(data.data);
});
