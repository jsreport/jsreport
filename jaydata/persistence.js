/**
 * Handle every persistence-related task
 * The interface Datastore expects to be implemented is
 * * Persistence.loadDatabase(callback) and callback has signature err
 * * Persistence.persistNewState(newDocs, callback) where newDocs is an array of documents and callback has signature err
 */

var fs = require('fs')
  , path = require('path')
  , model = require('nedb/lib/model.js')
  , async = require('async')
  , mkdirp = require('mkdirp')
  , customUtils = require('nedb/lib/customUtils.js')
  , Index = require('nedb/lib/indexes.js')
  ;


/**
 * Create a new Persistence object for database options.db
 * @param {Datastore} options.db
 * @param {Boolean} options.nodeWebkitAppName Optional, specify the name of your NW app if you want options.filename to be relative to the directory where
 *                                            Node Webkit stores application data such as cookies and local storage (the best place to store data in my opinion)
 */
function Persistence (options) {
  this.db = options.db;
  this.inMemoryOnly = this.db.inMemoryOnly;
  this.directoryName = this.db.filename;
   

  // For NW apps, store data in the same directory where NW stores application data
  if (this.directoryName && options.nodeWebkitAppName) {
    console.log("==================================================================");
    console.log("WARNING: The nodeWebkitAppName option is deprecated");
    console.log("To get the path to the directory where Node Webkit stores the data");
    console.log("for your app, use the internal nw.gui module like this");
    console.log("require('nw.gui').App.dataPath");
    console.log("See https://github.com/rogerwang/node-webkit/issues/500");
    console.log("==================================================================");
    this.directoryName = Persistence.getNWAppFilename(options.getNWAppDirectoryName, this.directoryName);
  }

  Persistence.ensureDirectoryExists(this.directoryName);
};

/**
 * Check if a directory exists and create it on the fly if it is not the case
 * cb is optional, signature: err
 */
Persistence.ensureDirectoryExists = function (dir, cb) {
  var callback = cb || function () {}
    ;

  mkdirp(dir, function (err) { return callback(err); });
};

Persistence.prototype.fileName = function (doc) {
    return path.join(this.directoryName, doc._id);
};



/**
 * Return the path the datafile if the given filename is relative to the directory where Node Webkit stores
 * data for this application. Probably the best place to store data
 */
Persistence.getNWAppDirectoryName = function (appName, relativeFilename) {
  var home;

  switch (process.platform) {
    case 'win32':
    case 'win64':
      home = process.env.LOCALAPPDATA || process.env.APPDATA;
      if (!home) { throw "Couldn't find the base application data folder"; }
      home = path.join(home, appName);
      break;
    case 'darwin':
      home = process.env.HOME;
      if (!home) { throw "Couldn't find the base application data directory"; }
      home = path.join(home, 'Library', 'Application Support', appName);
      break;
    case 'linux':
      home = process.env.HOME;
      if (!home) { throw "Couldn't find the base application data directory"; }
      home = path.join(home, '.config', appName);
      break;
    default:
      throw "Can't use the Node Webkit relative path for platform " + process.platform;
      break;
  }

  return path.join(home, 'nedb-data', relativeFilename);
}


/**
 * Persist new state for the given newDocs (can be insertion, update or removal)
 * Use an append-only format
 * @param {Array} newDocs Can be empty if no doc was updated/removed
 * @param {Function} cb Optional, signature: err
 */
Persistence.prototype.persistNewState = function (newDocs, cb) {
   
  var self = this
    , toPersist = ''
    , callback = cb || function () {}
    ;    

  // In-memory only datastore
  if (self.inMemoryOnly) { return callback(null); }

  async.each(newDocs, function (doc, cb) {
      if (doc.$$deleted) 
          return fs.unlink(self.fileName(doc), cb);

      fs.writeFile(self.fileName(doc), model.serialize(doc), cb);
  }, callback); 
};


/**
 * From a database's raw data, return the corresponding
 * machine understandable collection
 */
Persistence.treatRawData = function (rawData) {
  var data = rawData.split('\n')
    , dataById = {}
    , tdata = []
    , i
    , indexes = {}
    ;

  for (i = 0; i < data.length; i += 1) {
    var doc;

    try {
      doc = model.deserialize(data[i]);
      if (doc._id) {
        if (doc.$$deleted === true) {
          delete dataById[doc._id];
        } else {
          dataById[doc._id] = doc;
        }
      } else if (doc.$$indexCreated && doc.$$indexCreated.fieldName != undefined) {
        indexes[doc.$$indexCreated.fieldName] = doc.$$indexCreated;
      } else if (typeof doc.$$indexRemoved === "string") {
        delete indexes[doc.$$indexRemoved];
      }
    } catch (e) {
    }
  }

  Object.keys(dataById).forEach(function (k) {
    tdata.push(dataById[k]);
  });

  return { data: tdata, indexes: indexes };
};



/**
 * Load the database
 * 1) Create all indexes
 * 2) Insert all data
 * 3) Compact the database
 * This means pulling data out of the data file or creating it if it doesn't exist
 * Also, all data is persisted right away, which has the effect of compacting the database file
 * This operation is very quick at startup for a big collection (60ms for ~10k docs)
 * @param {Function} cb Optional callback, signature: err
 */
Persistence.prototype.loadDatabase = function (cb) {
  var callback = cb || function () {}
    , self = this
    ;

  self.db.resetIndexes();

  // In-memory only datastore
  if (self.inMemoryOnly) { return callback(null); }

  async.waterfall([
    function (cb) {
        Persistence.ensureDirectoryExists(path.dirname(self.directoryName), function (err) {
             fs.readdir(self.directoryName, function (err, files) {
                    if (err) { return cb(err); }

                    var filesContent = "";
                    async.each(files, function (filename, cb) {
                        fs.readFile(path.join(self.directoryName, filename), 'utf8', function (err, rawData) {
                            if (err) { return cb(err); }

                            filesContent += rawData + "\n";
                            cb(null);
                        });
                    }, function (err) {
                        if (err) { return cb(err); }

                        var treatedData = Persistence.treatRawData(filesContent);
                        // Recreate all indexes in the datafile
                        Object.keys(treatedData.indexes).forEach(function (key) {
                            self.db.indexes[key] = new Index(treatedData.indexes[key]);
                        });

                        // Fill cached database (i.e. all indexes) with data
                        try {
                            self.db.resetIndexes(treatedData.data);
                        } catch (e) {
                            self.db.resetIndexes();   // Rollback any index which didn't fail
                            return cb(e);
                        }
                        
                        cb(null);                     
                    });
                });       
        })
    }], function (err) {
       if (err) { return callback(err); }

       self.db.executor.processBuffer();
       return callback(null);
     });
};


// Interface
module.exports = Persistence;
