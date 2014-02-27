/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["async", "underscore"], function(async, _) {
    var ListenerCollection = function () {
        this._listeners = [];
    };

    ListenerCollection.prototype.add = function (context, listener) {
        this._listeners.push({
            fn: listener || context,
            context: listener == null ? this : context
        });
    };
    
    ListenerCollection.prototype.fire = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        args.pop();
        async.forEachSeries(this._listeners, function (l, next) {
            var currentArgs = args.slice(0);
            currentArgs.push(next);
            l.fn.apply(l.context, currentArgs);

        }, arguments[arguments.length - 1]);
    };

    return ListenerCollection;
});

