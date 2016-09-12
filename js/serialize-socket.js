module.exports = function(socket,msgcode,data,onDone) {
	if (!socket._queue) {
		socket._queue=[];
	}
	socket._queue.push({msgcode:msgcode,data:data,onDone:onDone});
	//console.log({msgcode:msgcode,data:data});
	if (socket._working)
		return;
	socket._working=true;
	one();
	function one() {
		var t = socket._queue.shift();
		if (!t) {
			socket._working=false;
			return;
		}
		//console.log("EMIT : "+t.msgcode);
		socket.emit(t.msgcode,t.data,function() {
			console.log("DONE EMITTING "+t.msgcode+" | "+JSON.stringify(t.data));
			if (t.onDone)
				t.onDone();
			one();
		});
	}
};