/**
 * jaydata storage provider using nedb
 *
 */

var DataStore = require('nedb'),
    Persistence = require("./persistence.js"),
    mkdirp = require('mkdirp'),
    path = require("path"),
    fs = require("fs"),
    q = require("q");

var db = {};

module.exports = function (dataDirectory) {

    if (!fs.existsSync(dataDirectory)) {
        mkdirp.sync(dataDirectory);
    }

    $C('$data.storageProviders.neDB.neDBProvider', $data.StorageProviderBase, null,
        {
            constructor: function (cfg, ctx) {
                this.context = ctx;

                if (this.context && this.context._buildDbType_generateConvertToFunction && this.buildDbType_generateConvertToFunction) {
                    this.context._buildDbType_generateConvertToFunction = this.buildDbType_generateConvertToFunction;
                }
                if (this.context && this.context._buildDbType_modifyInstanceDefinition && this.buildDbType_modifyInstanceDefinition) {
                    this.context._buildDbType_modifyInstanceDefinition = this.buildDbType_modifyInstanceDefinition;
                }

                this.providerConfiguration = $data.typeSystem.extend({
                    //otherwise jaydata puts there 100
                    //we need more to get all the statistics 24*7*60/5
                    responseLimit: 2016
                }, cfg);
            },

            initializeStore: function (callBack) {
                var self = this;
                callBack = $data.typeSystem.createCallbackSetting(callBack);

                if (self.providerConfiguration.dbCreation === $data.storageProviders.DbCreationType.DropAllExistingTables) {
                    require("../util/util.js").deleteFiles(dataDirectory);
                    db = {};
                    return callBack.success(self.context);
                }

                var sets = Object.keys(self.context._entitySetReferences);

                if (!sets.length) return callBack.success(self.context);

                function load(loadCb) {
                    var toProcess = sets.length;

                    function done(err) {
                        if (err)
                            return callBack.error(err);

                        toProcess--;

                        if (toProcess == 0) {
                            loadCb();
                        }
                    };


                    sets.forEach(function (i) {
                        if (!self.context._entitySetReferences.hasOwnProperty(i)) {
                            return done();
                        }

                        var es = self.context._entitySetReferences[i];
                        var tableName = es.tableName;

                        if (db[tableName] != null) {
                            return done();
                        }

                        db[tableName] = new DataStore({filename: path.join(dataDirectory, tableName), autoload: false});

                        if (es.tableOptions && es.tableOptions.nedbPersistance != "singleFile")
                            db[tableName].persistence = new Persistence({
                                db: db[tableName],
                                keys: es.tableOptions ?
                                    es.tableOptions.humanReadableKeys : null
                            });

                        db[tableName].loadDatabase(done);
                    });
                };

                load(function () {

                    self.fieldConverter.toDb['$data.ObjectID'] = function (id) {
                        return new Buffer(id,
                            'base64').toString('ascii');
                    };

                    self.fieldConverter.toDb['$data.Blob'] = function (blob) {
                        return blob.toString('base64');
                    };

                    callBack.success(self.context);
                });
            },

            _connected: function (oid, prop, prop2, it, association) {
                var ret = false;
                association.ReferentialConstraint.forEach(function (ref) {
                    if (it && ref[prop2] && oid[ref[prop2]] != undefined) ret = JSON.stringify(oid[ref[prop2]]) == JSON.stringify(it[ref[prop]] != undefined ? it[ref[prop]] : it._id);
                });
                return ret;
            },

            _compile: function (query) {
                return new $data.storageProviders.mongoDB.mongoDBCompiler().compile(query);
            },

            getTraceString: function (queryable) {
                return this._compile(queryable);
            },

            executeQuery: function (query, callBack) {

                var self = this;
                callBack = $data.typeSystem.createCallbackSetting(callBack);

                var entitySet = query.context.getEntitySetFromElementType(query.defaultType);
                this._compile(query);

                var collection = db[entitySet.tableName];
                var includes = query.includes && query.includes.length ? query.includes.map(function (it) {
                    //if (it.full){
                    delete it.options.fields;
                    //}
                    return {
                        name: it.name,
                        type: it.type,
                        from: it.from,
                        collection: db[query.context.getEntitySetFromElementType(it.type).tableName],
                        query: it.query || {},
                        options: it.options || {}
                    };
                }) : null;

                query.context = self.context;
                var find = query.find;

                this.context.events.emit("before-query",this, find.query, entitySet);

                var cb = function (error, results) {
                    if (error) {
                        callBack.error(error);
                        return;
                    }
                    if (query.find.filter) {
                        results = results.filter(query.find.filter);
                    }

                    if (query.expression.nodeType === $data.Expressions.ExpressionType.Count || query.expression.nodeType === $data.Expressions.ExpressionType.BatchDelete) {
                        if (results instanceof Array) {
                            query.rawDataList = [
                                {cnt: results.length}
                            ];
                        } else {
                            query.rawDataList = [
                                {cnt: results}
                            ];
                        }
                    } else {
                        query.rawDataList = results;
                    }
                    callBack.success(query);
                };

                var fn = function () {
                    switch (query.expression.nodeType) {
                        case $data.Expressions.ExpressionType.BatchDelete:
                            collection.remove(find.query, {safe: true}, cb);
                            break;
                        case $data.Expressions.ExpressionType.Count:
                            if (!includes || !includes.length) {
                                collection.find(find.query, find.options).count(cb);
                                break;
                            }
                        default:
                            if (find.full) {
                                delete find.options.fields;
                            }
                            var defaultFn = function () {
                                var cursor = collection.find(find.query);

                                if (find.options.sort)
                                    cursor = cursor.sort(find.options.sort);

                                if (find.options.skip)
                                    cursor = cursor.skip(find.options.skip);

                                if (find.options.limit)
                                    cursor = cursor.limit(find.options.limit);

                                cursor.exec(function (error, results) {
                                    if (error) {
                                        callBack.error(error);
                                        return;
                                    }

                                    var fn = function (include) {
                                        include.collection.find({}, function (error, included) {
                                            if (error) {
                                                callBack.error(error);
                                                return;
                                            }

                                            var path = include.name.split('.');
                                            var prop = path[path.length - 1];
                                            var sm = self.context._storageModel.getStorageModel(include.from);

                                            var association = sm.Associations[prop];

                                            var conn = function (res) {
                                                if (association.FromMultiplicity == '0..1' && association.ToMultiplicity == '*') {
                                                    var r = included.filter(function (it) {
                                                        return self._connected(it, association.ToPropertyName, association.To, res, association);
                                                    });
                                                    res[prop] = r;
                                                } else if (association.FromMultiplicity == '*' && association.ToMultiplicity == '0..1') {
                                                    var r = included.filter(function (it) {
                                                        if (res[association.FromPropertyName] === null) return false;
                                                        return self._connected(res, association.FromPropertyName, association.From, it, association);
                                                    })[0];
                                                    res[prop] = r || res[prop];
                                                } else if (association.FromMultiplicity == '1' && association.ToMultiplicity == '0..1') {
                                                    var r = included.filter(function (it) {
                                                        return self._connected(it, association.ToPropertyName, association.To, res, association);
                                                    })[0];
                                                    res[prop] = r || res[prop];
                                                } else if (association.FromMultiplicity == '0..1' && association.ToMultiplicity == '1') {
                                                    var r = included.filter(function (it) {
                                                        return self._connected(res, association.FromPropertyName, association.From, it, association);
                                                    })[0];
                                                    res[prop] = r || res[prop];
                                                }
                                            };

                                            var respath = function (res, path) {
                                                var _conn = true;
                                                for (var j = 0; j < path.length; j++) {
                                                    if (typeof res[path[j]] !== 'undefined') res = res[path[j]];
                                                    if (Array.isArray(res) && res.length) {
                                                        _conn = false;
                                                        for (var k = 0; k < res.length; k++) {
                                                            if (j < path.length - 1) respath(res[k], path.slice(j));
                                                            else conn(res[k]);
                                                        }
                                                    }
                                                    if (!_conn) break;
                                                }
                                                if (_conn) {
                                                    conn(res);
                                                }
                                            };

                                            for (var i = 0; i < results.length; i++) {
                                                respath(results[i], path.slice(0, -1));
                                            }

                                            if (include.options.sort) {
                                                var order = Object.keys(include.options.sort);
                                                var cmp = order.map(function (it) {
                                                    return new Function('it', 'return it.' + it + ';');
                                                });
                                                results.sort(function (a, b) {
                                                    var result;
                                                    for (var i = 0, l = order.length; i < l; i++) {
                                                        result = 0;
                                                        var aVal = cmp[i](a);
                                                        var bVal = cmp[i](b);

                                                        if (include.options.sort[order[i]] == 1)
                                                            result = aVal === bVal ? 0 : (aVal > bVal || bVal === null ? 1 : -1);
                                                        else
                                                            result = aVal === bVal ? 0 : (aVal < bVal || aVal === null ? 1 : -1);

                                                        if (result !== 0) break;

                                                    }
                                                    return result;
                                                });
                                            }

                                            if (includes && includes.length) {
                                                fn(includes.shift());
                                            } else {
                                                cb(error, results);
                                            }
                                        });
                                    };

                                    if (includes && includes.length) {
                                        fn(includes.shift());
                                    } else {
                                        cb(error, results);
                                    }
                                });
                            };
                            if (query.withInlineCount) {
                                collection.count(find.query, function (error, result) {
                                    if (error) {
                                        callBack.error(error);
                                        return;
                                    }
                                    query.__count = result;
                                    defaultFn();
                                });
                            } else defaultFn();
                            break;
                    }
                };

                fn();

            },

            _typeFactory: function (type, value, converter) {
                if ((value && value.$ref && value.$id) || value == null || value == undefined) return value;
                var type = Container.resolveName(type);
                var converterFn = converter ? converter[type] : undefined;
                var result = converter && converter[type] ? converter[type](value) : new (Container.resolveType(type))(value);

                if (result != null && result.initData)
                    return result.initData;

                return result;
            },

            _saveCollections: function (callBack, collections) {
                var self = this;
                var successItems = 0;

                var counterState = 0;
                var counterFn = function (callback) {
                    if (--counterState <= 0) callback();
                }

                var insertFn = function (c, collection) {
                    var docs = [];
                    for (var i = 0; i < c.insertAll.length; i++) {
                        var d = c.insertAll[i];
                        var props = Container.resolveType(d.type).memberDefinitions.getPublicMappedProperties();
                        for (var j = 0; j < props.length; j++) {
                            var p = props[j];
                            if (p.concurrencyMode === $data.ConcurrencyMode.Fixed) {
                                d.data[p.name] = 0;
                            } else if (!p.computed) {
                                if (Container.resolveType(p.type) === $data.Array && p.elementType && Container.resolveType(p.elementType) === $data.ObjectID) {
                                    d.data[p.name] = self._typeFactory(p.type, d.data[p.name], self.fieldConverter.toDb);
                                    var arr = d.data[p.name];
                                    if (arr) {
                                        for (var k = 0; k < arr.length; k++) {
                                            arr[k] = self._typeFactory(p.elementType, arr[k], self.fieldConverter.toDb);
                                        }
                                    }
                                } else {
                                    d.data[p.name] = self._typeFactory(p.type, d.data[p.name], self.fieldConverter.toDb);
                                    if (d.data[p.name] && d.data[p.name].initData) d.data[p.name] = d.data[p.name].initData;
                                }
                            } else {
                                d.data['_id'] = self._typeFactory(p.type, d.data._id, self.fieldConverter.toDb);
                            }
                        }

                        docs.push(d.data);
                    }

                    collection.insert(docs, function (error, result) {
                        if (error) {
                            return callBack.error(error);
                        }

                        for (var k = 0; k < result.length; k++) {
                            var it = result[k];
                            var d = c.insertAll[k];
                            var props = Container.resolveType(d.type).memberDefinitions.getPublicMappedProperties();
                            for (var j = 0; j < props.length; j++) {
                                var p = props[j];
                                if (!p.inverseProperty) {
                                    d.entity[p.name] = self._typeFactory(p.type, it[p.computed ? '_id' : p.name], self.fieldConverter.fromDb);
                                }
                            }
                        }

                        successItems += result.length;

                        if (c.removeAll && c.removeAll.length) {
                            removeFn(c, collection);
                        } else {
                            if (c.updateAll && c.updateAll.length) {
                                updateFn(c, collection);
                            } else {
                                esFn(successItems);
                            }
                        }
                    });
                };

                var updateFn = function (c, collection) {
                    counterState = c.updateAll.length;
                    for (var i = 0; i < c.updateAll.length; i++) {
                        var u = c.updateAll[i];
                        var where = {};

                        var keys = Container.resolveType(u.type).memberDefinitions.getKeyProperties();
                        for (var j = 0; j < keys.length; j++) {
                            var k = keys[j];
                            where[k.computed ? '_id' : k.name] = self.fieldConverter.toDb[Container.resolveName(Container.resolveType(k.type))](u.entity[k.name]);
                        }

                        var set = {};
                        var inc = {};
                        var props = Container.resolveType(u.entity.getType()).memberDefinitions.getPublicMappedProperties().concat(Container.resolveType(u.physicalData.getType()).memberDefinitions.getPublicMappedProperties());
                        for (var j = 0; j < props.length; j++) {
                            var p = props[j];
                            if (u.entity.changedProperties.indexOf(p) >= 0 || (u.physicalData.changedProperties && u.physicalData.changedProperties.indexOf(p) >= 0)) {
                                if (p.concurrencyMode === $data.ConcurrencyMode.Fixed) {
                                    where[p.name] = self._typeFactory(p.type, u.data[p.name], self.fieldConverter.toDb);
                                    if (!set.$inc) set.$inc = {};
                                    set.$inc[p.name] = 1;
                                } else if (!p.computed) {
                                    if (typeof u.data[p.name] === 'undefined') continue;
                                    if (Container.resolveType(p.type) === $data.Array && p.elementType && Container.resolveType(p.elementType) === $data.ObjectID) {
                                        set[p.name] = self._typeFactory(p.type, u.physicalData[p.name], self.fieldConverter.toDb);
                                        var arr = set[p.name];
                                        if (arr) {
                                            for (var k = 0; k < arr.length; k++) {
                                                arr[k] = self._typeFactory(p.elementType, arr[k], self.fieldConverter.toDb);
                                            }
                                        }
                                    } else {
                                        var value = self._typeFactory(p.type, u.physicalData[p.name], self.fieldConverter.toDb);
                                        if (p.increment)
                                            inc[p.name] = value
                                        else
                                            set[p.name] = value;
                                    }
                                }
                            }
                        }

                        var fn = function (u) {
                            collection.update(where, {$set: set, $inc: inc}, function (error, result) {
                                if (error) {
                                    return callBack.error(error);
                                }

                                if (result) {
                                    successItems++;
                                    var props = Container.resolveType(u.type).memberDefinitions.getPublicMappedProperties();
                                    for (var j = 0; j < props.length; j++) {
                                        var p = props[j];
                                        if (p.concurrencyMode === $data.ConcurrencyMode.Fixed) u.entity[p.name]++;
                                    }

                                    counterFn(function () {
                                        esFn(successItems);
                                    });
                                } else {
                                    counterState--;
                                    collection.find({_id: where._id}, function (error, result) {
                                        if (error) {
                                            callBack.error(error);
                                            return;
                                        }

                                        var it = result[0];
                                        var props = Container.resolveType(u.type).memberDefinitions.getPublicMappedProperties();
                                        for (var j = 0; j < props.length; j++) {
                                            var p = props[j];
                                            u.entity[p.name] = self._typeFactory(p.type, it[p.computed ? '_id' : p.name], self.fieldConverter.fromDb);
                                        }

                                        counterFn(function () {
                                            esFn(successItems);
                                        });
                                    });
                                }
                            });
                        };

                        fn(u);
                    }
                };

                var removeFn = function (c, collection) {
                    counterState = c.removeAll.length;
                    for (var i = 0; i < c.removeAll.length; i++) {
                        var r = c.removeAll[i];

                        for (var j in r.data) {
                            if (r.data[j] === undefined || r.data[j] === null) {
                                delete r.data[j];
                            }
                        }

                        var keys = Container.resolveType(r.type).memberDefinitions.getKeyProperties();
                        for (var j = 0; j < keys.length; j++) {
                            var k = keys[j];
                            r.data[k.computed ? '_id' : k.name] = self.fieldConverter.toDb[Container.resolveName(Container.resolveType(k.type))](r.entity[k.name]);
                        }

                        var props = Container.resolveType(r.type).memberDefinitions.getPublicMappedProperties();
                        for (var j = 0; j < props.length; j++) {
                            var p = props[j];
                            if (!p.key) {
                                delete r.data[p.name];
                            }
                        }

                        collection.remove(r.data, {multi: true}, function (error, result) {
                            if (error) {
                                callBack.error(error);
                                return;
                            }

                            if (result) successItems++;
                            else counterState--;

                            counterFn(function () {
                                if (c.updateAll && c.updateAll.length) {
                                    updateFn(c, collection);
                                } else esFn(successItems);
                            });
                        });
                    }
                };

                var keys = Object.keys(collections);
                var readyFn = function (value) {
                    callBack.success(value);
                };


                var esFn = function (value) {
                    if (keys.length) {
                        var es = keys.pop();
                        if (collections.hasOwnProperty(es)) {
                            var c = collections[es];
                            var collection = db[es];
                            if (c.insertAll && c.insertAll.length) {
                                insertFn(c, collection);
                            } else {
                                if (c.removeAll && c.removeAll.length) {
                                    removeFn(c, collection);
                                } else {
                                    if (c.updateAll && c.updateAll.length) {
                                        updateFn(c, collection);
                                    } else {
                                        readyFn(0);
                                    }
                                }
                            }
                        }
                    } else readyFn(value);
                };

                esFn();
            },

            rawUpdate: function (tableName, condition, update, options) {
                if (condition._id) {
                    if (condition._id.$in)
                        condition._id.$in = condition._id.$in.map(this.fieldConverter.toDb['$data.ObjectID']);
                    else
                        condition._id = this.fieldConverter.toDb['$data.ObjectID'](condition._id);
                }
                var defer = q.defer();

                var collection = db[tableName];

                function cb(e, r) {
                    if (e) {
                        return defer.reject(e);
                    }

                    defer.resolve(r);
                };

                if (options)
                    collection.update(condition, update, options, cb);
                else
                    collection.update(condition, update, cb);

                return defer.promise;
            },

            saveChanges: function (callBack, changedItems) {
                var self = this;
                if (changedItems.length) {
                    var independentBlocks = this.buildIndependentBlocks(changedItems);
                    var convertedItems = [];
                    var successCount = 0;
                    var fn = function (block) {
                        var collections = {};
                        for (var i = 0; i < block.length; i++) {
                            convertedItems.push(block[i].data);

                            var es = collections[block[i].entitySet.tableName];
                            if (!es) {
                                es = {};
                                collections[block[i].entitySet.tableName] = es;
                            }

                            var initData = {
                                entity: block[i].data,
                                data: self.save_getInitData(block[i], convertedItems),
                                physicalData: block[i].physicalData,
                                type: Container.resolveName(block[i].data.getType())
                            };
                            switch (block[i].data.entityState) {
                                case $data.EntityState.Unchanged:
                                    continue;
                                    break;
                                case $data.EntityState.Added:
                                    if (!es.insertAll) es.insertAll = [];
                                    es.insertAll.push(initData);
                                    break;
                                case $data.EntityState.Modified:
                                    if (!es.updateAll) es.updateAll = [];
                                    es.updateAll.push(initData);
                                    break;
                                case $data.EntityState.Deleted:
                                    if (!es.removeAll) es.removeAll = [];
                                    es.removeAll.push(initData);
                                    break;
                                default:
                                    Guard.raise(new Exception("Not supported Entity state"));
                            }
                        }

                        self._saveCollections({
                            success: function (cnt) {
                                successCount += cnt;
                                if (independentBlocks.length) {
                                    fn(independentBlocks.shift());
                                } else {
                                    callBack.success(successCount);
                                }
                            },
                            error: callBack.error
                        }, collections);
                    };

                    if (independentBlocks.length) {
                        fn(independentBlocks.shift());
                    }
                } else {
                    callBack.success(0);
                }
            },

            buildDbType_generateConvertToFunction: function (storageModel) {
                var self = this;
                return function (logicalEntity) {
                    var dbInstance = new storageModel.PhysicalType();
                    dbInstance.entityState = logicalEntity.entityState;

                    storageModel.PhysicalType.memberDefinitions.getPublicMappedProperties().forEach(function (property) {
                        dbInstance.initData[property.name] = logicalEntity[property.name];
                    }, this);

                    if (storageModel.Associations) {
                        storageModel.Associations.forEach(function (association) {
                            if ((association.FromMultiplicity == "*" && association.ToMultiplicity == "0..1") || (association.FromMultiplicity == "0..1" && association.ToMultiplicity == "1")) {
                                var complexInstance = logicalEntity[association.FromPropertyName];
                                if (complexInstance !== undefined) {
                                    association.ReferentialConstraint.forEach(function (constrain) {
                                        if (complexInstance !== null) {
                                            dbInstance.initData[association.FromPropertyName] = {
                                                $ref: self._entitySetReferences[association.To].tableName,
                                                $id: self.storageProvider._typeFactory(complexInstance.getType().memberDefinitions.getMember(constrain[association.To]).type, complexInstance[constrain[association.To]], self.storageProvider.fieldConverter.toDb)
                                            };
                                            dbInstance.initData[constrain[association.From]] = self.storageProvider._typeFactory(complexInstance.getType().memberDefinitions.getMember(constrain[association.To]).type, complexInstance[constrain[association.To]], self.storageProvider.fieldConverter.toDb);
                                            dbInstance._setPropertyChanged(dbInstance.getType().memberDefinitions.getMember(constrain[association.From]));
                                        } else {
                                            dbInstance.initData[association.FromPropertyName] = null;
                                            dbInstance.initData[constrain[association.From]] = null;
                                            dbInstance._setPropertyChanged(dbInstance.getType().memberDefinitions.getMember(constrain[association.From]));
                                        }
                                    }, this);
                                }
                            }
                        }, this);
                    }
                    if (storageModel.ComplexTypes) {
                        storageModel.ComplexTypes.forEach(function (cmpType) {
                            var complexInstance = logicalEntity[cmpType.FromPropertyName];
                            dbInstance.initData[cmpType.FromPropertyName] = self.storageProvider._typeFactory(cmpType.ToType, complexInstance, self.storageProvider.fieldConverter.toDb);
                        }, this);
                    }
                    return dbInstance;
                };
            },
            buildDbType_modifyInstanceDefinition: function (instanceDefinition, storageModel) {
                var buildDbType_copyPropertyDefinition = function (propertyDefinition, refProp) {
                    var cPropertyDef;
                    if (refProp) {
                        cPropertyDef = JSON.parse(JSON.stringify(instanceDefinition[refProp]));
                        cPropertyDef.kind = propertyDefinition.kind;
                        cPropertyDef.name = propertyDefinition.name;
                        cPropertyDef.notMapped = false;
                    } else {
                        cPropertyDef = JSON.parse(JSON.stringify(propertyDefinition));
                    }

                    cPropertyDef.dataType = Container.resolveType(propertyDefinition.dataType);
                    cPropertyDef.type = cPropertyDef.dataType;
                    cPropertyDef.key = false;
                    cPropertyDef.computed = false;
                    return cPropertyDef;
                };
                var buildDbType_createConstrain = function (foreignType, dataType, propertyName, prefix) {
                    var constrain = new Object();
                    constrain[foreignType.name] = propertyName;
                    constrain[dataType.name] = prefix + '__' + propertyName;
                    return constrain;
                };

                if (storageModel.Associations) {
                    storageModel.Associations.forEach(function (association) {
                        var addToEntityDef = false;
                        var foreignType = association.FromType;
                        var dataType = association.ToType;
                        var foreignPropName = association.ToPropertyName;

                        association.ReferentialConstraint = association.ReferentialConstraint || [];

                        if ((association.FromMultiplicity == "*" && association.ToMultiplicity == "0..1") || (association.FromMultiplicity == "0..1" && association.ToMultiplicity == "1")) {
                            foreignType = association.ToType;
                            dataType = association.FromType;
                            foreignPropName = association.FromPropertyName;
                            addToEntityDef = true;
                        }

                        foreignType.memberDefinitions.getPublicMappedProperties().filter(function (d) {
                            return d.key
                        }).forEach(function (d) {
                            if (addToEntityDef) {
                                instanceDefinition[foreignPropName + '__' + d.name] = buildDbType_copyPropertyDefinition(d, foreignPropName);
                            }
                            association.ReferentialConstraint.push(buildDbType_createConstrain(foreignType, dataType, d.name, foreignPropName));
                        }, this);
                    }, this);
                }
            },

            save_getInitData: function (item, convertedItems) {
                var self = this;
                item.physicalData = this.context._storageModel.getStorageModel(item.data.getType()).PhysicalType.convertTo(item.data, convertedItems);
                var serializableObject = {};
                item.physicalData.getType().memberDefinitions.asArray().forEach(function (memdef) {
                    if (memdef.kind == $data.MemberTypes.navProperty || memdef.kind == $data.MemberTypes.complexProperty || (memdef.kind == $data.MemberTypes.property && !memdef.notMapped)) {
                        serializableObject[memdef.computed ? '_id' : memdef.name] = item.physicalData[memdef.name];
                    }
                }, this);
                return serializableObject;
            },

            supportedDataTypes: {
                value: [$data.Integer, $data.String, $data.Number, $data.Blob, $data.Boolean, $data.Date, $data.ObjectID, $data.Object, $data.GeographyPoint, $data.Guid,
                    $data.GeographyLineString, $data.GeographyPolygon, $data.GeographyMultiPoint, $data.GeographyMultiLineString, $data.GeographyMultiPolygon, $data.GeographyCollection,
                    $data.GeometryPoint, $data.GeometryLineString, $data.GeometryPolygon, $data.GeometryMultiPoint, $data.GeometryMultiLineString, $data.GeometryMultiPolygon, $data.GeometryCollection,
                    $data.Byte, $data.SByte, $data.Decimal, $data.Float, $data.Int16, $data.Int32, $data.Int64, $data.Time, $data.DateTimeOffset],
                writable: false
            },

            supportedBinaryOperators: {
                value: {
                    equal: {mapTo: ':', dataType: "boolean", allowedIn: [$data.Expressions.FilterExpression]},
                    notEqual: {mapTo: '$ne', dataType: "boolean", allowedIn: [$data.Expressions.FilterExpression]},
                    equalTyped: {mapTo: ':', dataType: "boolean", allowedIn: [$data.Expressions.FilterExpression]},
                    notEqualTyped: {mapTo: '$ne', dataType: "boolean", allowedIn: [$data.Expressions.FilterExpression]},
                    greaterThan: {mapTo: '$gt', dataType: "boolean", allowedIn: [$data.Expressions.FilterExpression]},
                    greaterThanOrEqual: {
                        mapTo: '$gte',
                        dataType: "boolean",
                        allowedIn: [$data.Expressions.FilterExpression]
                    },

                    lessThan: {mapTo: '$lt', dataType: "boolean", allowedIn: [$data.Expressions.FilterExpression]},
                    lessThenOrEqual: {
                        mapTo: '$lte',
                        dataType: "boolean",
                        allowedIn: [$data.Expressions.FilterExpression]
                    },
                    or: {mapTo: '$or', dataType: "boolean", allowedIn: [$data.Expressions.FilterExpression]},
                    and: {mapTo: '$and', dataType: "boolean", allowedIn: [$data.Expressions.FilterExpression]},

                    "in": {mapTo: "$in", allowedIn: [$data.Expressions.FilterExpression]}
                }
            },

            supportedUnaryOperators: {
                value: {
                    not: {mapTo: '$nor'}
                }
            },

            supportedFieldOperations: {
                value: {
                    contains: {
                        dataType: "boolean",
                        allowedIn: [$data.Expressions.FilterExpression],
                        parameters: [
                            {name: "substring", dataType: "string"}
                        ]
                    },

                    startsWith: {
                        dataType: "string",
                        allowedIn: [$data.Expressions.FilterExpression],
                        parameters: [
                            {name: "@expression", dataType: "string"},
                            {name: "strFragment", dataType: "string"}
                        ]
                    },

                    endsWith: {
                        dataType: "string",
                        allowedIn: [$data.Expressions.FilterExpression],
                        parameters: [
                            {name: "@expression", dataType: "string"},
                            {name: "strFragment", dataType: "string"}
                        ]
                    }
                },
                enumerable: true,
                writable: true
            },
            supportedSetOperations: {
                value: {
                    filter: {},
                    map: {},
                    length: {},
                    forEach: {},
                    toArray: {},
                    batchDelete: {},
                    single: {},
                    take: {},
                    skip: {},
                    orderBy: {},
                    orderByDescending: {},
                    first: {},
                    include: {},
                    withInlineCount: {},
                    some: {
                        invokable: false,
                        allowedIn: [$data.Expressions.FilterExpression],
                        parameters: [
                            {name: "filter", dataType: "$data.Queryable"}
                        ],
                        mapTo: 'some',
                        frameType: $data.Expressions.SomeExpression
                    },
                    every: {
                        invokable: false,
                        allowedIn: [$data.Expressions.FilterExpression],
                        parameters: [
                            {name: "filter", dataType: "$data.Queryable"}
                        ],
                        mapTo: 'every',
                        frameType: $data.Expressions.EveryExpression
                    }
                },
                enumerable: true,
                writable: true
            },
            fieldConverter: {value: $data.mongoDBConverter}
        }, {
            isSupported: {
                get: function () {
                    if (!$data.mongoDBDriver) return false;
                    return true;
                },
                set: function (value) {
                }
            }
        });


    $data.StorageProviderBase.registerProvider('neDB', $data.storageProviders.neDB.neDBProvider);
}