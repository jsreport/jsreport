/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["jquery", "jsrender", "core/utils"], function($, foo, Utils) {

    $.views.helpers({
        dateToString: function(date) {
            if (date == null)
                return null;
            return date.toLocaleString();
        },

        decode: function(s) {
            return Utils.decodeBase64(s);
        },

        getSettings: function() {
            return require("app").settings;
        },

        getApp: function() {
            return require("app");
        },

        getTenant: function() {
            return require("app").settings.tenant || { name: ""};
        },

        getUserIdentificationText: function() {
            var tenant = require("app").settings.tenant || { name: "", email: ""};
            return tenant.username || tenant.email || tenant.name || "";
        },

        getServerUrl: function() {
            return require("app").serverUrl;
        },

        getRandom: function() {
            return new Date().getTime();
        },
        
        getCurrentLocation: function() {
            return window.location.href.split('?')[0].split('#')[0];
        }
    });

    $.views.tags({ 
        title: function(data, renderDate) {
            data.renderDate = renderDate == null || renderDate === true;
            return $.render["title-edit"](data);
        } 
    });

});