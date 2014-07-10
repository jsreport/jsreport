module.exports = function (req, res, next) {


    var _require = function (moduleName) {
        //we want to allow only listed modules to stay secure
        //module can be just string id or { id : "id", path: "path" } tuple

        var modules = req.body.allowedModules.filter(function (mod) {
            return (mod.id || mod) === moduleName;
        });
        if (modules.length == 1) {
            return require(modules[0].path || modules[0]);
        }

        throw new Error("Unsupported module " + moduleName);
    };

    var vm = require('vm');
    var sandbox = {
        request: req.body.request,
        response: req.body.response,
        require: _require,
        Buffer: Buffer,
        done: function () {
            res.send({
                request: req.body.request,
                response: req.body.response
            });

        }
    };

    vm.runInNewContext(req.body.script, sandbox);
};