var Q = require("q"),
    _ = require("underscore"),
    passwordHash = require('password-hash');
    require("odata-server");

module.exports = Multitenancy = function() {
    $data.Entity.extend("$entity.Tenant", {
        _id: { type: "id", key: true, computed: true, nullable: false },
        email: { type: "string" },
        name: { type: "string" },
        password: { type: "string" },
    });

    $data.EntityContext.extend("$entity.TenantContext", {
        tenants: { type: $data.EntitySet, elementType: $entity.Tenant }
    });

    var serverOptions = {
        'auto_reconnect': true,
        'poolSize': 50
    };
    
    this.context = new $entity.TenantContext({ name: "mongoDB", databaseName: "root", address: "localhost", port: 27017, serverOptions: serverOptions });
    this._tenantsCache = [];
};

Multitenancy.prototype.findTenants = function() {
    var self = this;
    return this.context.tenants.toArray().then(function(tenants) {
        tenants.forEach(function(t) {
            self._tenantsCache[t.email] = t;
        });
        
        return Q(tenants);
    });
};

Multitenancy.prototype.findTenant = function(email) {
    return this._tenantsCache[email];
};

Multitenancy.prototype.findTenantByName = function(name) {
    return _.findWhere(_.values(this._tenantsCache), { "name": name });
};


Multitenancy.prototype.registerTenant = function(email, name, password) {
    var tenant = new $entity.Tenant({
        email: email,
        password: passwordHash.generate(password),
        name: name
    });

    this._tenantsCache[email] = tenant;
    this.context.tenants.add(tenant);
     
    return this.context.saveChanges().then(function() {
        return Q(tenant);
    });
};
    
Multitenancy.prototype.authenticate = function(username, password) {
    var tenant = this._tenantsCache[username];

    return (tenant != null && passwordHash.verify(password, tenant.password)) ? tenant : null;
};