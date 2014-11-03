/*!
 * Copyright(c) 2014 Jan Blaha
 */

require.config({
    shim: {
        'extension/client-html/public/js/client.render.js': { exports: 'clientRender' },
        'extension/client-html/public/js/handlebars.min.js': { exports: 'Handlebars' }
    }
});

define(["jquery", "underscore", "app", "extension" + "/client-html/public/js/client.render.js", "extension" + "/client-html/public/js/handlebars.min.js"],
    function ($, underscore, app, clientRender, Handlebars) {

        window.Handlebars = Handlebars;
        return app.module("clientHtml", function (module) {
            app.recipes["client-html"] = {
                render: clientRender
            }
        });
    });