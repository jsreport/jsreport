module.exports = ({ data, uuid, worker }) => {
  return {
    data,
    worker,
    callback (resp) {
      return new Promise((resolve, reject) => {
        this._resolve(resp)
        this._resolve = resolve
        this._reject = reject
      })
    },
    process (execPromiseFn) {
      return new Promise((resolve, reject) => {
        this._resolve = resolve
        this._reject = reject
        execPromiseFn().then((d) => {
          this._resolve(d)
        }).catch((e) => {
          this._reject(e)
        })
      })
    },
    processCallbackResponse ({ data }) {
      return new Promise((resolve, reject) => {
        this._resolve(data)
        this._resolve = resolve
        this._reject = reject
      })
    }
  }
}
