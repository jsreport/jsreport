const axios = require('axios')

async function doRequest (options = {}) {
  const requestOpts = {
    ...options,
    url: options.url,
    method: options.method || 'GET',
    timeout: 0,
    maxContentLength: -1,
    maxBodyLength: -1,
    responseType: options.responseType || 'json'
  }

  const response = await axios(requestOpts)

  return response
}

module.exports = doRequest
