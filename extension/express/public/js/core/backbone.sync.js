/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["backbone", "jquery", "app", "underscore"], function (Backbone, $, app, _) {

    function read(model) {
        var url;
        if (model.odata && !_.isFunction(model.url)) {
            url = "odata/" + model.odata + "?$filter=shortid eq '" + model.get("shortid") + "'";
        }

        if (!url)
            url = model.url();

        return $.ajax({
            type: "GET",
            dataType: 'json',
            url: app.serverUrl + url,
            converters: {
                "text json": function(data) {
                    return $.parseJSON(data, true);
                }
            }
        }).then(function(res) {
            if (url.indexOf("odata/") !== -1) {
                model.meta = res;
                res = res.value;
            }

            if (model.odata) {
                res = res[0];
            }

            return res;
        });
    }

    function update(model) {

        var url;
        if (model.odata) {
            url = "odata/" + model.odata + "(" + model.get("_id") + ")";
        }

        if (!url)
            url = model.url();

        return $.ajax({
            type: url.indexOf("odata/") !== -1 ? "PATCH" : "PUT",
            dataType: 'json',
            url: app.serverUrl +url,
            converters: {
                "text json": function(data) {
                    return $.parseJSON(data, true);
                }
            },
            data: JSON.stringify(model.toJSON())
        });
    }

    function create(model) {
        var url;
        if (model.odata) {
            url = "odata/" + model.odata;
        }

        if (!url)
            url = model.url();


        return $.ajax({
            type: "POST",
            dataType: 'json',
            url: app.serverUrl + (model.odata ? ("odata/" + model.odata) : model.url()),
            converters: {
                "text json": function(data) {
                    return $.parseJSON(data, true);
                }
            },
            data: JSON.stringify(model.toJSON())
        });
    }

    function remove(model) {
        var url;
        if (model.odata) {
            url = "odata/" + model.odata + "(" + model.get("_id") + ")";
        }

        if (!url)
            url = model.url();

        return $.ajax({
            type: "DELETE",
            dataType: 'json',
            url: app.serverUrl +url,
            converters: {
                "text json": function(data) {
                    return $.parseJSON(data, true);
                }
            },
            data: JSON.stringify(model.toJSON())
        });
    }

    var methods = {
       "create": create,
       "delete": remove,
       "update": update,
       "read": read
    };

    Backbone.sync = function (method, model, options) {
        model.syncing = true;
        app.trigger(method + ":started", model);

        methods[method].call(this, model)
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

