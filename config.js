module.exports = {
    cookieSession: {
        key: 'jsreport.sid',
        secret: 'dasd321as56d1sd5s61vdv32',
        cookie: { domain: 'jsreportonline.net' }
    },
    certificate: {
        key: 'config/jsreport.net.key',    
        cert: 'config/jsreport.net.cert'
    },
    iisnode: true,
    connectionString: { name: "mongoDB", address: "localhost", port: 27017 },
    extensions: ["express", "templates", "html", "phantom-pdf", "fop-pdf", "scripts", "data", "images", "examples", "statistics", "reports", "jsreport-import-export"],
    mode: "multitenant",
    port: process.env.PORT,
}