#!/usr/bin/env node

var BUFFER_SIZE = 1024*1024*20; // 20 MB
var defgs = require("./defaults");
var server = require("./server");
var client = require("./client");
var defs = require("./defaults");
var semit = require("./serialize-socket");
var processSync = require("./process-sync");
var net = require('net');
var io = require("socket.io-client");
var freeport = require("freeport");	
var args = [];
var options = {};
var t = process.argv.slice(2);
exports.originalArgv = process.argv.slice(); 
while (t.length) 
{
	var e = t.shift();
	args.push(e);
}
exports.options=options;
exports.args=args;
//----------------------------
function usage() {
	console.log("USAGE : ");
	console.log("wsh server [port DEF "+defs.serverListenPort+"]");
	console.log("wsh client CODE [server DEF "+defs.serverUrl+"]");
	console.log("\nThen : wsh <CODE> [standard ssh options, Host must be localhost!]\nExample : wsh BUS1 -L1111:localhost:5432 user@localhost");
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
//------------------------------
freeport(function(err, port) {
	if (err) throw err;
	var url = defs.serverUrl;
	console.log("Connect to '"+code+"' by "+url+" forward to "+defs.clientConnectHost+":"+defs.clientConnectPort+". SSH local port "+port+")");
	//------------------------------------------------------------------------------------------------------------------------------
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
				var channel = (new Date()).getTime();
				semit(socket,"wsh-connect",{code:code,channel:channel});
				sockets[channel]=sock;
				sock.on("close",function() {
					processSync(function(onDone) {
						if (!sockets[channel])
							return onDone();
						delete sockets[channel];
						semit(socket,"wsh-disconnect",{channel:channel},onDone);
					},sock);
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
					},sock);
				});
				sock.on("data",function(data) {
					if (!sock.__data) {
						sock.__data=data;
					} else {
						sock.__data=Buffer.concat([sock.__data, data]);
					}
					if (sock.__data.length > BUFFER_SIZE)
						sock.pause();
					if (!sock.__working) {
						sock.__working=true;
						oneData();
					}
					function oneData() {
						var d = sock.__data;
						delete sock.__data;
						processSync(function(onDone) {
							semit(socket,"wsh-data",{data:d,channel:channel},function() {							
								onDone();
								if (!sock.__data) {
									sock.resume();
									sock.__working=false;
								} else 
									oneData();
							});
						},sock);
					}
				});
			}).listen(port, "localhost",function() {
				startSSH(port);
			});
		}
	});

	socket.on("client-disconnect",function(data,fn) {
		try {
			var s = sockets[data.channel];
			if (!s)
				return;
			processSync(function(onDone) {
				delete sockets[data.channel];
				s.destroy();
				onDone();
			},s);
		} finally {
			fn();
		}
	});

	socket.on("client-data",function(data,fn) {
		try {
			var s = sockets[data.channel];
			if (!s)
				return;
			processSync(function(onDone) {
				s.write(data.data);
				onDone();
			},s);
		} finally {
			fn();
		}
	});
	socket.on("error",function() {
		for (var i in sockets) {
			var s = sockets[i];
			s.destroy();
		}
		sockets={};
		delete socket._queue; //process-sync.js
		delete socket.queue; // seralize-socket.js
	});

	socket.on("disconnect",function() {
		for (var i in sockets) {
			var s = sockets[i];
			s.destroy();
			delete s._queue; 
			delete s.queue; 
		}
		sockets={};
		delete socket._queue; //process-sync.js
		delete socket.queue; // seralize-socket.js
	});
});

function startSSH(port) {
	var exec = isWin ? "ssh.exe" : "ssh";
	args.unshift(port);
	args.unshift("-p");
	var opts = {stdio:[0,1,2]};
	var isWin = /^win/.test(process.platform);
	var p = require("child_process").spawn("ssh.exe",args,opts);
	p.on("exit",function(res) {
		process.exit(res);
	});
}