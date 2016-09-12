var queue=[];
var working=false;
module.exports = function(fnc) {
	queue.push(fnc);
	if (working) {
		for (var i in queue)
			console.log("PROCESS WORKINGGGGG : ",queue[i].toString());
		return;
	}
	working=true;
	one();
	function one() {
		var t = queue.shift();
		if (!t) {
			working=false;
			console.log("NOT WORKING ANYMORE!!!!");
			return;
		}
		t(one);
	}
};