module.exports = function (html, helpers, data) {
    var handlebars = require("handlebars");

    if (helpers != null && helpers != "") {
        var evalHelpers = eval("(" + helpers + ")");

        for (var h in evalHelpers) {
            handlebars.registerHelper(h, evalHelpers[h]);
        }
    }

    var compiledTemplate = handlebars.compile(html);
    return compiledTemplate(data);
};