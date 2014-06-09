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

        getTenant: function() {
            return require("app").settings.tenant;
        },

        getServerUrl: function() {
            return require("app").serverUrl;
        },

        getRandom: function() {
            return new Date().getTime();
        },
        
        getCurrentLocation: function() {
            return window.location.protocol + "//" + window.location.host + "/";
        },
            
    });

    $.views.tags({ 
        title: function(data, renderDate) {
            data.renderDate = renderDate == null || renderDate === true;
            return $.render["title-edit"](data);
        } 
    });

});