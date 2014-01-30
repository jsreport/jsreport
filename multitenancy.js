var Q = require("q"),
    _ = require("underscore"),
    passwordHash = require('password-hash');
    require("odata-server");

module.exports = Multitenancy = function() {
    $data.Entity.extend("$entity.Tenant", {
        _id: { type: "id", key: true, computed: true, nullable: false },
        createdOn: { type: "date" },
        lastLogin: { type: "date" },
        email: { type: "string" },
        name: { type: "string" },
        password: { type: "string" },
    });

    $data.EntityContext.extend("$entity.TenantContext", {
        tenants: { type: $data.EntitySet, elementType: $entity.Tenant }
    });
    
    this._tenantsCache = [];
};

Multitenancy.prototype.findTenants = function() {
    var self = this;
    
    return this._createContext().tenants.toArray().then(function(tenants) {
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
    var context = this._createContext();
    var tenant = new $entity.Tenant({
        email: email,
        password: passwordHash.generate(password),
        createdOn: new Date(), 
        name: name
    });

    this._tenantsCache[email] = tenant;
    context.tenants.add(tenant);
     
    return context.saveChanges().then(function() {
        return Q(tenant);
    });
};
    
Multitenancy.prototype.authenticate = function(username, password) {
    var tenant = this._tenantsCache[username];

    if (tenant == null)
        return null;

    var context = this._createContext();
    context.attach(tenant);
    tenant.lastLogin = new Date();
    context.saveChanges();

    return (passwordHash.verify(password, tenant.password)) ? tenant : null;
};

Multitenancy.prototype._createContext = function() {
    return new $entity.TenantContext({ name: "mongoDB", databaseName: "root", address: "localhost", port: 27017, 
        serverOptions: {'auto_reconnect': true,'poolSize': 50} });
};