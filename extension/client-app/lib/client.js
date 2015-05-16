/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 */

var path = require("path");
var S = require("string");

module.exports = function (reporter, definition) {

    if (reporter.authentication) {
        reporter.documentStore.model.entityTypes["UserType"].defaultTemplateShortid = {type: "Edm.String"};
    }

    reporter.documentStore.model.entityTypes["TemplateType"].isClientDefault = {type: "Edm.Boolean)"};

    function clientRouting(app) {
        app.use("/client", function(req, res, next) {
            if (req.originalUrl !== "/client/" || req.query.skip) {
                return app(req, res);
            }

            next();
        });
    }

    if (reporter.authentication)
        reporter.on("before-authentication-express-routes", clientRouting);

    reporter.on("express-configure", function(app) {
        if (!reporter.authentication)
            clientRouting(app);

        app.get("/client", function(req, res, next) {
            res.render(path.join(__dirname, '../public/views', 'client-root.html'), {
                mode: definition.options.mode || "templates",
                isAuthEnabled: reporter.authentication !== undefined
            });
        });
    });
};