process.on('message', function (m) {
    try {
        
        var _require = function (moduleName) {
            var allowedModules = ["handlebars", "request-json", "feedparser", "request", "underscore"];

            if (allowedModules.filter(function (mod) { return mod == moduleName; }).length == 1) {
                return require(moduleName);
            }

            throw new Error("Unsupported module " + moduleName);
        };
        
        var vm = require('vm');
        var sandbox = {
            request: m.request,
            response: m.response,
            require: _require,
            done: function() {
                 process.send({
                     request: m.request,
                     response: m.response
                 });
                 process.exit();
            }
        };

       vm.runInNewContext(m.script, sandbox);
    } catch (ex) {
        process.send({
            error: ex.message,
            errorStack: ex.stack
        });
        process.exit();
    }
});