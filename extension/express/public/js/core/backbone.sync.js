/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["backbone", "jquery", "app", "underscore"], function (Backbone, $, app, _) {
    
    function JayDataSyncProvider() {
    }
        
    JayDataSyncProvider.prototype.read = function (model) {
        var result = $.Deferred();

        model.fetchQuery()
                .then(function (res) {
                        if (res == null) {
                            return result.reject();
                        }

                        result.resolve(res.initData || res);
                }, function (e) {
                console.log(e);
                app.dataContext.clear();
                    e.statusText = model.originalEntity.toString() + " not found";
                    result.reject(e);
                });

        return result;
    };

    JayDataSyncProvider.prototype.update = function (model) {
        var result = $.Deferred();

        var dataContext = app.dataContext.new();
        dataContext[model.contextSet().name].attach(model.originalEntity);
        model.copyToEntity();

        dataContext.saveChanges()
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
        var dataContext = app.dataContext.new();
        dataContext[model.contextSet().name].add(model.originalEntity);
        
        dataContext.saveChanges()
           .then(function () {
               result.resolve(model.originalEntity.initData);
           }, function (e) {
               result.reject(e);
           });
        
        return result;
    };
    
    JayDataSyncProvider.prototype.delete = function (model) {
        var result = $.Deferred();

        var dataContext = app.dataContext.new();
        dataContext[ model.contextSet().name].remove({ _id: model.get("_id") });

        dataContext.saveChanges()
           .then(function () {
               result.resolve(model.attributes);
           }, function (e) {
               result.reject(e);
           });

        return result;
    };
    
    function JQuerySyncProvider() {
    }

    JQuerySyncProvider.prototype.read = function (model) {
        return $.getJSON(model.url(), model.toJSON());
    };
    
    JQuerySyncProvider.prototype.update = function (model) {
        return $.ajax({
            url: app.serverUrl + "api/" + model.url(),
            type: 'PUT',
            data: JSON.stringify(model.toJSON())
        });
    };
    
    JQuerySyncProvider.prototype.create = function (model) {
        return $.ajax({
            url: app.serverUrl + "api/" + model.url(),
            type: 'POST',
            data: JSON.stringify(model.toJSON())
        });
    };
    
    JQuerySyncProvider.prototype.delete = function (model) {
        return $.ajax({
            url: app.serverUrl + "api/" + model.url(),
            type: 'DELETE',
            data: JSON.stringify(model.toJSON())
        });
    };

    var syncProviders = {};
    syncProviders["jaydata"] = new JayDataSyncProvider();
    syncProviders["jQuery"] = new JQuerySyncProvider();

    Backbone.sync = function (method, model, options) {
        model.syncing = true;
        app.trigger(method + ":started", model);
        var provider = syncProviders[model.syncProvider || "jaydata"];
        
        provider[method].call(provider, model)
            .then(function (res) {
                options.success(res);
                model.changed = {};
                model.syncing = false;
                app.trigger(method + ":success", model);
            })
            .fail(function (e) {
                options.error(e);
                model.syncing = false;
                app.trigger(method + ":error", e);
            });
    };
});

