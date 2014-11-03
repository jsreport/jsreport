$data.Class.define('$data.ModelBinder', null, null, {

    constructor: function (context) {
        this.context = context;
        this.providerName = null;
        if (this.context.storageProvider && typeof this.context.storageProvider.getType === 'function') {
            this.references = !(this.context.storageProvider.providerConfiguration.modelBinderOptimization || false);
            for (var i in $data.RegisteredStorageProviders) {
                if ($data.RegisteredStorageProviders[i] === this.context.storageProvider.getType()) {
                    this.providerName = i;
                }
            }
        }
    },

    _deepExtend: function (o, r) {
        if (o === null || o === undefined) {
            return r;
        }
        for (var i in r) {
            if (o.hasOwnProperty(i)) {
                if (typeof r[i] === 'object') {
                    if (Array.isArray(r[i])) {
                        for (var j = 0; j < r[i].length; j++) {
                            if (o[i].indexOf(r[i][j]) < 0) {
                                o[i].push(r[i][j]);
                            }
                        }
                    } else this._deepExtend(o[i], r[i]);
                }
            } else {
                o[i] = r[i];
            }
        }
        return this._finalize(o);
    },

    _finalize: function(o){
        if (o instanceof $data.Entity) {
            o.changedProperties = undefined;
            o.storeToken = this.context.storeToken;
        }
        return o;
    },

    _buildSelector: function (meta, context) {
        if (meta.$selector) {
            if (!(Array.isArray(meta.$selector))) {
                meta.$selector = [meta.$selector];
            }

            for (var i = 0; i < meta.$selector.length; i++) {
                var selector = meta.$selector[i].replace('json:', '');
                context.src += 'if(';
                var path = selector.split('.');
                for (var j = 0; j < path.length; j++) {
                    context.src += 'di.' + path.slice(0, j + 1).join('.') + (j < path.length - 1 ? ' && ' : ' !== undefined && typeof di.' + selector + ' === "object"');
                }
                context.src += '){di = di.' + selector + ';}' + (i < meta.$selector.length - 1 ? 'else ' : 'else { return undefined; }');
            }

            context.src += 'if (di === null){';
            if (context.iter) context.src += context.iter + ' = null;';
            context.src += 'return null;';
            context.src += '}';
        }
    },

    _buildKey: function (name, type, keys, context, data) {
        if (keys) {
            var type = Container.resolveType(type);
            var typeIndex = Container.getIndex(type);
            type = type.fullName || type.name;
            context.src += 'var ' + name + 'Fn = function(di){';
            if (!(Array.isArray(keys)) || keys.length == 1) {
                if (typeof keys !== 'string') keys = keys[0];
                context.src += 'if (typeof di.' + keys + ' === "undefined") return undefined;';
                context.src += 'if (di.' + keys + ' === null) return null;';
                context.src += 'var key = ("' + type + '_' + typeIndex + '_' + keys + '#" + di.' + keys + ');';
            } else {
                context.src += 'var key = "";';
                for (var i = 0; i < keys.length; i++) {
                    var id = typeof keys[i] !== 'object' ? keys[i] : keys[i].$source;
                    context.src += 'if (typeof di.' + id + ' === "undefined") return undefined;';
                    context.src += 'if (di.' + id + ' === null) return null;';
                    context.src += 'key += ("' + type + '_' + typeIndex + '_' + id + '#" + di.' + id + ');';
                }
            }

            context.src += 'return key;};';
        }

        context.src += 'var ' + name + ' = ' + (keys ? name + 'Fn(' + (data || 'di') + ')' : 'undefined') + ';';
    },

    build: function (meta, context) {
        if (meta.$selector) {
            if (!(Array.isArray(meta.$selector))) meta.$selector = [meta.$selector];
            for (var i = 0; i < meta.$selector.length; i++) {
                meta.$selector[i] = meta.$selector[i].replace('json:', '');
            }
        }

        if (meta.$value) {
            if (typeof meta.$value === 'function') {
                context.src += 'var di = di || data;';
                context.src += 'var fn = function(){ return meta' + (context.meta.length ? '.' + context.meta.join('.') : '') + '.$value.call(self, meta' + (context.meta.length ? '.' + context.meta.join('.') : '') + ', di); };';
                if (meta.$type) {
                    var type = Container.resolveName(Container.resolveType(meta.$type));
                    var typeIndex = Container.getIndex(Container.resolveType(meta.$type));
                    var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                    if (converter) {
                        context.item = 'self.context.storageProvider.fieldConverter.fromDb["' + type + '"](fn())';
                    } else {
                        context.item = 'new (Container.resolveByIndex(' + typeIndex + '))(fn())';
                    }
                } else context.item = 'fn()';
            } else if (meta.$type) {
                var type = Container.resolveName(Container.resolveType(meta.$type));
                var typeIndex = Container.getIndex(Container.resolveType(meta.$type));
                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                if (converter) {
                    context.item = 'self.context.storageProvider.fieldConverter.fromDb["' + type + '"](' + meta.$value + ')';
                } else {
                    context.item = 'new (Container.resolveByIndex(' + typeIndex + '))(' + meta.$value + ')';
                }
            } else context.item = meta.$value;
        } else if (meta.$source) {
            var type = Container.resolveName(Container.resolveType(meta.$type));
            var typeIndex = Container.getIndex(Container.resolveType(meta.$type));
            var converter = this.context.storageProvider.fieldConverter.fromDb[type];
            var item = '_' + type.replace(/\./gi, '_') + '_';
            if (!context.forEach) context.src += 'var di = data;';
            context.item = item;
            this._buildSelector(meta, context);
            if (converter) {
                context.src += 'var ' + item + ' = self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di.' + meta.$source + ');';
            } else {
                context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))(di.' + meta.$source + ');';
            }
        } else if (meta.$item) {
            context.meta.push('$item');
            var iter = (context.item && context.current ? context.item + '.' + context.current : (context.item ? context.item : 'result'));
            context.iter = iter;
            if (iter.indexOf('.') < 0) context.src += 'var ' + iter + ';';
            context.src += 'var fn = function(di){';
            if (meta.$selector) {
                context.src += 'if (typeof di !== "undefined" && !(Array.isArray(di))){';
                this._buildSelector(meta, context);
                context.src += '}';
            }
            if (this.references && meta.$keys) this._buildKey('forKey', meta.$type, meta.$keys, context);
            //else if (this.references && meta.$item && meta.$item.$keys) this._buildKey('forKey', meta.$type, meta.$item.$keys, context);
            //else context.src += 'var forKey = typeof itemKey !== "undefined" ? itemKey : undefined;';
            /*context.src += 'if (typeof forKey !== "undefined" && forKey){';
             context.src += 'if (cache[forKey]){';
             context.src += iter + ' = cache[forKey];';
             context.src += '}else{';
             context.src += iter + ' = [];';
             context.src += 'cache[forKey] = ' + iter + ';';
             context.src += '}';
             context.src += '}else{';
             context.src += iter + ' = [];';
             context.src += '}';*/
            context.src += iter + ' = typeof ' + iter + ' == "undefined" ? [] : ' + iter + ';';
            //context.src += iter + ' = [];';
            if (this.references && meta.$item.$keys) {
                var keycacheName = 'keycache_' + iter.replace(/\./gi, '_');
                context.src += 'var ' + keycacheName + ';';
                context.src += 'var kci = keycacheIter.indexOf(' + iter + ');';
                context.src += 'if (kci < 0){';
                context.src += keycacheName + ' = [];';
                context.src += 'keycache.push(' + keycacheName + ');';
                context.src += 'keycacheIter.push(' + iter + ');';
                context.src += '}else{';
                context.src += keycacheName + ' = keycache[kci];';
                context.src += '}';
                //context.src += 'var ' + keycacheName + ' = ' + (meta.$item.$keys ? '[]' : 'null') + ';';
            }
            context.iter = undefined;
            context.forEach = true;
            var itemForKey = 'itemForKey_' + iter.replace(/\./gi, '_');
            context.src += 'var forEachFn = function(di, i){';
            context.src += 'var diBackup = di;';
            if (this.providerName == "sqLite" && this.references && meta.$item.$keys) this._buildKey(itemForKey, meta.$type, meta.$item.$keys, context);
            var item = context.item || 'iter';
            context.item = item;
            if (!meta.$item.$source) {
                this._buildSelector(meta.$item, context);
            }
            this.build(meta.$item, context);
            if (this.references && meta.$keys) {
                context.src += 'if (forKey){';
                context.src += 'if (cache[forKey]){';
                context.src += iter + ' = cache[forKey];';
                context.src += 'if (' + iter + '.indexOf(' + (context.item || item) + ') < 0){';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}}else{';
                context.src += 'cache[forKey] = ' + iter + ';';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}}else{';
                if (this.references && meta.$item.$keys) this._buildKey('cacheKey', meta.$type, meta.$item.$keys, context, 'diBackup');
                context.src += 'if (typeof cacheKey != "undefined" && cacheKey !== null){';
                context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + ' && cacheKey){';
                context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + '.indexOf(cacheKey) < 0){';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += 'keycache_' + iter.replace(/\./gi, '_') + '.push(cacheKey);';
                context.src += '}';
                context.src += '}else{';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}';
                context.src += '}';
                context.src += '}';
            } else {
                if (this.references && meta.$item.$keys) {
                    context.src += 'if (typeof ' + itemForKey + ' !== "undefined" && ' + itemForKey + ' !== null){';
                    context.src += 'if (typeof keycache_' + iter.replace(/\./gi, '_') + ' !== "undefined" && ' + itemForKey + '){';
                    context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + '.indexOf(' + itemForKey + ') < 0){';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += 'keycache_' + iter.replace(/\./gi, '_') + '.push(' + itemForKey + ');'
                    context.src += '}}else{';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += '}}else{';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += '}';
                    /*context.src += 'if (typeof itemKey !== "undefined" && itemKey !== null){';
                     context.src += 'if (typeof keycache_' + iter.replace(/\./gi, '_') + ' !== "undefined" && itemKey){';
                     context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + '.indexOf(itemKey) < 0){';
                     context.src += iter + '.push(' + (context.item || item) + ');';
                     context.src += 'keycache_' + iter.replace(/\./gi, '_') + '.push(itemKey);'
                     context.src += '}}else{';
                     context.src += iter + '.push(' + (context.item || item) + ');';
                     context.src += '}}else{';
                     context.src += iter + '.push(' + (context.item || item) + ');';
                     context.src += '}';*/
                } else {
                    context.src += iter + '.push(' + (context.item || item) + ');';
                }
            }
            context.src += '};';
            context.src += 'if (Array.isArray(di)) di.forEach(forEachFn);';
            context.src += 'else forEachFn(di, 0);';
            context.forEach = false;
            context.item = null;
            context.src += '};fn(typeof di === "undefined" ? data : di);'
            context.meta.pop();
        } else if (meta.$type) {
            if (!context.forEach) {
                context.src += 'if (typeof di === "undefined"){';
                context.src += 'var di = data;';
                this._buildSelector(meta, context);
                context.src += '}';
            }
            var resolvedType = Container.resolveType(meta.$type);
            var type = Container.resolveName(resolvedType);
            var typeIndex = Container.getIndex(resolvedType);
            var isEntityType = resolvedType.isAssignableTo && resolvedType.isAssignableTo($data.Entity);
            var item = '_' + type.replace(/\./gi, '_') + '_';
            if (context.item == item) item += 'new_';
            context.item = item;


            var isPrimitive = false;
            if (!meta.$source && !meta.$value && resolvedType !== $data.Array && resolvedType !== $data.Object && !resolvedType.isAssignableTo)
                isPrimitive = true;
            if (resolvedType === $data.Object || resolvedType === $data.Array) {
                var keys = Object.keys(meta);
                if (keys.length == 1 || (keys.length == 2 && meta.$selector)) isPrimitive = true;
            }

            if (isPrimitive) {
                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                if (converter) {
                    context.src += 'var ' + item + ' = di != undefined ? self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di) : di;';
                } else {
                    context.src += 'var ' + item + ' = di;';
                }
            } else {
                if (this.references && meta.$keys) {
                    this._buildKey('itemKey', meta.$type, meta.$keys, context);
                    context.src += 'if (itemKey === null) return null;';
                    context.src += 'var ' + item + ';';
                    context.src += 'if (itemKey && cache[itemKey]){';
                    context.src += item + ' = cache[itemKey];';
                    context.src += '}else{';
                    if (isEntityType) {
                        context.src += item + ' = new (Container.resolveByIndex(' + typeIndex + '))(undefined, { setDefaultValues: false });';
                    } else {
                        context.src += item + ' = new (Container.resolveByIndex(' + typeIndex + '))();';
                    }
                    context.src += 'if (itemKey){';
                    context.src += 'cache[itemKey] = ' + item + ';';
                    context.src += '}';
                    context.src += '}';
                } else {
                    if (isEntityType) {
                        context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))(undefined, { setDefaultValues: false });';
                    } else {
                        context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))();';
                    }
                }
            }
            for (var i in meta) {
                if (i.indexOf('$') < 0) {
                    context.current = i;
                    if (!meta[i].$item) {
                        if (meta[i].$value) {
                            context.meta.push(i);
                            var item = context.item;
                            this.build(meta[i], context);
                            context.src += item + '.' + i + ' = ' + context.item + ';';
                            context.item = item;
                            context.meta.pop();
                        } else if (meta[i].$source) {
                            context.src += 'var fn = function(di){';
                            this._buildSelector(meta[i], context);
                            if (meta[i].$type) {
                                var type = Container.resolveName(Container.resolveType(meta[i].$type));
                                var typeIndex = Container.getIndex(Container.resolveType(meta[i].$type));
                                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                                if (converter) {
                                    context.src += 'return self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di.' + meta[i].$source + ');';
                                } else {
                                    context.src += 'return new (Container.resolveByIndex(' + typeIndex + '))(di.' + meta[i].$source + ');';
                                }
                            } else {
                                context.src += item + '.' + i + ' = di.' + meta[i].$source + ';';
                            }
                            context.src += '};';
                            if (meta[i].$type) context.src += item + '.' + i + ' = fn(di);';
                            else context.src += 'fn(di);';
                        } else if (meta[i].$type) {
                            context.meta.push(i);
                            context.src += 'var fn = function(di){';
                            this._buildSelector(meta[i], context);
                            this.build(meta[i], context);
                            context.src += 'return ' + context.item + ';};';
                            if (meta[i].$type === $data.Object) context.src += item + '.' + i + ' = self._deepExtend(' + item + '.' + i + ', fn(di));';
                            else context.src += item + '.' + i + ' = fn(di);';
                            context.item = item;
                            context.meta.pop();
                        } else if (meta.$type) {
                            var memDef = Container.resolveType(meta.$type).memberDefinitions.getMember(i);
                            var type = Container.resolveName(memDef.type);
                            var entityType = Container.resolveType(meta.$type);
                            var entityTypeIndex = Container.getIndex(meta.$type);
                            var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                            if (this.providerName && memDef && memDef.converter && memDef.converter[this.providerName] && typeof memDef.converter[this.providerName].fromDb == 'function') {
                                context.src += item + '.' + i + ' = Container.resolveByIndex("' + entityTypeIndex + '").memberDefinitions.getMember("' + i + '").converter.' + this.providerName + '.fromDb(di.' + meta[i] + ', Container.resolveByIndex("' + entityTypeIndex + '").memberDefinitions.getMember("' + i + '"), self.context, Container.resolveByIndex("' + entityTypeIndex + '"));';
                            } else if (converter) {
                                context.src += item + '.' + i + ' = self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di.' + meta[i] + ');';
                            } else {
                                //var type = Container.resolveName(Container.resolveType(type.memberDefinitions.getMember(i).type));
                                var typeIndex = Container.getIndex(Container.resolveType(type.memberDefinitions.getMember(i).type));
                                context.src += item + '.' + i + ' = new (Container.resolveByIndex(' + typeIndex + '))(di.' + meta[i] + ');';
                            }
                        }
                    } else {
                        context.meta.push(i);
                        this.build(meta[i], context);
                        context.item = item;
                        context.meta.pop();
                    }
                }
            }
            context.src += item + ' = self._finalize(' + item + ');';
        }
    },

    call: function (data, meta) {
        if (!Object.getOwnPropertyNames(meta).length) {
            return data;
        }
        var context = {
            src: '',
            meta: []
        };
        context.src += 'var self = this;';
        context.src += 'var result;';
        context.src += 'var cache = {};';
        context.src += 'var keycache = [];';
        context.src += 'var keycacheIter = [];';
        this.build(meta, context);
        if (context.item) context.src += 'if (typeof result === "undefined") result = ' + context.item + ';';
        context.src += 'return result;';

        /*var beautify = require('beautifyjs');
         console.log(beautify.js_beautify(context.src));*/

        var fn = new Function('meta', 'data', context.src).bind(this);
        var ret = fn(meta, data);
        return ret;
    }
});
