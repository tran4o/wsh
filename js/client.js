var BUFFER_SIZE = 1024*1024*4; // 4 MB

var express = require('express');
var bodyParser = require('body-parser');
var moment = require("moment");
var defs = require("./defaults");
var io = require("socket.io-client");
var semit = require("./serialize-socket");
var processSync = require("./process-sync");
var net = require("net");
var clientConnectHost = defs.clientConnectHost;
var clientConnect = defs.clientConnectPort;

function newLocalConnection(onDone) {
	var client = new net.Socket();
	client.connect(clientConnect, clientConnectHost, onDone);
	return client;
}
var sseq=0;
function exec(args) 
{
	var code="DEF";
	if (args && args.length)
		code=args.shift();
	var url = "http://"+defs.serverUrl;
	if (args && args.length)
		url="http://"+args.shift();
	console.log("Connecting as CLIENT to "+url+" with CODE '"+code+"'");
	
	var socket = io.connect(url);
	var sockets={};

	//--------------------------
	socket.on("connect_error",function() {
		console.log("CONNECT_ERROR!");
	});
	socket.on("reconnect_failed",function() {
		console.log("RECONNECT FAILED!");
	});
	//--------------------------
	
	socket.on("wsh-connect",function(data,fn) 
	{
		try 
		{
			processSync(function(onDone) 
			{
				console.log("wsh-connect(ed) : "+JSON.stringify(data));
				var channel=data.channel;
				var onDoneCalled=false;
				var csock=newLocalConnection(function() 
				{
					csock.channel=channel;
					sockets[data.channel]=csock;
					if (!onDoneCalled) {onDoneCalled=true;onDone();}
				});
				csock.on("data",function(data) {
					
					if (!csock.__data) {
						csock.__data=data;
					} else {
						csock.__data=Buffer.concat([csock.__data, data]);
					}
					if (csock.__data.length > BUFFER_SIZE)
						csock.pause();
					if (!csock.__working) {
						csock.__working=true;
						oneData();
					}
					function oneData() {
						var d = csock.__data;
						delete csock.__data;
						processSync(function(onDone) {
							semit(socket,"client-data",{data:d,channel:channel},function() {							
								onDone();
								if (!csock.__data) {
									csock.__working=false;
									csock.resume();
								} else 
									oneData();
							});
						},csock);
					}
				});
				csock.on("close",function() {
					processSync(function(onDone) {
						if (sockets[data.channel]) {
							semit(socket,"client-disconnect",{channel:channel},onDone);
							delete sockets[channel];
						}
						onDone();
					},csock);
				});
				csock.on("error",function(err) {
					if (!onDoneCalled) {onDoneCalled=true;onDone();}
					processSync(function(onDone) {
						console.error("Socket error : ",err);
						if (sockets[data.channel]) {
							semit(socket,"client-disconnect",{channel:channel},onDone);
							delete sockets[channel];
						}
					},csock);
				});
			},socket);
		} finally {
			fn();
		}
	});
	socket.on("wsh-disconnect",function(data,fn) {
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
	socket.on("wsh-data",function(data,fn) {
		try {
			//console.log("WSH-DATA : "+data.data);
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
	//--------------------------------
	socket.on("connect",function() {
		console.log(">> SOCKET CONNECT!!!")
		semit(socket,"client-register",{code:code},function() {});
	});
	//--------------------------------
	socket.on("disconnect",function() {
		console.log(">> SOCKET DISCONNECT!!!")
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
}
exports.exec=exec;