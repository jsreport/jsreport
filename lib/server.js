var ReportingServer = require('./ReportingServer');
new ReportingServer().start(function(err){
    if (!!err) console.error("Error starting application with:",err);
});
