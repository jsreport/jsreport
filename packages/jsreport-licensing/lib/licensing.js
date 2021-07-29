/* eslint no-path-concat: 0 */
const Promise = require('bluebird')
const path = require('path')
const fs = require('fs')
const readFileAsync = Promise.promisify(fs.readFile)
const writeFileAsync = Promise.promisify(fs.writeFile)
const axios = require('axios')
const hostname = require('os').hostname()
const crypto = require('crypto')
const hostId = crypto.createHash('sha1').update(hostname + __dirname).digest('hex')
const mkdirpAsync = Promise.promisify(require('mkdirp'))

async function verifyLicenseKey (reporter, definition, key) {
  const trimmedKey = key.trim()
  let maskedKey = trimmedKey
  if (maskedKey !== 'trial' && maskedKey !== 'free') {
    if (maskedKey.length < 10) {
      maskedKey = (maskedKey[0] + '').padEnd(maskedKey.length - 1, 'X')
    } else {
      maskedKey = maskedKey.substring(0, 3) + ''.padEnd(maskedKey.length - 6, 'X') + maskedKey.substring(maskedKey.length - 3)
    }
  }
  reporter.logger.info('Verifying license key ' + maskedKey)

  const count = await reporter.documentStore.collection('templates').count({})
  return processVerification(reporter, definition, {
    licenseKey: trimmedKey,
    numberOfTemplates: count,
    version: reporter.version,
    hostId: hostId
  })
}

async function processVerification (reporter, definition, m) {
  const licenseInfoPath = path.join(reporter.options.rootDirectory, 'jsreport.license.json')

  if (!fs.existsSync(licenseInfoPath) || definition.options.useSavedLicenseInfo === false) {
    if (m.licenseKey === 'free' && m.numberOfTemplates <= 5) {
      definition.options.license = definition.options.type = 'free'
      return reporter.logger.info('Using free license')
    }

    // the license info is not verified, need to perform remote check for enterprise licenses
    return verifyInService(reporter, definition, m, licenseInfoPath)
  }

  let l
  try {
    l = await fs.readFileAsync(licenseInfoPath, 'utf8')
  } catch (e) {
    reporter.logger.warn('Failed to read the jsreport.license.json, processing remote license verification')
    return verifyInService(reporter, definition, m, licenseInfoPath)
  }

  const storedLicense = JSON.parse(l)

  // the jsreport.license.json needs to contain valid hash to prevent user's manual file changes
  const hash = storedLicense.securityHash
  delete storedLicense.securityHash
  if (hash !== crypto.createHash('sha1').update(JSON.stringify(storedLicense)).digest('hex')) {
    reporter.logger.warn('License info stored in jsreport.license.json is corrupted, processing remote license verification')
    return verifyInService(reporter, definition, m, licenseInfoPath)
  }

  if (storedLicense.licenseKey !== m.licenseKey) {
    reporter.logger.info('License key being verified and license key stored in jsreport.license.json doesn\'t match, processing remote license verification')

    // the user should be able to perform remote verification and then copy jsreport.license.json with app
    // no need to set somewhere the license key again, because the license key from jsreport.license.json will be used
    if (m.licenseKey === 'free') {
      m.licenseKey = storedLicense.licenseKey
    }

    return verifyInService(reporter, definition, m, licenseInfoPath)
  }

  if (storedLicense.type === 'subscription') {
    if (new Date(storedLicense.expiresOn) < new Date()) {
      reporter.logger.info('License info stored in jsreport.license.json is no longer valid, processing remote license verification')
      return verifyInService(reporter, definition, m, licenseInfoPath)
    }

    definition.options = Object.assign({}, storedLicense)

    // don't expose the licenseKey
    delete definition.options.licenseKey

    return reporter.logger.info('License key for subscription verified against the jsreport.license.json file')
  }

  if (storedLicense.validatedForVersion === reporter.version) {
    definition.options = Object.assign({}, storedLicense)

    // don't expose the licenseKey
    delete definition.options.licenseKey

    return reporter.logger.info('License key for perpetual license verified against jsreport.license.json file')
  } else {
    reporter.logger.info('The already verified instance version stored in jsreport.license.json doesn\'t match with the current jsreport version, processing remote license verification')
    return verifyInService(reporter, definition, m, licenseInfoPath)
  }
}

async function verifyInService (reporter, definition, m, licenseInfoPath) {
  // developers often keeps jsreport instances to auto restart inifinitely
  // in case of invalid license key this bombards constantly our validation server
  // for this case we cache the invalid license keys for short time to avoid this
  const cachedNegativeResponse = await isLicenseKeyStoredInNegativeCache(reporter, m.licenseKey)

  if (cachedNegativeResponse) {
    reporter.logger.debug('The recent negative cache validation was used to stop jsreport')
    reporter.close()
    throw new Error(cachedNegativeResponse)
  }

  return new Promise(async (resolve, reject) => {
    let isDone = false

    function handleFailedVerification () {
      if (isDone) {
        return
      }

      isDone = true

      reporter.logger.info('The licensing server was not reachable during instance startup. The instance now runs in the enterprise mode.')

      definition.options = {
        license: 'enterprise',
        unreachable: true
      }
      resolve()
    }

    // to avoid startup delays we have quite small timeout to perform remote validation
    // in some networks it takes long time to find out that the remote server is actually not reacheble
    const timeout = setTimeout(handleFailedVerification, 3000).unref()

    async function handleResponse (response) {
      if (isDone) {
        return
      }

      clearTimeout(timeout)
      // something went wrong during remote validation, this likely doesn't indicate the wrong license key so we start as with valid license
      if (response == null || response.status !== 200 || response.data == null || !Number.isInteger(response.data.status)) {
        return handleFailedVerification()
      }

      isDone = true
      const body = response.data

      // the remote validator rejected the license key, the jsreport instance should fail to start
      if (body.status === 1) {
        try {
          await writeLicenseKeyToNegativeCache(reporter, m.licenseKey, body.message)
        } finally {
          reporter.close()
          reject(new Error(body.message))
        }
        return
      }

      reporter.logger.info(body.message)

      Object.assign(definition.options, body, {
        validatedForVersion: reporter.version
      })

      // don't expose the licenseKey
      delete definition.options.licenseKey

      // persist the jsreport.license.json only in case of valid enterprise license which is not expiring
      if (body.type !== 'trial' && body.type !== 'free' && definition.options.useSavedLicenseInfo !== false) {
        reporter.logger.info('Storing license verification information to jsreport.license.json')
        definition.options.licenseInfoSaved = true

        const licensingInfo = {
          licenseKey: m.licenseKey,
          validatedForVersion: reporter.version,
          expiresOn: body.expiresOn,
          license: body.license,
          type: body.type,
          paymentType: body.paymentType
        }

        licensingInfo.securityHash = crypto.createHash('sha1').update(JSON.stringify(licensingInfo)).digest('hex')

        try {
          await writeFileAsync(licenseInfoPath, JSON.stringify(licensingInfo, null, 4), 'utf8')
        } catch (e) {
          definition.options.licenseInfoSaved = false
          reporter.logger.warn('Unable to write verified license info to jsreport.license.json, the remote verification will be performed again during the next instance start: ' + e)
        }
      }
      resolve()
    }

    axios({
      method: 'post',
      url: definition.options.licensingServerUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      data: m
    })
      .then(response => handleResponse(response))
      .catch(err => handleFailedVerification(err))
  })
}

async function isLicenseKeyStoredInNegativeCache (reporter, licenseKey) {
  const licenseCacheFile = path.join(reporter.options.tempDirectory, 'licensing', licenseKey + '.json')

  try {
    await mkdirpAsync(path.join(reporter.options.tempDirectory, 'licensing'))
    const t = await readFileAsync(licenseCacheFile, 'utf8')
    var info = JSON.parse(t)

    if (info.version !== reporter.version) {
      return null
    }

    if (new Date(info.lastVerification).getTime() + 60000 < new Date().getTime()) {
      return null
    }

    return info.message
  } catch (e) {
    // the cache file doesn't need to exist, or have wrong permissions...
    // we don't care about it, in that case the remote validation will take place
    return null
  }
}

function writeLicenseKeyToNegativeCache (reporter, licenseKey, message) {
  var info = JSON.stringify({
    message: message,
    version: reporter.version,
    lastVerification: new Date()
  })

  return writeFileAsync(path.join(reporter.options.tempDirectory, 'licensing', licenseKey + '.json'), info).catch(() => { })
}

module.exports = function (reporter, definition) {
  reporter.on('express-configure', (app) => {
    app.post('/api/licensing/trial', (req, res, next) => {
      verifyLicenseKey(reporter, definition, 'free')
        .then(() => res.send({ status: 0 }))
        .catch((e) => {
          reporter.logger.warn('Unable to start trial license', e)
          res.send({ status: 1, message: 'Unable to start trial license, server shutting down: ' + e })
        })
    })
  })

  reporter.initializeListeners.add('licensing', async () => {
    const licenseKeyFromOption = reporter.options['license-key'] || reporter.options['licenseKey']

    if (licenseKeyFromOption) {
      await verifyLicenseKey(reporter, definition, licenseKeyFromOption)
    } else {
      let licenseKeyPath

      if (fs.existsSync(path.join(reporter.options.rootDirectory, 'license-key.txt'))) {
        licenseKeyPath = path.join(reporter.options.rootDirectory, 'license-key.txt')
      }

      if (licenseKeyPath) {
        let key = await readFileAsync(licenseKeyPath, 'utf8')

        if (key.charCodeAt(0) === 0xFEFF) {
          key = key.substring(1)
        }

        await verifyLicenseKey(reporter, definition, key.toString())
      } else {
        await verifyLicenseKey(reporter, definition, 'free')
      }
    }

    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        license: definition.options.license,
        type: definition.options.type,
        pendingExpiration: definition.options.pendingExpiration,
        unreachable: definition.options.unreachable,
        expiresOn: definition.options.expiresOn,
        validatedForVersion: definition.options.validatedForVersion,
        paymentType: definition.options.paymentType
      })
    }
  })
}
