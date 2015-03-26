/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["app"], function (app) {


    return {
        get: function(url) {
            return $.ajax({
                type: "GET",
                dataType: 'json',
                url: app.serverUrl +url,
                converters: {
                    "text json": function(data) {
                        return $.parseJSON(data, true);
                    }
                }
            }).then(function(res) {
                    return res.value;
                });
       }
    }
});