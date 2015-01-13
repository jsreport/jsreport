/*! 
 * Copyright(c) 2014 Jan Blaha
 *
 * ListenerCollection can hold array of listeners and fire them.
 * Each listener needs to have a key.
 */ 

var async = require("async"),
    _ = require("underscore"),
    q = require("q");


var ListenerCollection = module.exports = function() {
    this._listeners = [];
    this._pre = [];
    this._post = [];
    this._postFail = [];
};

ListenerCollection.prototype.add = function( key, context, listener) {
    this._listeners.push({
        key: key,
        fn: listener || context,
        context: listener === null ? this : context
    });
};

ListenerCollection.prototype.insert = function(index, key, context, listener) {
    this._listeners.splice(index, 0, {
        key: key,
        fn: listener || context,
        context: listener === null ? this : context
    });
};

ListenerCollection.prototype.remove = function(key) {
    this._listeners = _.without(this._listeners, _.findWhere(this._listeners, { key: key }));
};


/* add hook that will be executed before actual listener */
ListenerCollection.prototype.pre = function(fn) {
    this._pre.push(fn);
};

/* add hook that will be executed after actual listener */
ListenerCollection.prototype.post = function(fn) {
    this._post.push(fn);
};

/* add hook that will be executed after actual listener when execution will fail */
ListenerCollection.prototype.postFail = function(fn) {
    this._postFail.push(fn);
};

ListenerCollection.prototype.fireAndJoinResults = function() {
    return this.fire.apply(this, arguments).then(function(results) {
        var successes = results.filter(function (r) {
            return r === true;
        });

        var failures = results.filter(function (r) {
            return r === false;
        });

        var dontCares = results.filter(function (r) {
            return r === null || r === undefined;
        });

        if (successes.length && (successes.length + dontCares.length === results.length)) {
            //overrided pass
            return true;
        }

        if (failures.length && (failures.length + dontCares.length === results.length)) {
            return false;
        }

        if (dontCares.length === results.length)
            return null;

        return true;
    });
};


ListenerCollection.prototype.fire = function() {
    var self = this;

    var args = Array.prototype.slice.call(arguments, 0);

    var usePromises = args.length === 0 || !_.isFunction(args[args.length - 1]);

    function mapSeries(arr, iterator) {
        // create a empty promise to start our series (so we can use `then`)
        var currentPromise = q();
        var promises = arr.map(function(el) {
            return (currentPromise = currentPromise.then(function() {
                // execute the next function after the previous has resolved successfully
                return iterator(el);
            }));
        });
        // group the results and return the group promise
        return q.all(promises);
    }


    function applyHook(l, hookArrayNane, outerArgs) {
        self[hookArrayNane].forEach(function(p) {
            p.apply(l, outerArgs);
        });
    }

    if (usePromises) {
        var results = [];
        return mapSeries(this._listeners, function(l) {
            var currentArgs = args.slice(0);
            applyHook(l,"_pre", currentArgs);

            try {
                var valOrPromise = l.fn.apply(l.context, currentArgs);
                return q.when(valOrPromise, function(val) {
                    applyHook(l, "_post", currentArgs);
                    results.push(val);
                    return q(val);
                }, function(err) {
                    currentArgs.unshift(err);
                    applyHook(l, "_postFail", currentArgs);
                    return q.reject(err);
                });
            }
            catch (e) {
                currentArgs.unshift(e);
                applyHook(l, "_postFail", currentArgs);
                return q.reject(e);
            }

        }).then(function() {
            return results;
        });
    }

    //remove callback
    args.pop();

    return async.forEachSeries(this._listeners, function(l, next) {
        var currentArgs = args.slice(0);
        currentArgs.push(next);
        l.fn.apply(l.context, currentArgs);

    }, arguments[arguments.length - 1]);
};