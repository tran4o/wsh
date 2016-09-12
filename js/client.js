var express = require('express');
var bodyParser = require('body-parser');
var moment = require("moment");
var connectPort = 22;  // TODO ADD OPTION


function newLocalConnection(onDone) {
	var client = new net.Socket();
	client.connect("localhost", connectPort, onDone);
	return client;
}

var sseq=0;
function exec(args) 
{
	var code="DEF";
	if (args && args.length)
		code=args.shift();
	var url = "http://dev2-bg.plan-vision.com:4000";
	if (args && args.length)
		url="http://"+args.shift();
	console.log("Connecting as CLIENT to "+url+" with CODE '"+code+"'";
	var socket = io.connect(url);
	var sockets={};
	socket.on("wsh-connect",function(data) 
	{
		console.log("Wsh-Connect with data : "+JSON.stringify(data));
		var channel=data.channel;
		var csock=newLocalConnection(function() 
		{
			csock.channel=channel;
			sockets[data.channel]=csock;
		});
		csock.on("data",function(data) {
			socket.emit("client-data",{data:data,channel:channel});
		});
		csock.on("close",function() {
			if (sockets[data.channel]) {
				socket.emit("client-disconnect",{channel:channel})
				delete sockets[channel];
			}
		});
		csock.on("error",function(err) {
			console.error("Socket error : ",err);
			if (sockets[data.channel]) {
				socket.emit("client-disconnect",{channel:channel})
				delete sockets[channel];
			}
		});
	});
	socket.on("wsh-disconnect",function(data) {
		var s = sockets[data.channel];
		if (s) {
			delete sockets[data.channel];
			s.destroy();
		}
	});
	socket.on("wsh-data",function(data) {
		var s = sockets[data.channel];
		if (s)
			s.send(data.data);
	});
	socket.on("connection",function() {
		socket.emit("client-register",{code:code});
	});
	socket.on("disconnect",function() {
		for (var i in sockets) {
			var s = sockets[i];
			client.destroy();
		}
		sockets={};
	});
}
exports.exec=exec;