/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

process.on('message', function (m) {
    
    try {
        var safeExecute = function (func, m) {
            var content = func(m.template.content, m.template.helpers, m.data);
            process.send({
                content: content
            });
        };

        _ = require("underscore");
        var render = require("./" + m.template.engine + "Engine" + ".js");
        safeExecute(render, m);
    } catch (ex) {
        console.log(ex);
        process.send({
            error: ex.message,
            errorStack: ex.stack
        });
    }

    process.exit();
});


