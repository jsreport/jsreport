﻿/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["core/view.base", "core/jaydataModel", "underscore", "jquery", "async"],
    function(ViewBase, ModelBase, _, $, async) {

        var DataGrid = {};
        DataGrid.show = function(options) {
            var view = new DataGrid.View({ collection: options.collection });
            view.idKey = options.idKey || "_id";
            view.filter = options.filter;
            view.headerTemplate = options.headerTemplate;
            view.rowsTemplate = options.rowsTemplate;
            view.onShowDetail = options.onShowDetail;
            view.setElement(options.el);
            options.showSelection = options.showSelection === undefined ? true : options.showSelection;
            view.options = options;
            if (options.helpers)
                $.extend(view, options.helpers);
            view.render();

            view.listenTo(view, "render", function() {
                if (options.onRender)
                    options.onRender();
            });

            var pager = new DataGrid.PagerView({ model: options.filter });
            pager.setElement($(view.el).find("#pagerBox"));
            pager.render();
            view.pager = pager;

            return {
                deleteItems: function() {
                    view.deleteAction();
                }
            };
        };

        DataGrid.PagerView = ViewBase.extend({
            template: "dataGrid-pager",

            events: {
                "click #nextPage": "nextPage",
                "click #previousPage": "previousPage",
                "click #firstPage": "firstPage",
                "click #lastPage": "lastPage"
            },

            nextPage: function() {
                if (this.model.get("pageNumber") < (this.model.get("lastPageNumber") - 1))
                    this.model.set("pageNumber", this.model.get("pageNumber") + 1);
                return false;
            },

            previousPage: function() {
                if (this.model.get("pageNumber") > 1)
                    this.model.set("pageNumber", this.model.get("pageNumber") - 1);
                return false;
            },

            firstPage: function(ev, data) {
                this.model.set("pageNumber", 1);
            },

            lastPage: function(ev, data) {
                this.model.set("pageNumber", this.model.get("lastPageNumber"));
            }
        });

        DataGrid.View = ViewBase.extend({
            template: "dataGrid",

            events: {
                "click .table tr td a": "showDetail",
                "click #deleteCommand": "deleteAction"
            },

            initialize: function() {
                var self = this;
                this.listenTo(this.collection, "sync", this.render);
                this.listenTo(this, "render", this.refresh);

                _.bindAll(this, "getHeaderTemplate", "getRowsTemplate", "getIdFromIdKey", "getOptions");
            },

            getIdFromIdKey: function(item) {
                return item[this.idKey];
            },

            getOptions: function(item) {
                return this.options;
            },

            refresh: function() {
                this.$el.find("table").selectable({
                    filter: "tr",
                    cancel: 'a',
                    selected: function(evennt, ui) {
                        $(".ui-selectee", this).each(function(a, b) {
                            var has = $(b).hasClass("ui-selected");
                            $('.checkbox', b).prop('checked', has ? "checked" : null);
                        });
                    }
                });

                if (this.pager) {
                    this.pager.setElement($(this.el).find("#pagerBox"));
                    this.pager.render();
                }
            },

            getHeaderTemplate: function() {
                return this.headerTemplate;
            },

            getRowsTemplate: function() {
                return this.rowsTemplate;
            },

            showDetail: function(ev, data) {
                this.onShowDetail(this.getId(ev.target));
            },

            deleteAction: function() {
                if (!confirm('Do you really want to delete it?'))
                    return;

                var self = this;
                var selectedRows = this.$el.find("table tr.ui-selected");

                async.each(selectedRows, function(row, cb) {
                    self.collection.models.forEach(function(m) {
                        if (m.get(self.idKey) === $(row).attr("data-id")) {
                            m.destroy({ success: cb, error: function(e) { console.log(e);} });
                        }
                    });
                }, function() {
                    self.filter.set("totalCount", self.filter.get("totalCount") - selectedRows.length);
                    self.filter.trigger("apply");
                    self.collection.trigger("sync");
                });
            },

            getId: function(target) {
                return $(target).closest("tr").attr("data-id");
            }
        });

        DataGrid.Filter = DataGrid.Filter || {};
        DataGrid.Filter.defaultPageSize = 15;

        DataGrid.Filter.Base = ModelBase.extend({
            initialize: function() {
                this.bind("change:totalCount", this.onTotalCountChanged);
                this.bind("change:pageNumber", this.onTotalCountChanged);
                this.bind("change:pageNumber", function() {
                    this.trigger("apply");
                });
            },

            toOData: function() {
                return {
                    $skip: this.get("pageSize") * (this.get("pageNumber") - 1),
                    $top: this.get("pageSize"),
                    $count: true
                };
            },

            onTotalCountChanged: function() {
                var totalCount = this.get("totalCount");
                var pageSize = this.get("pageSize");
                var lastPageNumber = Math.ceil(totalCount / pageSize);
                this.set("lastPageNumber", lastPageNumber);
                this.set("displayPager", lastPageNumber > 1);
            },

            defaults: {
                pageNumber: 1,
                pageSize: DataGrid.Filter.defaultPageSize
            }
        });

        return DataGrid;
    });