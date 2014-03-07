/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Child process rendering html(xml) from template content, helpers and input data.
 */ 

process.on('message', function (m) {
    try {
        
        var _require = function (moduleName) {
            var allowedModules = ["handlebars", "moment"];

            if (allowedModules.filter(function (mod) { return mod == moduleName; }).length == 1) {

                return require(moduleName);
            }

            throw new Error("Unsupported module " + moduleName);
        };
        
        var vm = require('vm');
        var sandbox = {
            _: require("underscore"),
            moment: require("moment"),
            m : m,
            require: _require,
            render: require("./" + m.template.engine + "Engine" + ".js"),
            respond: function(content) {
                process.send({
                    content: content
                });
            }
        };

        if (m.template.helpers != null && m.template.helpers != "") {
            vm.runInNewContext("m.template.helpers = eval(\"(\" + m.template.helpers + \")\");", sandbox);
        } else
            m.helpers = {};
        
        vm.runInNewContext("respond(render(m.template.content, m.template.helpers, m.data))", sandbox);
    } catch (ex) {
        process.send({
            error: ex.message,
            errorStack: ex.stack
        });
        process.exit();
    }
});