

process.on('message', function (m) {
    console.log("Rendering.. " + m.template.html);
    
    try {
        var safeExecute = function (func, m) {

            var content = func(m.template.html, m.template.helpers, m.data);
            process.send({
                content: content
            });
        };
        
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


