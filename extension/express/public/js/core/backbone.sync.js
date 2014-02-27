define(["backbone", "jquery", "app", "underscore"], function (Backbone, $, app, _) {
    
    function JayDataSyncProvider() {
    };
        
    JayDataSyncProvider.prototype.read = function (model) {
        var result = $.Deferred();
        model.fetchQuery()
                .then(function (res) {
                        if (res == null) {
                            return result.reject();
                        }
                    
                        result.resolve(res.initData || res);
                }, function (e) {
                    e.statusText = model.originalEntity.toString() + " not found";
                    result.reject(e);
                });

        return result;
    };

    JayDataSyncProvider.prototype.update = function (model) {
        var result = $.Deferred();

        model.contextSet().attach(model.originalEntity);
       
        model.copyToEntity();
        model.originalEntity.script = _.extend({}, model.originalEntity.script);
        
        app.dataContext.saveChanges()
            .then(function () {
                result.resolve(model.attributes);
            }, function (e) {
                result.reject(e);
            });

        return result;
    };
    
    JayDataSyncProvider.prototype.create = function (model) {
        var result = $.Deferred();

        model.copyToEntity();
        model.contextSet().add(model.originalEntity);
        
        app.dataContext.saveChanges()
           .then(function () {
               result.resolve(model.originalEntity.initData);
           }, function (e) {
               result.reject(e);
           });
        
        return result;
    };
    
    JayDataSyncProvider.prototype.delete = function (model) {
        var result = $.Deferred();
        
        model.contextSet().remove({ _id: model.get("_id") });

        app.dataContext.saveChanges()
           .then(function () {
               result.resolve(model.attributes);
           }, function (e) {
               result.reject(e);
           });

        return result;
    };
    
    function JQuerySyncProvider() {
    };

    JQuerySyncProvider.prototype.read = function (model) {
        return $.getJSON(model.url(), model.toJSON());
    };
    
    JQuerySyncProvider.prototype.update = function (model) {
        return $.ajax({
            url: app.serverUrl + "api/" + model.url(),
            type: 'PUT',
            data: JSON.stringify(model.toJSON()),
        }).then(function() {
            app.trigger("update:success", model);
        });
    };
    
    JQuerySyncProvider.prototype.create = function (model) {
        return $.ajax({
            url: app.serverUrl + "api/" + model.url(),
            type: 'POST',
            data: JSON.stringify(model.toJSON()),
        }).then(function() {
            app.trigger("create:success", model);
        });
    };
    
    JQuerySyncProvider.prototype.delete = function (model) {
        return $.ajax({
            url: app.serverUrl + "api/" + model.url(),
            type: 'DELETE',
            data: JSON.stringify(model.toJSON()),
        }).then(function() {
            app.trigger("delete:success", model);
        });
    };

    var syncProviders = {};
    syncProviders["jaydata"] = new JayDataSyncProvider();
    syncProviders["jQuery"] = new JQuerySyncProvider();

    Backbone.sync = function (method, model, options) {
        app.trigger(method + ":started", model);
        var provider = syncProviders[model.syncProvider || "jaydata"];
        
        provider[method].call(provider, model)
            .then(function (res) {
                options.success(res);
                if (method == "read")
                    app.trigger("read:success", model);
            })
            .fail(function (e) {
                options.error(e);
                app.trigger(method + ":error", e);
            });
    };
});

