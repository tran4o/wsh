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
	var url = "http://dev2-bg.plan-vision.com:4000";
	if (args && args.length) {
		url="http://"+args.shift();
	}
	var socket = io.connect(url);
	var sockets={};
	socket.on("wsh-connect",function(data) 
	{
		var channel=data.channel;
		csock.channel=channel;
		sockets[data.channel]=csock;
		newLocalConnection(function(csock) {
			csock.on("close",function() {
				socket.emit("client-disconnect",{channel:channel})
				delete sockets[channel];
			});
			csock.on("error",function(err) {
				socket.emit("client-disconnect",{channel:channel})
				delete sockets[channel];
				console.error("Socket error : ",err);
			});
			csock.on("data",function(data) {
				socket.emit("client-data",{data:data,channel:channel});
			});
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
		if (s) {
			s.send(data.data);
		}
	});
	socket.on("disconnect",function() {
		for (var i in sockets) {
			var s = sockets[i];
			client.destroy();
		}
		sockets={};
	});
}
