/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Child process rendering html(xml) from template content, helpers and input data.
 */


//resolve references in json specified by $ref and $id attribute, this is handy when user send cycles in json
var resolveReferences = function (json) {
    if (typeof json === 'string')
        json = JSON.parse(json);

    var byid = {}, // all objects by id
        refs = []; // references to objects that could not be resolved
    json = (function recurse(obj, prop, parent) {
        if (typeof obj !== 'object' || !obj) // a primitive value
            return obj;
        if (Object.prototype.toString.call(obj) === '[object Array]') {
            for (var i = 0; i < obj.length; i++)
                if ("$ref" in obj[i])
                    obj[i] = recurse(obj[i], i, obj);
                else
                    obj[i] = recurse(obj[i], prop, obj);
            return obj;
        }
        if ("$ref" in obj) { // a reference
            var ref = obj.$ref;
            if (ref in byid)
                return byid[ref];
            // else we have to make it lazy:
            refs.push([parent, prop, ref]);
            return;
        } else if ("$id" in obj) {
            var id = obj.$id;
            delete obj.$id;
            if ("$values" in obj) // an array
                obj = obj.$values.map(recurse);
            else // a plain object
                for (var p in obj) {
                    if (obj.hasOwnProperty(p))
                        obj[p] = recurse(obj[p], p, obj);
                }
            byid[id] = obj;
        }
        return obj;
    })(json); // run it!

    for (var i = 0; i < refs.length; i++) { // resolve previously unknown references
        var ref = refs[i];
        ref[0][ref[1]] = byid[ref[2]];
        // Notice that this throws if you put in a reference at top-level
    }
    return json;
};

var _require = function (moduleName) {
    var allowedModules = ["handlebars", "moment"];

    if (allowedModules.filter(function (mod) {
            return mod === moduleName;
        }).length === 1) {

        return require(moduleName);
    }

    throw new Error("Unsupported module " + moduleName);
};

var vm = require('vm');

module.exports = function(inputs, done) {
    var gc = global.gc;

    inputs.data = resolveReferences(inputs.data);

    var sandbox = {
        _: require("underscore"),
        moment: require("moment"),
        m: inputs,
        handlebars: require("handlebars"),
        require: _require,
        render: require("./" + inputs.template.engine + "Engine" + ".js"),
        respond: function (err, content) {
            process.nextTick(function() {
                delete sandbox;
                gc();
                done(err, {
                    content: content
                });
            });
        }
    };

    if (inputs.template.helpers) {

        //first grab helpers as it would be an object { "foo" : function... } for back compatibility reasons
        //when its not an object eval again and let helpers register into globals

        vm.runInNewContext("jsrHelpers = " + inputs.template.helpers, sandbox);

        if (sandbox.jsrHelpers && typeof sandbox.jsrHelpers === 'object') {
            inputs.template.helpers = sandbox.jsrHelpers;
        } else {

            vm.runInNewContext(inputs.template.helpers, sandbox);

            inputs.template.helpers = {};
            for (var fn in sandbox) {
                if (typeof sandbox[fn] === "function") {
                    inputs.template.helpers[fn] = sandbox[fn];
                }
            }
        }
    } else
        inputs.template.helpers = {};

    try {
        vm.runInNewContext("respond(null, render(m.template.content, m.template.helpers, m.data))", sandbox);
    }
    catch(e) {
        if (!e.message) {
            e = new Error(e);
        }
        sandbox.respond(e);
    }
};
