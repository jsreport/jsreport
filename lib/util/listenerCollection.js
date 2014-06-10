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

ListenerCollection.prototype.add = function(key, context, listener) {
    this._listeners.push({
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

        return mapSeries(this._listeners, function(l) {
            var currentArgs = args.slice(0);
            applyHook(l,"_pre", currentArgs);
            return q.when(l.fn.apply(l.context, currentArgs), function(val) {
                applyHook(l, "_post", currentArgs);
                return q(val);
            }, function(err) {
                currentArgs.unshift(err);
                applyHook(l, "_postFail", currentArgs);
                return q.reject(err);
            });
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