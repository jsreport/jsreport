/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["jquery", "originalmarionette", "core/utils", "modelBinder", "backbone"], function($, Marionette, Utils, ModelBinder, Backbone) {

    $.support.cors = true;

    Marionette.Renderer.render = function(template, data, context) {
        return $.render[template](data, data, context);
    };

    function bind(view) {
        if (view.model != null) {
            var bindings = ModelBinder.createDefaultBindings(view.el, 'name');

            //remove bindings for child views
            var filteredBindings = [];
            for (var key in bindings) {
                if (view.isChild) {
                    filteredBindings[key] = bindings[key];
                } else {
                    if ($(bindings[key].selector).parents("[data-child=true]").length == 0) {
                        filteredBindings[key] = bindings[key];
                    }
                }
            }

            view.modelBinder.bind(view.model, view.el, filteredBindings);
        }
    }

    Marionette.Region.prototype.open = function(view) {
        this.$el.hide();
        this.$el.html(view.el);

        bind(view);

        this.listenTo(view, "render", function() { bind(view); });

        this.$el.fadeIn("slow");
    };

    Backbone.Model.prototype.copyAttributesToEntity = function(entity) {

        function copyAttributes(e, m) {
            for (var p in m.attributes) {
                var attr = m.attributes[p];

                if (attr != null) {
                    if (attr.attributes != null) {
                        if (e[p] == null)
                            e[p] = new attr.Entity();

                        copyAttributes(e[p], attr);
                    } else {
                        e[p] = attr;
                    }
                }
            }
        }

        copyAttributes(entity, this);
    };


    Backbone.Marionette.MultiRegion = Backbone.Marionette.Region.extend({
        views: {},

        open: function(view) {
            this.ensureEl();
            this.$el.append(view.el);
        },

        close: function() {
            for (var key in this.views) {
                this._closeView(this.views[key]);
                this._removeView(this.views[key]);
                Marionette.triggerMethod.call(this, "close", this.views[key]);
            }

            this.views = {};

            return this;
        },

        show: function(view, id) {
            if (id == null)
                id = new Date().getTime();

            if (this.views[id] != null) {
                this._closeView(this.views[id]);
            }
            
            this._showView(view, id);

            this._addView(view, id);
            Marionette.triggerMethod.call(this, "show", view);

            return this;
        },

        _closeView: function(view) {
            if (view.close) {
                view.close();
            } else {
                $(view.el).remove();
                // If it doesn't have a `close` method, at least remove them from the DOM with Backbone.View's `remove`
                //view.remove();
            }

            Marionette.triggerMethod.call(this, "close", view);
        },

        _showView: function(view, id) {
            view.render();
            this.open(view);

            Marionette.triggerMethod.call(view, "show");
            Marionette.triggerMethod.call(this, "show", view);

            view.isChild = true;
            view.$el.attr("data-child", true);
            this.views[id] = view;
            bind(view);
        },

        _removeView: function(view, id) {
            delete this.views[id];
        },

        _addView: function(view, id) {
            this.views[id] = view;
        },

        attachView: function(view, id) {
            this.open(view);
            this.views[id] = view;

            return this;
        },
    });

    return Marionette;
});