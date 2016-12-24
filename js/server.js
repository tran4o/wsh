var express = require('express');
var bodyParser = require('body-parser');
var moment = require("moment");
var defs = require("./defaults");
var semit = require("./serialize-socket");

////////////////////////////////////////////////////////////////

var extev;

try {
	extev = require('./external-events');
	console.log(`${Object.keys(extev).length} events registered`);
} catch (err) {
	console.log("no external events defined: " + err);
}

////////////////////////////////////////////////////////////////

let log4node = require('log4node');
let logf = new log4node.Log4Node({level: 'info', file: '/home/visionr/log/wsh-server.log'});
let logc = console.log;
console.log = l => { logc(l);  logf.info(l) };

////////////////////////////////////////////////////////////////

var processSync = require("./process-sync");
var sseq=0;

function exec(args) {
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
			//console.log(">>> SOCKET.io disconnected "+socket.clientCode);
			if (socket.clientCode) 
			{
				var toDel=[];
				for (var i in channels) if (channels[i].code == socket.clientCode) toDel.push(i);
				for (var i in toDel) 
				{
					var rc=channels[toDel[i]];
					var channel = rc.channel;
					//console.log("DEL CHANNEL SEND CLIENT DISCONNECT!");
					semit(rc.socket,"client-disconnect",{channel:channel},function onD() {
						//console.log(" >> SENT CLIENT-DISCONNECT to CHANNEL "+channel);
					});						
					delete channels[toDel[i]];
				}
			} 
		});
		//---------------------------------------------------------------------------------
		socket.on("wsh-connect",function(data,fn) {
			//console.log(data.seq+" : wsh-connect");
			if (!data.channel || !data.code)
				return fn();
			var channel = data.channel;
			if (!sockets[data.code]) 
			{
				console.error("ERROR in wsh-connect : sockets[data.code] not defined ("+data.code+")");
				var c = channels[data.channel];
				if (!c)
					return fn();
				semit(c.socket,"client-disconnect",{channel:channel});
				return fn();			// ERROR NOT AVAILILABLE
			}
			channels[channel]={socket:socket,forwardTo:sockets[data.code],channel:channel,code:data.code};
			semit(sockets[data.code].socket,"wsh-connect",{channel:channel});
			return fn();
		});		
		socket.on("wsh-disconnect",function(data,fn) {
			try {
				var c = channels[data.channel];
				if (!c)
					return;
				if (!sockets[c.code])
					return;
				semit(sockets[c.code].socket,"wsh-disconnect",{channel:data.channel});
			} finally {
				fn();
			}
		});		
		socket.on("wsh-data",function(data,fn) 
		{
			try {
				//console.log(data.seq+" : wsh-data "+data.data.length);
				var c = channels[data.channel];
				if (!c)
					return;
				if (!sockets[c.code])
					return;
				var s = c;
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
					if (!sockets[c.code])
						return;
					semit(sockets[c.code].socket,"wsh-data",{channel:c.channel,data:d},function() {
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
		//-------------------------------------
		socket.on("client-register",function(data,fn) {
			//console.log(data.seq+" : client-register");
			try 
			{
				if (!data || !data.code) 
					return;
				socket.clientCode=data.code;			
				sockets[data.code]={socket:socket,seq:sseq++,code:data.code};
				let sdetail = {socket:"<native>",seq:sseq++,code:data.code};

				console.log(`{"registered": ${JSON.stringify(sdetail)} }`);

				if (extev && extev.events['client-register']) {
					extev.events['client-register'](sdetail, socket);
				}
			} finally {
				fn();
			}
		});
		socket.on("client-ping",function(data,fn) {
      try {
				if (extev && extev.events['client-ping']) {
					extev.events['client-ping'](sdetail, socket);
				} 
      } finally {
		    fn();
      }
	  });
		socket.on("client-disconnect",function(data,fn) {
			//console.log(data.seq+" : client-disconnect");
			try {
				if (data.channel) 
				{
					if (channels[data.channel]) 
					{
						var s = channels[data.channel].socket;
						if (s) 
							semit(s,"client-disconnect",{channel:data.channel});
						delete channels[data.channel];
					} 
				} 
			} finally {
				fn();
			}
		});		
		socket.on("client-data",function(data,fn) 
		{
			//console.log(data.seq+" : client-data "+data.data.length);
			try {
				var c = channels[data.channel];
				if (!c)
					return;
				var s = c;
				if (!s.data) {
					s.data=data.data;
				} else {
					s.data=Buffer.concat([s.data, data.data]);
				}
				if (!s.working) {
					s.working=true;
					oneData();
				}
				function oneData() 
				{
					var d = s.data;
					delete s.data;				
					semit(c.socket,"client-data",{channel:c.channel,data:d},function() {
						if (!s.data) {
							s.working=false;
						} else 
							oneData();
					});
				}
			} finally {
				fn();
			}
		});
	});
	//------------------------------------------------
	server.listen(port);
}
exports.exec=exec;
