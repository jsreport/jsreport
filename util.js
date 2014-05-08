/*! 
 * Copyright(c) 2014 Jan Blaha 
 *  
 */ 


var fs = require("fs");

exports.deleteFiles = function (path) {
    var files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
    }
};

exports.attachLogToListener = function (listener, listenerName, logger) {
  listener.pre(function() {
        if (logger != null)
            logger.debug("Start of " + listenerName + " - " + this.key);
    });
  listener.post(function() {
        if (logger != null)
            logger.debug("End of " + listenerName + " - " + this.key);
    });
  listener.postFail(function(err) {
      if (logger != null) {
          var logFn = err.weak ? logger.warn : logger.error;
          logFn("Error in " + listenerName + " - " + this.key + "/ Error - " + err);
      }
  });

   return listener;
};