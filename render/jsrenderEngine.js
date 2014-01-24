module.exports = function (html, helpers, data) {
    var jsrender = require('node-jsrender');

    var evalHelpers = {};

    if (helpers != null && helpers != "") {
        evalHelpers = eval("(" + helpers + ")");
    }
    
    jsrender.jsviews.views.settings.tryCatch = false;
  
    jsrender.loadString('template', html);

    return jsrender.render['template'](data || {}, evalHelpers);
}