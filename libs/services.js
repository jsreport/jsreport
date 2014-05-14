var fs = require("fs"),
    path = require("path"),
    platform = require('os').platform(),
    nconf = require('nconf'),
    childProcess = require('child_process');


var shouldContinueInitializing = true;

function windowsInstall() {
    shouldContinueInitializing = false;

    console.log("installing windows service jsreport-server.");

    var pathToWinSer = path.resolve("node_modules\\jsreport\\node_modules\\.bin\\winser.cmd");
    childProcess.exec(pathToWinSer + " -i", function(error, stdout, stderr) {
        if (error) {
            console.log(error);
            process.exit(1);
            return;
        }

        console.log("starting windows service jsreport-server.");

        childProcess.exec("net start jsreport-server", function(error, stdout, stder) {
            if (error) {
                console.log(error);
                process.exit(1);
                return;
            }

            console.log("service jsreport-server is running. go to https://localhost:" + nconf.get('port'));
            process.exit(0);
        });
    });
}

function windowsUninstall() {
    shouldContinueInitializing = false;
    console.log("uninstalling windows service jsreport-server.");

    var pathToWinSer = path.resolve("node_modules\\jsreport\\node_modules\\.bin\\winser.cmd");
    childProcess.exec(pathToWinSer + " -x -r", function(error, stdout, stderr) {
        if (error) {
            console.log(error);
            process.exit(1);
            return;
        }

        console.log("windows service jsreport-server uninstalled");
        process.exit(0);
    });
}

module.exports = {
    install: function() {
        console.log("Platform is " + platform);

        if (platform == "win32" || platform == "win64") {
            return windowsInstall();
        }
    
        console.log("Installing jsreport as startup service for your platform should be described at http://jsreport.net/downloads");
    },
    uninstall: function() {
        windowsUninstall();
    }
};
