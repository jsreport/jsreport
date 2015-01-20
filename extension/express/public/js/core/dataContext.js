/*! 
 * Copyright(c) 2014 Jan Blaha 
 */
/* globals entity */

define(["deferred"], function () {
    
    return function (app, cb) {
        var context = {};
        app.trigger("entity-registration", context);

        app.trigger("after-entity-registration", context);
        $data.EntityContext.extend('entity.Context', context);
        
        $data.generatedContexts = $data.generatedContexts || [];
        $data.generatedContexts.push(entity.Context);

        function newContext() {
            var result = new entity.Context({
                name: 'oData',
                oDataServiceHost: (app.serverUrl + 'odata')
            });

            result.new = function() {
                return newContext();
            };

            return result;
        }

        var dataContext = newContext();


        dataContext.onReady(function() {
            dataContext.prepareRequest = function(r) {
                r[0].headers["If-Modified-Since"] = "Sat, 1 Jan 2005 00:00:00 GMT";
            };
            
            $data.Queryable.prototype.applyFilter = function (filter) {
                return this
                   .withInlineCount()
                   .skip(filter.get("pageSize") * (filter.get("pageNumber") - 1))
                   .take(filter.get("pageSize"));
            };

            dataContext.prepareRequest = function (r) {
                if (r[0].requestUri.indexOf("?") === -1)
                    r[0].requestUri += "?";
                else
                    r[0].requestUri += "&";

                r[0].requestUri += "studio=" + app.options.studio;
            };
            
            cb(dataContext);
        });
    };
});