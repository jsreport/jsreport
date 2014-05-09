function getSubTotal (data) {
   var result = 0;
   data.items.forEach(function (i) { result += i.price * i.quantity; });

   return result;
 }

function getTotal(data) {
   var result = 0;
   data.items.forEach(function (i) { result += i.price * i.quantity; });

   return result * 0.95;
}

function getTaxes(data) {
   var result = 0;
   data.items.forEach(function (i) { result += i.price * i.quantity; });

   return result * 0.05;
}
