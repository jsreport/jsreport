const Semaphore = require('semaphore-async-await').default

module.exports = function createLock (parallelLimit) {
  return new Semaphore(parallelLimit ?? 1)
}
