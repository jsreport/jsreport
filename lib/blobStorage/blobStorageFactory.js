/*!
 * Copyright(c) 2015 Jan Blaha
 *
 * Creates the right blob storage implementation based on provided options.blobStorag
 */

module.exports = function(reporter) {
    if (reporter.blobStorage) {
        return reporter.blobStorage;
    }

    if (!reporter.options.blobStorage || reporter.options.blobStorage === "inMemory")
        return new (require("./inMemoryBlobStorage.js"))(reporter.options);

    if (reporter.options.blobStorage === "fileSystem")
        return new (require("./fileSystemBlobStorage.js"))(reporter.options);

    throw new Error("Unsupported blob storage " + reporter.options.blobStorage);
};
