/*!
 * Copyright(c) 2015 Jan Blaha
 *
 * Creates the right blob storage implementation based on provided options.blobStorag
 */

module.exports = function(options) {
    if (!options.blobStorage)
        return new (require("./inMemoryBlobStorage.js"))();

    if (options.blobStorage === "fileSystem")
        return new (require("./fileSystemBlobStorage.js"))(options);

    if (options.blobStorage === "gridFS") {
        options.connectionString.logger = options.logger;
        return new (require("./gridFSBlobStorage.js"))(options.connectionString);
    }

    if (options.blobStorage === "inMemory") {
        return new (require("./inMemoryBlobStorage.js"))(options.connectionString);
    }

    throw new Error("Unsupported blob storage " + options.blobStorage);
};
