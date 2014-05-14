/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Evaluates commands from commandline and update accordinly initial config
 */

var nconf = require('nconf'),
    services = require('./libs/services.js');

module.exports = function(callback) {

    function port(p) {
        nconf.set('port',p);
        shouldRefreshConfig = true;
    }

    function daemon() {
        nconf.set('daemon',true);
        shouldRefreshConfig = true;
    }

    var shouldRefreshConfig = false;
    
    require('commander')
        .version(require("./package.json").version)
        .usage('[options]')
        .option('-i, --install', 'WINDOWS ONLY - install app as windows service, For other platforms see http://jsreport.net/on-prem/downloads', services.install)
        .option('-r, --uninstall', 'WINDOWS ONLY - Stop and uninstall service', services.uninstall)
        .option('-p, --port <n>', 'Https Port', port)
        .option('-d, --daemon', 'NON WINDOWS ONLY - Start process as daemon', daemon)
        .parse(process.argv);
        
    if (shouldRefreshConfig) {
        //  async write config file
        nconf.save();
    }

    callback(null,true);
};

process.on('uncaughtException',function(){
    console.log(arguments);
});
