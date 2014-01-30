{
    
    "getSubTotal": function (data) {
        var result = 0;
        data.items.forEach(function (i) { result += i.price * i.quantity; });

        return result;
    },

    "getTotal": function(data) {
        var result = 0;
        data.items.forEach(function (i) { result += i.price * i.quantity; });

        return result * 0.95;
    },

    "getTaxes": function (data) {
         var result = 0;
        data.items.forEach(function (i) { result += i.price * i.quantity; });

        return result * 0.05;
    }
}