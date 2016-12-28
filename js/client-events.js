

let ivping;
const defs = require("./defaults");
const os = require('os');

exports.events = {
    'client-registered': (socket, code) => {
        if (defs.keepAlive && !ivping) {
            ivping = setInterval(function () {
                try {
                    socket.semit("client-ping", {
                        code: code,
                        sensor: {
                            load: os.loadavg(),
                            mem: {
                                total:os.totalmem(),
                                free:os.freemem()
                            }
                        },
                        time: (new Date()).getTime()
                    }, function () {
//							console.log(">> PING/PONG " + (new Date()));
                    });
                } catch (e) {
                    console.log(e);
                }
            }, defs.keepAlive * 1000);
        }
    }
};
