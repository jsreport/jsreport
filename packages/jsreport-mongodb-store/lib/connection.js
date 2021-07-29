const MongoClient = require('mongodb').MongoClient
const querystring = require('querystring')

const buildConnectionString = function (config) {
  let connectionString = 'mongodb://'

  if (config.username) {
    connectionString += config.username + ':' + config.password + '@'
  }

  if (!Array.isArray(config.address)) {
    config.address = [config.address]
    config.port = [config.port || 27017]
  }

  for (let i = 0; i < config.address.length; i++) {
    connectionString += config.address[i] + ':' + config.port[i] + ','
  }

  connectionString = connectionString.substring(0, connectionString.length - 1)
  connectionString += '/' + (config.authDb || config.databaseName)

  const query = {}
  if (config.replicaSet) {
    query.replicaSet = config.replicaSet
  }

  if (config.ssl === true) {
    query.ssl = true
  }

  if (Object.getOwnPropertyNames(query).length !== 0) {
    connectionString += '?' + querystring.stringify(query)
  }

  return connectionString
}

module.exports = async function (config, logger) {
  const connectionString = config.uri || buildConnectionString(config)

  logger.info('Connecting mongo to ' + connectionString)

  // required for azure - firewall closes idle connections, wee need to set the lower value for timeouts
  const options = {
    auto_reconnect: true,
    keepAlive: 1,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 60000,
    useNewUrlParser: true,
    useUnifiedTopology: true
  }

  if (config.connectOptions) {
    Object.assign(options, config.connectOptions)
  }

  try {
    const db = await MongoClient.connect(connectionString, options)
    logger.info('Connection successful')
    return db
  } catch (err) {
    logger.error('Connection failed ' + err.stack)
    throw err
  }
}
