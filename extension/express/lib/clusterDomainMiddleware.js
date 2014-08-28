
module.exports = function(cluster, server) {
    return function (req, res, next) {
        var d = require('domain').create();
        d.on('error', function (er) {
            console.error('error!!', er.stack);

            try {
                // make sure we close down within 30 seconds
                var killtimer = setTimeout(function () {
                    process.exit(1);
                }, 30000);
                // But don't keep the process open just for that!
                killtimer.unref();

                // stop taking new requests.
                server.close();

                // Let the master know we're dead.  This will trigger a
                // 'disconnect' in the cluster master, and then it will fork
                // a new worker.
                cluster.worker.disconnect();

                // try to send an error to the request that triggered the problem
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Oops, there was a problem!\n');
            } catch (er2) {
                // oh well, not much we can do at this point.
                console.error('Error sending 500!', er2.stack);
            }
        });

        d.add(req);
        d.add(res);

        d.run(function () {
            next();
        });
    };
};