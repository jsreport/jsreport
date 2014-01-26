define(["deferred"], function () {
    
    return function (app, cb) {
        var context = {};
        app.trigger("entity-registration", context);

        $data.EntityContext.extend('entity.Context', context);
        
        $data.generatedContexts = $data.generatedContexts || [];
        $data.generatedContexts.push(entity.Context);

        var dataContext = new entity.Context({
            name: 'oData',
            oDataServiceHost: (app.serverUrl + 'odata')
        });

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
            
            dataContext.addEventListener('added', function(e, ent) {
                app.trigger("create:success", ent.data);
            });
            dataContext.addEventListener('updated', function (e, ent) {
                app.trigger("update:success", ent.data);
            });
            dataContext.addEventListener('deleted', function (e, ent) {
                app.trigger("delete:success", ent.data);
            });
            
            cb(dataContext);
        });
    };
});