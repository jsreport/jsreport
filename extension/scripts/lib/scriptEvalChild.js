process.on('message', function (m) {
    try {

        var _require = function (moduleName) {
            //we want to allow only listed modules to stay secure
            //module can be just string id or { id : "id", path: "path" } tuple

            var modules = m.allowedModules.filter(function (mod) { return (mod.id || mod) === moduleName; });
            if (modules.length == 1) {
                return require(modules[0].path || modules[0]);
            }

            throw new Error("Unsupported module " + moduleName);
        };

        var vm = require('vm');
        var sandbox = {
            request: m.request,
            response: m.response,
            require: _require,
            Buffer: Buffer,
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