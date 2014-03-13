module.exports = {
    cookieSession: {
        key: 'jsreport.sid',
        secret: 'dasd321as56d1sd5s61vdv32',
        cookie: { domain: 'local.net' }
    },
    certificate: {
        key: 'certificates/jsreport.net.key',    
        cert: 'certificates/jsreport.net.cert'
    },
    connectionString: { name: "mongoDB", address: "localhost", port: 27017 },
    extensions: ["express", "templates", "html", "phantom-pdf", "fop-pdf", "scripts", "data", "images", "examples"],
    mode: "playground",
    port: 3000,
}