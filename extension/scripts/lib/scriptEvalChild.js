module.exports = function (inputs, done) {

    var vm = require('vm');

    var _require = function (moduleName) {
        //we want to allow only listed modules to stay secure
        //module can be just string id or { id : "id", path: "path" } tuple

        var modules = inputs.allowedModules.filter(function (mod) {
            return (mod.id || mod) === moduleName;
        });
        if (modules.length === 1) {
            return require(modules[0].path || modules[0]);
        }

        throw new Error("Unsupported module " + moduleName);
    };

    inputs.request.cancel = function(e) {
        done(null, {
            cancelRequest: true,
            additionalInfo: e
        });
    };

    var sandbox = {
        request: inputs.request,
        response: inputs.response,
        require: _require,
        setTimeout: setTimeout,
        Buffer: Buffer,
        doneMethods: function(err){
            done(null, {
                request: inputs.request,
                response: inputs.response,
                shouldRunAfterRender: true,
                error: err ? {
                    message: err.message,
                    stack: err.stack
                } : undefined
            });
        },
        done: function (err) {
            done(null, {
                request: inputs.request,
                response: inputs.response,
                shouldRunAfterRender: false,
                error: err ? {
                    message: err.message,
                    stack: err.stack
                } : undefined
            });

        }
    };

    var runBeforeRender = "\nif (typeof beforeRender === 'function') { beforeRender(doneMethods); } else { if (typeof afterRender === 'function') doneMethods(); }";
    var runAfterRender = "\nif (typeof afterRender === 'function') { afterRender(doneMethods); } else { done(); }";

    vm.runInNewContext(inputs.script + (inputs.method === "beforeRender" ? runBeforeRender : runAfterRender), sandbox);
};