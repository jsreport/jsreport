var stream = require('stream');

var InMemoryBlobStorage = module.exports = function(options) {
    this.storage = {};
};

InMemoryBlobStorage.prototype.write = function (blobName, buffer, cb) {
    this.storage[blobName] = buffer;

    cb(null, blobName);
};

InMemoryBlobStorage.prototype.read  = function (blobName, cb) {
    blobName = blobName + "";

    var s = new stream.Readable();
    s._read = function noop() {};
    s.push(this.storage[blobName]);
    s.push(null);
    console.log(this.storage[blobName]);
    cb(null, s);
};

module.exports = InMemoryBlobStorage;