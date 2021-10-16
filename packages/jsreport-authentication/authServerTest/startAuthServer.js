const path = require('path')
const fs = require('fs')
const execSync = require('child_process').execSync

// ensuring we install oidc-provider
if (!fs.existsSync(path.join(__dirname, 'node_modules/oidc-provider'))) {
  execSync('npm install --no-package-lock', { stdio: [0, 1, 2], cwd: __dirname })
}

const createOIDCServer = require('./authServer')

createOIDCServer({
  issuer: 'http://localhost:5000',
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
