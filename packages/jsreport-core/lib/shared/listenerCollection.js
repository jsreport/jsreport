
module.exports = function createListenerCollection (_name) {
  const name = _name != null ? `${_name}` : 'Anonymous'
  return new ListenerCollection(name)
}

class ListenerCollection {
  constructor (name) {
    this._name = name
    this._listeners = []
    this._pre = []
    this._post = []
    this._postFail = []
  }

  /**
   * Add listener cb at the end of the current chain.
   * @param {String} key
   * @param {Object|Function} context
   * @param {Function} listener
   */
  add (key, context, listener) {
    const fn = listener || context
    const _context = listener === null ? this : context

    this._listeners.push({
      key: key,
      fn,
      context: _context
    })
  }

  /**
   * Add the listener callback to the particular position in the chain.
   * The position is specified by the index in the array or a condition
   * Example
   * listeners.insert({ pre: "another", post: "another2" }, "foo", this, function() {... });
   *
   * @param {Number|Object} indexOrCondition
   * @param {String} key
   * @param {Object} context
   * @param {Function} listener
   */
  insert (indexOrCondition, key, context, listener) {
    const listenerOpts = {
      key: key,
      fn: listener || context,
      context: listener === null ? this : context
    }

    if (!isNaN(indexOrCondition)) {
      return this._listeners.splice(indexOrCondition, 0, listenerOpts)
    }

    let afterInsertIndex = null
    let beforeInsertIndex = null

    for (let i = 0; i < this._listeners.length; i++) {
      if (this._listeners[i].key === indexOrCondition.after) {
        afterInsertIndex = i + 1
      }

      if (this._listeners[i].key === indexOrCondition.before) {
        beforeInsertIndex = i
      }
    }

    const index = afterInsertIndex !== null
      ? afterInsertIndex
      : (beforeInsertIndex !== null ? beforeInsertIndex : this._listeners.length)

    this._listeners.splice(index, 0, listenerOpts)
  }

  /**
   * Remove the listener specified by its key from the collection
   * @param {String} key
   */
  remove (key) {
    this._listeners = this._listeners.filter((l) => {
      return l.key !== key
    })
  }

  /* Add hook that will be executed before actual listener */
  pre (fn) {
    this._pre.push(fn)
  }

  /* Add hook that will be executed after actual listener */
  post (fn) {
    this._post.push(fn)
  }

  /* Add hook that will be executed after actual listener when execution will fail */
  postFail (fn) {
    this._postFail.push(fn)
  }

  /**
   * Fires listeners and returns value composed from all boolean results into the single bool
   * @returns {Promise<Boolean>}
   */
  async fireAndJoinResults (...args) {
    const results = await this.fire(...args)

    const successes = results.filter((r) => {
      return r === true
    })

    const failures = results.filter((r) => {
      return r === false
    })

    const dontCares = results.filter((r) => {
      return r === null || r === undefined
    })

    if (successes.length && (successes.length + dontCares.length === results.length)) {
      // override pass
      return true
    }

    if (failures.length && (failures.length + dontCares.length === results.length)) {
      return false
    }

    if (dontCares.length === results.length) {
      return null
    }

    return true
  }

  /**
   * Fire registered listeners in sequence and returns a promise containing wrapping an array of all
   * individual results.
   * The parameters passed to the fire are forwarded in the same order to the listeners.
   * @returns {Promise<U>}
   */
  async fire (...args) {
    const self = this

    const applyHook = function applyHook (l, hookArrayName, outerArgs) {
      self[hookArrayName].forEach((p) => {
        p.apply(l, outerArgs)
      })
    }

    const results = []

    for (const l of this._listeners) {
      const currentArgs = [...args]
      applyHook(l, '_pre', currentArgs)

      try {
        const val = await l.fn.apply(l.context, currentArgs)
        applyHook(l, '_post', currentArgs)
        results.push(val)
      } catch (e) {
        currentArgs.unshift(e)
        applyHook(l, '_postFail', currentArgs)
        throw e
      }
    }

    return results
  }
}
