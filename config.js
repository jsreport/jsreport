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
    useSubDomains: true,
    subdomainsCount: 3,
    connectionString: { name: "mongoDB", address: "localhost", port: 27017, databaseName: "root" },
    extensions: ["express", "templates", "html", "phantom-pdf", "fop-pdf", "scripts", "data", "images", "examples", "statistics", "reports", "jsreport-import-export", "childTemplates"],
    mode: "multitenant",
    port: 3000,
    httpPort: 4000
}