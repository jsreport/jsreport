

module.exports = function(req, res, next) {

    var vm = require('vm');
    var sandbox = {
        req: req,
        res: res,
        next: next
    };
    vm.runInNewContext(req.body.script, sandbox);
};