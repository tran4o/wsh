var express = require('express');
var bodyParser = require('body-parser');
var moment = require("moment");

var sseq=0;
function exec(args) 
{
	var port = 4000;
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
	var connections={};	// BY ID	
	var channels={};
	var listeners=[];
	io.on('connection', function (socket) 
	{		
		var clientCode = undefined;
		var dataMode = false;
		socket.seq=seq++;
		socket.on("client-register",function(data) {
			if (!data || !data.code) 
			{
				console.log("CLIENT REGISTER NOT OK : "+data);
				return;
			}
			clientCode=data.code;			
			sockets[data.code]={socket:socket,seq:sseq++,code:data.code};
			socket.emit(data.__code,{ok:1});
			console.log("Client-Registered with "+JSON.stringify(sockets[data.code]))
		});
		socket.on('disconnect', function() {
			if (clientCode) {
				if (connections[clientCode])
				for (var i in connections[clientCode])
					disconnectConnection(connections[clientCode][i]);
				connections={};
				clientCode=undefined;
			}
			if (socket.forwardTo && socket.forwardTo.socket && socket.forwardChannel ) 
			{
				var fwt = socket.forwardTo;
				var code = fwt.code;
				var ts = sockets[code];
				// sure connection is the same 
				if (ts && ts.seq == ftw.seq)
					ftw.socket.emit("server-disconnect",{channel:socket.forwardChannel});
			}
			channels={};
			for (var i in listeners) socket.removeListener(listeners[i]);
			listeners=[];
		});
		socket.on("client-disconnect",function(data) {
			if (data.channel) 
			{
				if (channels[data.channel]) 
				{
					var s = channels[data.channel].socket;
					if (s) 
						s.emit("client-disconnect",{channel:data.channel});
					delete channels[data.channel];
				}
			}
		});		
		socket.on("wsh-connect",function(data) {
			
			console.log("WSH-CONNECT : "+JSON.stringify(data));
			if (!data.channel || !data.code)
				return;
			if (!sockets[data.code]) {
				console.error("ERROR in wsh-connect : sockets[data.code] not defined ("+data.code+")");
				var c = channels[data.channel];
				if (!c)
					return;
				c.socket.emit("wsh-disconnect",{});
				return;	// ERROR NOT AVAILILABLE
			}
			channels[channel]={socket:socket,forwardTo:sockets[data.code],channel:channel,code:data.code};
			sockets[data.code].emit("wsh-connect",{channel:channel});
		});		
		socket.on("wsh-disconnect",function(data) {
			var c = channels[data.channel];
			if (!c)
				return;
			c.socket.emit("wsh-disconnect",{});
		});		
		socket.on("wsh-data",function(data) 
		{
			var c = channels[data.channel];
			if (!c)
				return;
			if (!sockets[c.code])
				return;
			sockets[c.code].emit("wsh-data",{channel:data.channel,data:data});
		});
		socket.on("client-data",function(data) 
		{
			var c = channels[data.channel];
			if (!c)
				return;
			c.socket.emit("client-data",data);
		});
	});
	//------------------------------------------------
	server.listen(port);
}
exports.exec=exec;