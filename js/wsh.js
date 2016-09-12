#!/usr/bin/env node
var defgs = require("./defaults");
var server = require("./server");
var client = require("./client");
var defs = require("./defaults");
var semit = require("./serialize-socket");
var processSync = require("./process-sync");
var net = require('net');
var io = require("socket.io-client");
	
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
	console.log("wsh server [port DEF "+defs.serverListenPort+"]");
	console.log("wsh client CODE [server DEF "+defs.serverUrl+"]");
	console.log("\nThen : wsh <CODE> [local_port DEF 1234]\nExample : wsh BUS0001 2323)");
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
var url = defs.serverUrl;
console.log("Connect to '"+code+' by '+url+" forward to "+defs.clientConnectHost+":"+defs.clientConnectPort+" listen to "+port);
//------------------------------------------------------------------------------
var socket = io.connect("http://"+url);
var sockets={};
var doneS=false;
socket.on("connect",function() 
{
	if (!doneS) 
	{
		doneS=1;
		net.createServer(function(sock) 
		{
			console.log("Listen to "+port)
			var channel = (new Date()).getTime();
			semit(socket,"wsh-connect",{code:code,channel:channel});
			sockets[channel]=sock;
			sock.on("close",function() {
				processSync(function(onDone) {
					if (!sockets[channel])
						return onDone();
					delete sockets[channel];
					semit(socket,"wsh-disconnect",{channel:channel},onDone);
				},socket);
			});
			sock.on("error",function(err) {
				processSync(function(onDone) {
					var s = sockets[channel];
					if (!s)
						return onDone();
					console.error("Error in wsh socket read : "+err);
					delete sockets[channel];
					s.destroy();
					onDone();
				},socket);
			});
			sock.on("data",function(data) {
				processSync(function(onDone) {
					semit(socket,"wsh-data",{data:data,channel:channel},onDone);
				},socket);
			});
		}).listen(port, "localhost");
	}
});

socket.on("client-disconnect",function(data,fn) {
	try {
		processSync(function(onDone) {
			var s = sockets[data.channel];
			if (!s)
				return onDone();
			delete sockets[data.channel];;
			s.destroy();
			onDone();
		},socket);
	} finally {
		fn();
	}
});

socket.on("client-data",function(data,fn) {
	try {
		processSync(function(onDone) {
			var s = sockets[data.channel];
			if (!s)
				return onDone();
			s.write(data.data);
			onDone();
		},socket);
	} finally {
		fn();
	}
});
