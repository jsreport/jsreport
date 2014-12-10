module.exports = function (req, res, next) {

    var vm = require('vm');

    var _require = function (moduleName) {
        //we want to allow only listed modules to stay secure
        //module can be just string id or { id : "id", path: "path" } tuple

        var modules = req.body.allowedModules.filter(function (mod) {
            return (mod.id || mod) === moduleName;
        });
        if (modules.length === 1) {
            return require(modules[0].path || modules[0]);
        }

        throw new Error("Unsupported module " + moduleName);
    };

    req.body.request.cancel = function(e) {
        res.send({
            cancelRequest: true,
            additionalInfo: e
        });
    };

    var sandbox = {
        request: req.body.request,
        response: req.body.response,
        require: _require,
        setTimeout: setTimeout,
        Buffer: Buffer,
        doneMethods: function(err){
            res.send({
                request: req.body.request,
                response: req.body.response,
                shouldRunAfterRender: true,
                error: err ? {
                    message: err.message,
                    stack: err.stack
                } : undefined
            });
        },
        done: function (err) {
            res.send({
                request: req.body.request,
                response: req.body.response,
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

    vm.runInNewContext(req.body.script + (req.body.method === "beforeRender" ? runBeforeRender : runAfterRender), sandbox);
};