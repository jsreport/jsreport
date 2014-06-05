var ReportingServer = require('jsreport').ReportingServer;
new ReportingServer("./config.json").start(function(err){
    if (!!err) console.error("Error starting application with:",err);
});
