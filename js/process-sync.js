var data={};
var working=false;
module.exports = function(fnc,cqueue) {
	//fnc(function() {});
	var at = cqueue || data;
	if (!at.queue) {
		at.queue={arr:[],working:false};
	}
	at=at.queue;
	//------------------
	var queue=at.arr;
	queue.push(fnc);
	if (at.working) {
		return;
	}
	at.working=true;
	one();
	function one() {
		var t = queue.shift();
		if (!t) {
			at.working=false;
			return;
		}
		t(one);
	}
};