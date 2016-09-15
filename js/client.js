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
		console.log("wsh-connect(ed) : "+JSON.stringify(data));
		var channel=data.channel;
		var csock=newLocalConnection(function() 
		{
			csock.channel=channel;
			sockets[data.channel]=csock;
			csock.on("data",function(data) 
			{					
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
					semit(socket,"client-data",{data:d,channel:channel},function() {							
						if (!csock.__data) {
							csock.__working=false;
							csock.resume();
						} else 
							oneData();
					});
				}
			});
			csock.on("close",function() {
				if (sockets[data.channel]) {
					semit(socket,"client-disconnect",{channel:channel});
					delete sockets[channel];
				}
			});
			csock.on("error",function(err) {
				console.error("Socket error : ",err);
				if (sockets[data.channel]) {
					semit(socket,"client-disconnect",{channel:channel});
					delete sockets[channel];
				}
			});
			fn();
		});
	});
	socket.on("wsh-disconnect",function(data,fn) {
		try {
			var s = sockets[data.channel];
			if (!s) 
				return;
			delete sockets[data.channel];
			s.destroy();
		} finally {
			fn();
		}
	});
	socket.on("wsh-data",function(data,fn) {
		console.log(data.seq+": wsh-data : "+data.data.length);
		try 
		{
			var s = sockets[data.channel];
			if (!s)
				return;
			if (!s._data) {
				s._data=data.data;
			} else {
				s._data=Buffer.concat([s._data, data.data]);
			}
			if (!s._working) {
				s._working=true;
				oneData();
			}
			function oneData() 
			{
				var d = s._data;
				delete s._data;
				s.write(d,function() {
					if (!s._data) {
						s._working=false;
					} else 
						oneData();
				});
			}
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
		}
		sockets={};
		delete socket._queue; //process-sync.js
		delete socket.queue; // seralize-socket.js
	});
}
exports.exec=exec;