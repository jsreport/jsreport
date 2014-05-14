var platform = require('os').platform();

var Service;

function getSvc(){
    switch (platform) {
        case 'win32':
        case 'win64':
            Service = require('node-windows').Service;
            break;
        case 'linux':
        default:
            throw new Error('Installing jsreport as startup service for your platform should be described at http://jsreport.net/downloads');
    }
    return new Service({
        name: 'jsreport-server',
        description: 'Reporting platform, Just code, Just javascript, Open sourced, Unlimited posibilities, http://jsreport.net/',
        script: 'server.js'
    });

}

module.exports = {
    install: function() {
        var svc=getSvc();
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
        var svc=getSvc();
        svc.on('uninstall',function(){
			console.log('Uninstall complete.');
			process.exit(0);
		});
		svc.uninstall();
    }
};
