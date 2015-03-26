var options = { };
options.rootDirectory = require("path").join(__dirname, "../");
require("./bootstrapper.js")(options).start();