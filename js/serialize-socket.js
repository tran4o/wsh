var aseq=0;
module.exports = function(socket,msgcode,data,onDone) {
	if (!socket._queue) {
		socket._queue=[];
		socket._working=false;
	}
	data=data||{};
	data.seq=aseq++;
	/*if (data.data && data.data.length)
		console.log(" >> SENDING "+msgcode+" : "+data.data.length);
	else
		console.log(" >> sending "+msgcode);*/
	socket._queue.push({msgcode:msgcode,data:data,onDone:onDone});
	if (socket._working)
		return;
	socket._working=true;
	one();
	function one() {
		//setTimeout(function() {
			var t = socket._queue.shift();
			if (!t) {
				socket._working=false;
				return;
			}
			socket.emit(t.msgcode,t.data,function() {
				if (t.onDone)
					t.onDone();
				one();
			});
		//},0);
	}
};