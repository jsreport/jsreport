module.exports = {
    cookieSession: {
        key: 'jsreport.sid',
        secret: 'dasd321as56d1sd5s61vdv32',
        cookie: { domain: 'local.net' }
    },
    certificate: {
        key: 'config/jsreport.net.key',    
        cert: 'config/jsreport.net.cert'
    },
    connectionString: { name: "mongoDB", address: "localhost", port: 27017 },
    extensions: ["express", "templates", "html", "phantom", "fop", "scripts", "data", "images", "examples", "statistics", "reports"],
    mode: "multitenant",
    port: 3000,
    httpPort: 4000
}