var fs = require("fs"),
    path = require("path"),
    platform = require('os').platform(),
    nconf = require('nconf'),
    childProcess = require('child_process');

var Service;

switch (platform) {
	case 'win32':
	case 'win64':
		Service = require('node-windows').Service;
		break;
	default:
		Service = function(){
			throw ("Installing jsreport as startup service for your platform should be described at http://jsreport.net/downloads");
		}
}
var svc = new Service({
	name: 'jsreport-server',
	description: 'Reporting platform\nJust code, Just javascript\nOpen sourced\nUnlimited posibilities\nhttp://jsreport.net/',
	script: 'server.js'
});

module.exports = {
    install: function() {
        console.log("Platform is " + platform);
		svc.on('start',function(){
			console.log('service started');
			process.exit(0);
		});
		svc.on('install',function(){
			console.log('service installed');
			svc.start();
		});
		svc.install();
    },
    uninstall: function() {
        svc.on('uninstall',function(){
			console.log('Uninstall complete.');
			process.exit(0);
		});
		svc.uninstall();
    }
};
