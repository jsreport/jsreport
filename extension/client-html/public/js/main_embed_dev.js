/*!
 * Copyright(c) 2014 Jan Blaha
 */


define(["jquery", "underscore", "app"], function ($, underscore, app, Handlebars) {

    var shim = {};
    shim[app.serverUrl + 'extension/client-html/public/js/client.render.js'] = { exports: 'clientRender'};
    shim[app.serverUrl + 'extension/client-html/public/js/handlebars.min.js'] = { exports: 'Handlebars'};
    require.config({ shim: shim });

    require([app.serverUrl + "extension" + "/client-html/public/js/client.render.js", app.serverUrl + "extension" + "/client-html/public/js/handlebars.min.js"], function (clientRender, Handlebars) {
        window.Handlebars = Handlebars;
        return app.module("clientHtml", function (module) {
            app.recipes["client-html"] = {
                render: clientRender
            };
        });
    });
});