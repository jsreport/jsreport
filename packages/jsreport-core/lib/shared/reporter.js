const EventEmitter = require('events')
const createListenerCollection = require('./listenerCollection')
const Request = require('./request')
const Templates = require('./templates')
const Folders = require('./folders')
const createOrExtendError = require('./createError')
const tempFilesHandler = require('./tempFilesHandler')
const encryption = require('./encryption')
const generateRequestId = require('../shared/generateRequestId')

class Reporter extends EventEmitter {
  constructor (options) {
    super()

    this.options = options || {}
    this.Request = Request

    // since `reporter` instance will be used for other extensions,
    // it will quickly reach the limit of `10` listeners,
    // we increase the limit to Infinity for now,
    // later we should probably design
    // a way to detect possible memory leaks from extensions
    this.setMaxListeners(Infinity)

    const coreVersion = require('../../package.json').version

    this.version = coreVersion
    this.coreVersion = coreVersion

    this.initializeListeners = this.createListenerCollection('initialize')
    this.afterRenderListeners = this.createListenerCollection('afterRender')
    this.renderErrorListeners = this.createListenerCollection('renderError')
    this.beforeRenderListeners = this.createListenerCollection('beforeRender')
    this.closeListeners = this.createListenerCollection('close')
  }

  createListenerCollection (name) {
    return createListenerCollection(name)
  }

  /**
   *  Creates a custom error or extends an existing one
   *
   * @public
   */
  createError (message, options = {}) {
    return createOrExtendError(message, options)
  }

  generateRequestId () {
    return generateRequestId()
  }

  /**
   * @public Ensures that we get the proper report timeout in case when custom timeout per request was enabled
   */
  getReportTimeout (req) {
    const elapsedTime = req.context.startTimestamp ? (new Date().getTime() - req.context.startTimestamp) : 0
    if (
      this.options.enableRequestReportTimeout &&
      req.options != null &&
      req.options.timeout != null
    ) {
      return Math.max(0, req.options.timeout - elapsedTime)
    }

    return Math.max(0, this.options.reportTimeout - elapsedTime)
  }

  /**
   * Ensures that the jsreport auto-cleanup temp directory (options.tempAutoCleanupDirectory) exists by doing a mkdir call
   *
   * @public
   */
  async ensureTempDirectoryExists () {
    if (this.options.tempAutoCleanupDirectory == null) {
      throw new Error('Can not use ensureTempDirectoryExists when tempAutoCleanupDirectory option is not initialized, make sure to initialize jsreport first using jsreport.init()')
    }

    return tempFilesHandler.ensureTempDirectoryExists(this.options.tempAutoCleanupDirectory)
  }

  /**
   * Reads a file from the jsreport auto-cleanup temp directory (options.tempAutoCleanupDirectory)
   *
   * @public
   */
  async readTempFile (filename, opts) {
    if (this.options.tempAutoCleanupDirectory == null) {
      throw new Error('Can not use readTempFile when tempAutoCleanupDirectory option is not initialized, make sure to initialize jsreport first using jsreport.init()')
    }

    return tempFilesHandler.readTempFile(this.options.tempAutoCleanupDirectory, filename, opts)
  }

  /**
   * Creates a file into the jsreport auto-cleanup temp directory (options.tempAutoCleanupDirectory)
   * ensuring that the directory always exists
   *
   * @public
   */
  async writeTempFile (filenameFn, content, opts) {
    if (this.options.tempAutoCleanupDirectory == null) {
      throw new Error('Can not use writeTempFile when tempAutoCleanupDirectory option is not initialized, make sure to initialize jsreport first using jsreport.init()')
    }

    return tempFilesHandler.writeTempFile(this.options.tempAutoCleanupDirectory, filenameFn, content, opts)
  }

  /**
   * Reads a file as stream from the jsreport auto-cleanup temp directory (options.tempAutoCleanupDirectory)
   *
   * @public
   */
  async readTempFileStream (filename, opts) {
    if (this.options.tempAutoCleanupDirectory == null) {
      throw new Error('Can not use readTempFileStream when tempAutoCleanupDirectory option is not initialized, make sure to initialize jsreport first using jsreport.init()')
    }

    return tempFilesHandler.readTempFileStream(this.options.tempAutoCleanupDirectory, filename, opts)
  }

  /**
   * Creates a file as stream into the jsreport auto-cleanup temp directory (options.tempAutoCleanupDirectory)
   * ensuring that the directory always exists
   *
   * @public
   */
  async writeTempFileStream (filenameFn, opts) {
    if (this.options.tempAutoCleanupDirectory == null) {
      throw new Error('Can not use writeTempFileStream when tempAutoCleanupDirectory option is not initialized, make sure to initialize jsreport first using jsreport.init()')
    }

    return tempFilesHandler.writeTempFileStream(this.options.tempAutoCleanupDirectory, filenameFn, opts)
  }

  async init () {
    this.templates = Templates(this)
    this.folders = Folders(this)
    this.encryption = encryption(this)
  }
}

module.exports = Reporter
