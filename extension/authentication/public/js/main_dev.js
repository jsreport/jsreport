define(["app", "underscore", "marionette", "backbone",
        "./user.list.model", "./user.list.view", "./user.list.toolbar.view",
        "./user.model", "./user.detail.view", "./user.detail.toolbar.view", "./user.create.dialog",
        "./user.changePassword.dialog"],
    function (app, _,  Marionette, Backbone, UserListModel, UserListView, UserListToolbarView, UserModel, UserDetailView,
              UserDetailToolbarView, UserCreateDialog, ChangePasswordDialog) {

        if (!app.settings.tenant)
            return;

        app.module("authentication", function (module) {

            module.UsersListModel = UserListModel;

            var Router = Backbone.Router.extend({
                initialize: function () {
                    app.listenTo(app, "user-created", function (model) {
                        window.location.hash = "/extension/users/detail/" + model.get("shortid");
                    });
                },

                routes: {
                    "extension/users/list": "users",
                    "extension/users/detail/:id": "userDetail",
                    "extension/users/detail": "userDetail"
                },

                users: function () {
                    this.navigate("/extension/users/list");

                    var model = new UserListModel();
                    app.layout.showToolbarViewComposition(new UserListView({ collection: model }), new UserListToolbarView({ collection: model }));
                    model.fetch();
                },

                userDetail: function (id) {
                    var model = new UserModel();
                    app.layout.showToolbarViewComposition(new UserDetailView({ model: model }), new UserDetailToolbarView({ model: model }));

                    if (id != null) {
                        model.set("shortid", id);
                        model.fetch();
                    }
                }
            });

            module.router = new Router();

            app.on("create-user", function() {
                var dialog = new UserCreateDialog({ model: new UserModel() });
                app.layout.dialog.show(dialog);
                new UserCreateDialog();
            });


            app.on("menu-render", function (context) {
                if (app.settings.tenant.isAdmin) {
                    context.result += "<li><a href='/#/extension/users/list'>Users</a></li>";
                }
            });

            app.on("user-info-render", function (context) {
                context.result += $.render["user-info"]();

                context.on("after-render", function($el) {
                    $el.find("#changePasswordCommand").click(function() {
                        var dialog = new ChangePasswordDialog({ model: new UserModel(app.settings.tenant) });
                        app.layout.dialog.show(dialog);
                    });
                });
            });

            app.on("menu-actions-render", function (context) {
                if (app.settings.tenant.isAdmin) {
                    context.result += "<li><a id='createUserCommand' class='validate-leaving'>Create User</a></li>";
                    context.on("after-render", function ($el) {
                        $($el).find("#createUserCommand").click(function () {
                            app.trigger("create-user");
                        });
                    });
                }
            });

            app.on("entity-registration", function(context) {
                $data.Class.define("$entity.User", $data.Entity, null, {
                    '_id': { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String'},
                    'shortid': { 'type': 'Edm.String' },
                    'username': { 'type': 'Edm.String' },
                    "password": { type: "Edm.String" }
                }, null);

                $entity.User.prototype.toString = function () {
                    return "User " + (this.username || "");
                };

                context["users"] = { type: $data.EntitySet, elementType: $entity.User };
            });
        });
    });