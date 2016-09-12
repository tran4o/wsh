var express = require('express');
var bodyParser = require('body-parser');
var moment = require("moment");
var defs = require("./defaults");
var semit = require("./serialize-socket");
var processSync = require("./process-sync");
var sseq=0;
function exec(args) 
{
	var port = defs.serverListenPort;
	if (args && args.length) {
		var p = parseInt(args.shift());
		if (!isNaN(p))
			port = p;
	}
	var app = express();
	var server = require('http').Server(app);
	app.use(require("compression")());
	app.use(bodyParser.json()); // for parsing application/json
	app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
	var io = require('socket.io')(server);
	var ss = require('socket.io-stream');
	//------------------------------------------------
	var sockets={};
	var channels={};
	io.on('connection', function (socket) 
	{		
		var dataMode = false;
		socket.on("disconnect", function() {
			console.log(">>> SOCKET.io disconnected "+clientCode);
			if (socket.clientCode) 
			{
				var toDel=[];
				for (var i in channels) if (channels[i].code == socket.clientCode) toDel.push(i);
				console.log("TODEL : ",toDel);
				for (var i in toDel) 
				{
					var rc=channels[toDel[i]];
					var channel = rc.channel;
					console.log("DEL CHANNEL "+channel);
					processSync(function(onDone) 
					{
						console.log("DEL CHANNEL SEND CLIENT DISCONNECT!");
						semit(rc.socket,"client-disconnect",{channel:channel},function onD(r) {
							console.log(" >> SENT CLIENT-DISCONNECT to CHANNEL "+channel);
							r();
						});						
					},rc.socket);
					delete channels[toDel[i]];
				}
			} 
		});
		//---------------------------------------------------------------------------------
		socket.on("wsh-connect",function(data,fn) {
			try {
				processSync(function(onDone) {
					if (!data.channel || !data.code)
						return onDone();
					var channel = data.channel;
					if (!sockets[data.code]) {
						console.error("ERROR in wsh-connect : sockets[data.code] not defined ("+data.code+")");
						var c = channels[data.channel];
						if (!c)
							return onDone();
						semit(c.socket,"wsh-disconnect",{channel:channel},onDone);
						return;	// ERROR NOT AVAILILABLE
					}
					channels[channel]={socket:socket,forwardTo:sockets[data.code],channel:channel,code:data.code};
					semit(sockets[data.code].socket,"wsh-connect",{channel:channel},onDone);
					console.log("WSH-CONNECT : "+JSON.stringify(data));
				},socket);
			} finally {
				fn();
			}
		});		
		socket.on("wsh-disconnect",function(data,fn) {
			try {
				processSync(function(onDone) {
					console.log("WSH-DISCONNECT SERVER ::::::::::::: ",data);
					var c = channels[data.channel];
					if (!c)
						return onDone();
					if (!sockets[c.code])
						return onDone();
					semit(sockets[c.code].socket,"wsh-disconnect",{channel:data.channel},onDone);
				},socket);
			} finally {
				fn();
			}
		});		
		socket.on("wsh-data",function(data,fn) 
		{
			try {
				processSync(function(onDone) {
					var c = channels[data.channel];
					if (!c)
						return onDone();
					if (!sockets[c.code])
						return onDone();
					semit(sockets[c.code].socket,"wsh-data",{channel:data.channel,data:data.data},onDone);
				},socket);
			} finally {
				fn();
			}
		});
		//-------------------------------------
		socket.on("client-register",function(data,fn) {
			try 
			{
				processSync(function(onDone) {
					if (!data || !data.code) 
					{
						console.log("CLIENT REGISTER NOT OK : "+data);
						return onDone();
					}
					socket.clientCode=data.code;			
					sockets[data.code]={socket:socket,seq:sseq++,code:data.code};
					console.log("Client-Registered with "+JSON.stringify({socket:"<native>",seq:sseq++,code:data.code}))
					onDone();
				},socket);
			} finally {
				fn();
			}
		});
		socket.on("client-disconnect",function(data,fn) {
			try {
				processSync(function(onDone) {
					if (data.channel) 
					{
						if (channels[data.channel]) 
						{
							var s = channels[data.channel].socket;
							if (s) 
								semit(s,"client-disconnect",{channel:data.channel},onDone);
							else
								onDone();
							delete channels[data.channel];
						} else {
							onDone();
						}
					} else {
						onDone();
					}
				},socket);
			} finally {
				fn();
			}
		});		
		socket.on("client-data",function(data,fn) 
		{
			try {
				processSync(function(onDone) {
					var c = channels[data.channel];
					if (!c)
						return onDone();
					semit(c.socket,"client-data",data,onDone);
				},socket);
			} finally {
				fn();
			}
		});
	});
	//------------------------------------------------
	server.listen(port);
}
exports.exec=exec;