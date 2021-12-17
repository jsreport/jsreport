const path = require('path')
const fs = require('fs')
const execSync = require('child_process').execSync

// ensuring we install oidc-provider
if (!fs.existsSync(path.join(__dirname, 'node_modules/oidc-provider'))) {
  execSync('npm install --no-package-lock', { stdio: [0, 1, 2], cwd: __dirname })
}

const createOIDCServer = require('./authServer')

createOIDCServer({
  // we need to use custom ISSUER in case we proxy or expose jsreport at a custom hostname
  // for example the internal server is localhost:5000 but we can use ngrok to expose it
  // and the final public url will be different like "http://1eec-2001-1388-144f-741b-18b4-88d-f9ec-e55e.ngrok.io"
  // in that case we need to use that url as the issuer for the jwt validation to pass correctly
  issuer: process.env.ISSUER || 'http://localhost:5000',
  port: 5000,
  studioClient: {
    clientId: 'jsreport-studio',
    clientSecret: 'secret',
    redirectUri: 'http://localhost:5488/auth-server/callback'
  },
  apiResource: {
    clientId: 'jsreport-api',
    clientSecret: 'secret'
  }
})
