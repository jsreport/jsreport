/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define([], function () {

    return {
        get: function(url) {
            return $.ajax({
                type: "GET",
                dataType: 'json',
                url: url,
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