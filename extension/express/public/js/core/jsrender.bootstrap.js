define(["jquery", "jsrender", "core/utils"], function ($, foo, Utils) {
    
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
            
             getMode: function() {
                return require("app").settings.playgroundMode;
            },
            
            getTenant: function() {
                return require("app").settings.tenant;
            },
            
            getServerUrl: function() {
                return require("app").serverUrl;
            },
            
            getRandom: function() {
                return new Date().getTime();
            }
        });
 
});

