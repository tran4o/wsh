function dbq(pgc, q, p) {
	return new Promise((res, rej) => 
		pgc.query(q, p, (err, data) => {
			if (err) rej(err);
			else res(data);
		}));
}

var driver = require('./ext/driver');
var dbcon = driver.connect(function(err, pgc, done) { 
				exports.events = {
					"client-ping": data => {
							dbq(pgc, 'UPDATE tracking.devices SET ts_seen = now() where imei = $1', [ data.code ])
								.then(res => { 
									console.log("client-ping => db");
								})
								.catch(e => console.log(e));
							},
					"client-register": data => {
							dbq(pgc, 'UPDATE tracking.devices SET ts_reg = now() where imei = $1', [ data.code ])
								.then(res => { 
									console.log("client-reg => db");
								})
								.catch(e => console.log(e));
							}
					};
});
