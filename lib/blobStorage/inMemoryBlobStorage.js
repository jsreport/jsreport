var stream = require('stream');

var InMemoryBlobStorage = module.exports = function(options) {
    this.storage = {};
};

InMemoryBlobStorage.prototype.write = function (blobName, buffer, cb) {
    this.storage[blobName] = buffer.toString();

    cb(null, blobName);
};

InMemoryBlobStorage.prototype.read  = function (blobName, cb) {
    blobName = blobName + "";

    var s = new stream.Readable();
    s._read = function noop() {};
    s.push(this.storage[blobName]);
    s.push(null);

    cb(null, s);
};

module.exports = InMemoryBlobStorage;