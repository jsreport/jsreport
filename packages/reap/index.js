
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('reap');
var Batch = require('batch');
var path = require('path');
var resolve = path.resolve;
var fs = require('fs');
var ms = require('ms');

/**
 * Expose `Reaper`.
 */

module.exports = Reaper;

/**
 * Initialize a new `Reaper` with the given `opts`.
 *
 * - `concurrency` stat() concurrency
 * - `threshold` number in milliseconds
 *
 * @param {Object} [opts]
 * @api public
 */

function Reaper(opts) {
  opts = opts || {};
  this.dirs = [];
  this._filter = function(file, fn){ fn(true) };
  this.concurrency = opts.concurrency || 10;
  this.threshold = opts.threshold || ms('30 minutes');
  debug('threshold %s', this.threshold);
}

/**
 * Inherit from `Emitter.prototype`.
 */

Reaper.prototype.__proto__ = Emitter.prototype;

/**
 * Check if `file` is old.
 *
 * @param {String} file
 * @param {Function} fn
 * @api public
 */

Reaper.prototype.old = function(file, fn){
  var threshold = this.threshold;
  fs.stat(file, function(err, s){
    if (err) return fn(err);
    var d = new Date - s.mtime;
    debug('%s age: %s', file, ms(d));
    fn(null, d > threshold, s);
  });
};

/**
 * Mark `dir` for watching.
 *
 * @param {String} dir
 * @api public
 */

Reaper.prototype.watch = function(dir){
  this.dirs.push(dir);
};

/**
 * Set the filter `fn` to determine which files to reap
 *
 * @param {Function} fn
 */

Reaper.prototype.filter = function(fn){
  this._filter = fn;
};

/**
 * Start reaper and invoke `fn(err, files)` when completed.
 *
 * @param {Function} fn
 * @api public
 */

Reaper.prototype.start = function(fn){
  var self = this;
  var batch = new Batch;

  batch.concurrency(10);

  this.dirs.forEach(function(dir){
    var files = fs.readdirSync(dir);
    debug('dir %s has %s files', dir, files.length);
    files.forEach(function(file){
      batch.push(function(done){
        file = resolve(dir, file);
        self.old(file, function(err, old, s){
          if (err) return done(err);
          if (!old) return done();
          if (!s.isFile()) return done();
          s.path = file;
          self._filter(s, function(unlink){
            if (!unlink) return done();
            debug('unlink %s', file);
            self.emit('remove', s);
            fs.unlink(file, function(err){
              done(err, s);
            });
          });
        });
      });
    });
  });

  batch.end(function(err, files){
    if (err) return fn(err);
    fn(null, files.filter(empty));
  });
};

/**
 * Filter undefineds.
 */

function empty(f) {
  return null != f;
}
