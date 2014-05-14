var winston = require('winston'),
    fs = require('fs');

module.exports = function(){
    if (!winston.loggers.has("jsreport")) {
        var transportSettings = {
            timestamp: true,
            colorize: true,
            level: "debug"
        };

        if (!fs.existsSync("logs")) {
            fs.mkdir("logs");
        }

        var consoleTransport = new (winston.transports.Console)(transportSettings);
        var fileTransport = new (winston.transports.File)({ name: "main", filename: 'logs/reporter.log', maxsize: 10485760, json: false, level: "debug" });
        var errorFileTransport = new (winston.transports.File)({ name: "error", level: 'error', filename: 'logs/error.log', handleExceptions: true, json: false });

        winston.loggers.add('jsreport', {
            transports: [consoleTransport, fileTransport, errorFileTransport]
        });
    }
};
