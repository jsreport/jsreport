var q = require("q");

module.exports = function(stream) {
    var str = '';
    var promise = q.defer();
    stream.on('data', function(response){
        str += response;
    });
    stream.on('end', function(){
        promise.resolve(str);
    });

    return promise.promise;
};
