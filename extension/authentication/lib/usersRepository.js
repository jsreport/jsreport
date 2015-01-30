var passwordHash = require('password-hash'),
    shortid = require("shortid"),
    q = require("q");

function UsersRepository(reporter) {
    var self = this;
    this.reporter = reporter;

    var userAttributes = {
        _id: {type: "id", key: true, computed: true, nullable: false},
        shortid: {type: "string"},
        username: {type: "string"},
        password: {type: "string"}
    };


    this.UserType = this.reporter.dataProvider.createEntityType("UserType", userAttributes);
    var usersSet = this.reporter.dataProvider.registerEntitySet("users", this.UserType, { shared: true, tableOptions: {humanReadableKeys: ["shortid"]}});

    usersSet.beforeCreateListeners.add("repository", function(key, items) {
        var user = items[0];

        return self.validate(user);
    });

    this.UserType.addEventListener("beforeCreate", function(args, entity) {
        if (!entity.shortid)
            entity.shortid = shortid.generate();

        entity.password = passwordHash.generate(entity.password);
    });
}

UsersRepository.prototype.validate = function(user) {
    return this.find(user.username).then(function(user) {
        if (user) {
            process.domain.req.customError = new Error("User already exists");
            return q.reject(process.domain.req.customError);
        }

        return true;
    });
};


UsersRepository.prototype.authenticate = function(username, password) {
    return this.reporter.dataProvider.startContext().then(function(context) {
        context.skipAuthorization = true;
        return context.users.filter(function(u) { return u.username === this.username; }, { username : username}).toArray().then(function(users) {
            if (users.length !== 1 || !passwordHash.verify(password, users[0].password))
                return null;

            return users[0];
        });
    });
};

UsersRepository.prototype.find = function(username) {
    return this.reporter.dataProvider.startContext().then(function(context) {
        context.skipAuthorization = true;
        return context.users.filter(function(u) { return u.username === this.username; }, { username : username}).toArray().then(function(users) {
            if (users.length !== 1)
                return null;

            return users[0];
        });
    });
};

UsersRepository.prototype.changePassword = function(currentUser, shortid, oldPassword, newPassword) {
    return this.reporter.dataProvider.startContext().then(function(context) {
        return context.users.single(function(u) { return u.shortid === this.shortid; }, { shortid : shortid}).then(function(user) {
            if (!currentUser.isAdmin && !passwordHash.verify(oldPassword, user.password)) {
                return q.reject(new Error("Invalid password"));
            }

            context.users.attach(user);
            user.password = passwordHash.generate(newPassword);

            return context.saveChanges();
        });
    });
};
module.exports = UsersRepository;
