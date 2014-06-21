

var ConsoleLogger = module.exports = function() {
};

ConsoleLogger.prototype.debug = function(m) {
    console.log("debug " + m);
};

ConsoleLogger.prototype.info = function(m) {
    console.log("info " + m);
};

ConsoleLogger.prototype.warn = function(m) {
    console.warn("warn " + m);
};

ConsoleLogger.prototype.error = function(m) {
    console.log("error " + m);
};
