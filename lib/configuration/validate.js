
var validateCluster = function(config) {
    if (config.cluster !== undefined && config.connectionString.name === "neDB" && (config.cluster.enabled || config.cluster.enabled === undefined))
        throw new Error("Clustering is not supported together with neDB data store. Disable clustering or use mongodb as data store");
};

var validateConnectionString = function(config) {
    if (!config.connectionString)
        throw new Error("connectionString option must be provided");

    if (!config.connectionString.name)
        throw new Error("connectionString.name must be filled");
};

module.exports = function(config) {
    validateCluster(config);
    validateConnectionString(config);
};
