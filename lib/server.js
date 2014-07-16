process.on('uncaughtException', function (err) {
    console.log(err);
});

require("./bootstrapper.js")()
    .configure(function (config) {
        config.set("rootDirectory", require("path").join(__dirname, "../"));
    }).start();