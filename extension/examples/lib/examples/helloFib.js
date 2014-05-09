function fibSequence(size) {
   function fib(n) {
       return (n < 2) ? 1 : (fib(n - 2) + fib(n - 1));
   }
   
   var result = [];
   for (var i = 0; i < size; i++) {
       result.push({ i: i, val: fib(i) });
   }
   
   return result;
}
