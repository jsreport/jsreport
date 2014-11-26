module.exports = function(options) {
    if (!options.blobStorage)
        return new (require("./inMemoryBlobStorage.js"))();

    if (options.blobStorage === "fileSystem")
        return new (require("./fileSystemBlobStorage.js"))(options);

    if (options.blobStorage === "gridFS") {
        return new (require("./gridFSBlobStorage.js"))(options.connectionString);
    }

    if (options.blobStorage === "inMemory") {
        return new (require("./inMemoryBlobStorage.js"))(options.connectionString);
    }

    throw new Error("Unsupported blob storage " + options.blobStorage);
};
