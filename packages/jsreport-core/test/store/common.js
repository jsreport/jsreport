const should = require('should')
const Request = require('../../lib/shared/request')

module.exports = (store, runTransactions = true) => {
  describe('public collection', () => {
    collectionTests(store, undefined, runTransactions)
  })

  describe('internal collection', () => {
    collectionTests(store, true, runTransactions)
  })
}

function collectionTests (store, isInternal, runTransactions) {
  function getCollection (name) {
    if (!isInternal) {
      return store().collection(name)
    } else {
      return store().internalCollection(name)
    }
  }

  it('insert and query', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({
      name: 'test',
      engine: 'none',
      recipe: 'html'
    })

    const res = await getCollection(colName).find({ name: 'test' })
    res.length.should.be.eql(1)
  })

  it('insert and query with condition', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({
      name: 'test',
      engine: 'none',
      recipe: 'html'
    })

    const res = await getCollection(colName).find({ name: 'diferent' })
    res.length.should.be.eql(0)
  })

  it('insert, update, query', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({
      name: 'test',
      engine: 'none',
      recipe: 'html'
    })

    await getCollection(colName).update({ name: 'test' }, { $set: { recipe: 'foo' } })
    const res = await getCollection(colName).find({ name: 'test' })
    res.length.should.be.eql(1)
    res[0].recipe.should.be.eql('foo')
  })

  it('insert remove query', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({
      name: 'test',
      engine: 'none',
      recipe: 'html'
    })

    await getCollection(colName).remove({ name: 'test' })
    const res = await getCollection(colName).find({ name: 'test' })
    res.length.should.be.eql(0)
  })

  it('insert should return an object with _id set', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    const doc = await getCollection(colName).insert({
      name: 'test',
      engine: 'none',
      recipe: 'html'
    })

    doc.should.have.property('_id')
    doc._id.should.be.ok()
  })

  it('update with upsert', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).update({ name: 'test' }, {
      $set: {
        name: 'test2',
        engine: 'none',
        recipe: 'html'
      }
    }, { upsert: true })
    const res = await getCollection(colName).find({ name: 'test2' })
    res.length.should.be.eql(1)
  })

  it('find should return clones', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({
      name: 'test',
      engine: 'none',
      recipe: 'html',
      content: 'original',
      phantom: { header: 'original' }
    })

    const res = await getCollection(colName).find({})
    res[0].content = 'modified'
    res[0].phantom.header = 'modified'
    const res2 = await getCollection(colName).find({})
    res2[0].content.should.be.eql('original')
    res2[0].phantom.header.should.be.eql('original')
  })

  it('insert should use clones', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    const doc = {
      name: 'test',
      engine: 'none',
      recipe: 'html',
      content: 'original',
      phantom: { header: 'original' }
    }

    await getCollection(colName).insert(doc)

    doc.content = 'modified'
    doc.phantom.header = 'modified'
    const res = await getCollection(colName).find({})
    res[0].content.should.be.eql('original')
    res[0].phantom.header.should.be.eql('original')
  })

  it('update should use clones', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await store().collection('folders').insert({
      name: 'f1',
      shortid: 'f1'
    })

    await getCollection(colName).insert({
      name: 'test',
      engine: 'none',
      recipe: 'html',
      content: 'original'
    })

    const set = {
      folder: {
        shortid: 'f1'
      }
    }

    await getCollection(colName).update({ name: 'test' }, { $set: set })
    set.folder.shortid = 'changing'

    const res = await getCollection(colName).findOne({})
    res.folder.shortid.should.be.eql('f1')
  })

  it('skip and limit', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({
      name: '1',
      engine: 'none',
      recipe: 'html'
    })

    await getCollection(colName).insert({
      name: '3',
      engine: 'none',
      recipe: 'html'
    })

    await getCollection(colName).insert({
      name: '2',
      engine: 'none',
      recipe: 'html'
    })

    const res = await getCollection(colName).find({}).sort({ name: 1 }).skip(1).limit(1).toArray()
    res.length.should.be.eql(1)
    res[0].name.should.be.eql('2')
  })

  it('$and', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({ name: '1', engine: 'none', recipe: 'a' })
    await getCollection(colName).insert({ name: '2', engine: 'none', recipe: 'b' })
    await getCollection(colName).insert({ name: '3', engine: 'none', recipe: 'b' })

    const res = await getCollection(colName).find({ $and: [{ name: '2' }, { recipe: 'b' }] }).toArray()
    res.length.should.be.eql(1)
    res[0].name.should.be.eql('2')
    res[0].recipe.should.be.eql('b')
  })

  it('projection', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({ name: '1', engine: 'none', recipe: 'a' })

    const res = await getCollection(colName).find({}, { recipe: 1 })
    res.length.should.be.eql(1)
    res[0].should.not.have.property('name')
    res[0].recipe.should.be.eql('a')
  })

  it('count', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({ name: '1', engine: 'none', recipe: 'a' })

    const res = await getCollection(colName).find({}).count()
    res.should.be.eql(1)
  })

  it('count without cursor', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({ name: '1', engine: 'none', recipe: 'a' })

    const res = await getCollection(colName).count({})
    res.should.be.eql(1)
  })

  it('projection should not be applied when second param is request', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({ name: 'test', engine: 'none', recipe: 'html' })
    const res = await getCollection(colName).find({ name: 'test' }, Request({ template: {} }))
    res[0].name.should.be.eql('test')
  })

  it('update should return 1 if upsert', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    const res = await getCollection(colName).update({ name: 'test' }, { $set: { name: 'test2', engine: 'none', recipe: 'html' } }, { upsert: true })
    res.should.be.eql(1)
  })

  it('update should return number of updated items', async () => {
    const colName = !isInternal ? 'templates' : 'internalTemplates'

    await getCollection(colName).insert({ name: '1', engine: 'none', recipe: 'a' })
    await getCollection(colName).insert({ name: '2', engine: 'test2', recipe: 'a' })
    const res = await getCollection(colName).update({ recipe: 'a' }, { $set: { engine: 'test2' } })
    res.should.be.eql(2)
  })

  it('should validate duplicated _id on insert', async () => {
    const newEntity = await store().collection('templates').insert({
      name: 'a',
      content: 'x',
      engine: 'none',
      recipe: 'html'
    })

    return should(store().collection('templates').insert({
      _id: newEntity._id,
      name: 'b',
      content: 'x',
      engine: 'none',
      recipe: 'html'
    })).be.rejected()
  })

  it('should validate duplicated _id on update', async () => {
    const a = await store().collection('templates').insert({
      name: 'a',
      engine: 'none',
      recipe: 'html'
    })

    const b = await store().collection('templates').insert({
      name: 'b',
      engine: 'none',
      recipe: 'html'
    })

    return should(store().collection('templates').update({
      _id: a._id
    }, {
      $set: {
        _id: b._id
      }
    })).be.rejected()
  })

  it('should validate duplicated shortid on upsert', async () => {
    const a = await store().collection('templates').insert({
      name: 'a',
      engine: 'none',
      recipe: 'html'
    })

    return should(store().collection('templates').update({
      name: 'b'
    }, {
      $set: {
        _id: a._id,
        name: 'b'
      }
    }, { upsert: true })).be.rejected()
  })

  it('should validate duplicated shortid on insert', async () => {
    await store().collection('templates').insert({
      name: 'a',
      shortid: 'a',
      engine: 'none',
      recipe: 'html'
    })

    return should(store().collection('templates').insert({
      name: 'b',
      shortid: 'a',
      engine: 'none',
      recipe: 'html'
    })).be.rejected()
  })

  it('should validate duplicated shortid on update', async () => {
    const a = await store().collection('templates').insert({
      name: 'a',
      shortid: 'a',
      engine: 'none',
      recipe: 'html'
    })

    await store().collection('templates').insert({
      name: 'b',
      shortid: 'b',
      engine: 'none',
      recipe: 'html'
    })

    return should(store().collection('templates').update({
      _id: a._id
    }, {
      $set: {
        shortid: 'b'
      }
    })).be.rejected()
  })

  it('should validate duplicated shortid on upsert', async () => {
    await store().collection('templates').insert({
      name: 'a',
      shortid: 'a',
      engine: 'none',
      recipe: 'html'
    })

    return should(store().collection('templates').update({
      name: 'b'
    }, {
      $set: {
        name: 'b',
        shortid: 'a'
      }
    }, { upsert: true })).be.rejected()
  })

  if (runTransactions) {
    describe('transactions', () => {
      it('should be able to start', async () => {
        const req = Request({})
        await store().beginTransaction(req)
        req.context.storeTransaction.should.be.not.empty()
        await store().commitTransaction(req)
      })

      it('should fail when trying to start more than once', async () => {
        const req = Request({})

        await store().beginTransaction(req)

        try {
          await store().beginTransaction(req)
          throw new Error('it should have failed calling beginTransaction twice')
        } catch (e) {
          e.message.should.containEql('active transaction already exists')
        }

        await store().commitTransaction(req)
      })

      it('should fail when commit without start', async () => {
        const req = Request({})
        return should(store().commitTransaction(req)).be.rejectedWith(/without an active transaction/)
      })

      it('should fail when rollback without start', async () => {
        const req = Request({})
        return should(store().rollbackTransaction(req)).be.rejectedWith(/without an active transaction/)
      })

      it('should fail when commit more than once', async () => {
        const req = Request({})

        await store().beginTransaction(req)
        await store().commitTransaction(req)

        return should(store().commitTransaction(req)).be.rejectedWith(/without an active transaction/)
      })

      it('should fail when rollback more than once', async () => {
        const req = Request({})

        await store().beginTransaction(req)
        await store().rollbackTransaction(req)

        return should(store().rollbackTransaction(req)).be.rejectedWith(/without an active transaction/)
      })

      it('should fail when rollback after commit', async () => {
        const req = Request({})

        await store().beginTransaction(req)
        await store().commitTransaction(req)

        return should(store().rollbackTransaction(req)).rejectedWith(/without an active transaction/)
      })

      it('should fail when commit after rollback', async () => {
        const req = Request({})

        await store().beginTransaction(req)
        await store().rollbackTransaction(req)

        return should(store().commitTransaction(req)).rejectedWith(/without an active transaction/)
      })

      it('should be able to commit (insert)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        await store().beginTransaction(req)

        try {
          const t1 = {
            name: 't1',
            engine: 'none',
            recipe: 'html'
          }

          await getCollection(colName).insert(t1, req)

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('insert with transaction should use clones', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        await store().beginTransaction(req)

        try {
          const t1 = {
            name: 't1',
            engine: 'none',
            recipe: 'html'
          }

          const newT1 = await getCollection(colName).insert(t1, req)

          newT1.name = 'fake-t1'

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })
        should(found).not.be.null()
      })

      it('should be able to rollback (insert)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        await store().beginTransaction(req)

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1, req)

        await store().rollbackTransaction(req)

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found == null).be.True()
      })

      it('should be able to commit (update)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          content: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        try {
          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              content: 't1-new',
              engine: 'handlebars'
            }
          }, req)

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found.engine).be.eql('handlebars')
        should(found.content).be.eql('t1-new')
      })

      it('should be able to rollback (update)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        await getCollection(colName).update({
          name: 't1'
        }, {
          $set: {
            engine: 'handlebars'
          }
        }, req)

        await store().rollbackTransaction(req)

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found.engine).be.eql('none')
      })

      it('should be able to commit (upsert)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await store().beginTransaction(req)

        try {
          await getCollection(colName).insert(t1, req)

          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should be able to rollback (upsert)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await store().beginTransaction(req)

        await getCollection(colName).insert(t1, req)

        await getCollection(colName).update({
          name: 't1'
        }, {
          $set: {
            engine: 'handlebars'
          }
        }, req)

        await store().rollbackTransaction(req)

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found == null).be.True()
      })

      it('should be able to commit (remove)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        try {
          await getCollection(colName).remove({
            name: 't1'
          }, req)

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found == null).be.True()
      })

      it('should be able to rollback (remove)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        await getCollection(colName).remove({
          name: 't1'
        }, req)

        await store().rollbackTransaction(req)

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should be able to commit across collections', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const colName2 = !isInternal ? 'templates2' : 'internalTemplates2'

        const req = Request({})
        await store().beginTransaction(req)

        try {
          const t1 = {
            name: 't1',
            engine: 'none',
            recipe: 'html'
          }

          const t2 = {
            name: 't2',
            engine: 'none',
            recipe: 'html'
          }

          await getCollection(colName).insert(t1, req)
          await getCollection(colName2).insert(t2, req)

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })
        const found2 = await getCollection(colName2).findOne({ name: 't2' })

        should(found != null).be.True()
        should(found2 != null).be.True()
      })

      it('should be able to rollback across collections', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const colName2 = !isInternal ? 'templates2' : 'internalTemplates2'
        const req = Request({})
        await store().beginTransaction(req)

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        const t2 = {
          name: 't2',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1, req)
        await getCollection(colName).insert(t2, req)

        await store().rollbackTransaction(req)

        const found = await getCollection(colName).findOne({ name: 't1' })
        const found2 = await getCollection(colName2).findOne({ name: 't1' })

        should(found == null).be.True()
        should(found2 == null).be.True()
      })

      it('should be able to see entity created inside transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        await store().beginTransaction(req)

        try {
          const t1 = {
            name: 't1',
            engine: 'none',
            recipe: 'html'
          }

          await getCollection(colName).insert(t1, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req)

          should(found != null).be.True()

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should be able to see entity updated inside transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        try {
          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req)

          should(found != null).be.True()

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should be able to see entity updated properties inside transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        try {
          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req)

          should(found.engine).be.eql('handlebars')

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found.engine).be.eql('handlebars')
      })

      it('should be able to see entity upsert inside transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await store().beginTransaction(req)

        try {
          await getCollection(colName).insert(t1, req)

          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req)

          should(found != null).be.True()

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should not be able to see entity removed inside transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        try {
          await getCollection(colName).remove({
            name: 't1'
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req)

          should(found == null).be.True()

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found == null).be.True()
      })

      it('should not be able to see entity created in transaction from outside', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        await store().beginTransaction(req)

        try {
          const t1 = {
            name: 't1',
            engine: 'none',
            recipe: 'html'
          }

          await getCollection(colName).insert(t1, req)

          const found = await getCollection(colName).findOne({ name: 't1' })

          should(found == null).be.True()

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should be able to see entity updated in transaction from outside', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        try {
          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' })

          should(found != null).be.True()

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should not be able to see entity updated properties from outside', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        try {
          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' })

          should(found.engine).be.eql('none')

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found.engine).be.eql('handlebars')
      })

      it('should not be able to see entity upsert in transaction from outside', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await store().beginTransaction(req)

        try {
          await getCollection(colName).insert(t1, req)

          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' })

          should(found == null).be.True()

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should be able to see entity removed in transaction from outside', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)

        try {
          await getCollection(colName).remove({
            name: 't1'
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' })

          should(found != null).be.True()

          await store().commitTransaction(req)
        } catch (e) {
          await store().rollbackTransaction(req)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found == null).be.True()
      })

      it('should not be able to see entity created in transaction from another transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        const req2 = Request({})

        await store().beginTransaction(req)
        await store().beginTransaction(req2)

        try {
          const t1 = {
            name: 't1',
            engine: 'none',
            recipe: 'html'
          }

          await getCollection(colName).insert(t1, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req2)

          should(found == null).be.True()

          await store().commitTransaction(req)
          await store().commitTransaction(req2)
        } catch (e) {
          await store().rollbackTransaction(req)
          await store().rollbackTransaction(req2)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should be able to see entity updated in transaction from another transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        const req2 = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)
        await store().beginTransaction(req2)

        try {
          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req2)

          should(found != null).be.True()

          await store().commitTransaction(req)
          await store().commitTransaction(req2)
        } catch (e) {
          await store().rollbackTransaction(req)
          await store().rollbackTransaction(req2)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should not be able to see entity updated properties from another transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        const req2 = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)
        await store().beginTransaction(req2)

        try {
          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req2)

          should(found.engine).be.eql('none')

          await store().commitTransaction(req)
          await store().commitTransaction(req2)
        } catch (e) {
          await store().rollbackTransaction(req)
          await store().rollbackTransaction(req2)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found.engine).be.eql('handlebars')
      })

      it('should not be able to see entity upsert in transaction from another transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        const req2 = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await store().beginTransaction(req)
        await store().beginTransaction(req2)

        try {
          await getCollection(colName).insert(t1, req)

          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req2)

          should(found == null).be.True()

          await store().commitTransaction(req)
          await store().commitTransaction(req2)
        } catch (e) {
          await store().rollbackTransaction(req)
          await store().rollbackTransaction(req2)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should be able to see entity removed in transaction from another transaction', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        const req2 = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)
        await store().beginTransaction(req2)

        try {
          await getCollection(colName).remove({
            name: 't1'
          }, req)

          const found = await getCollection(colName).findOne({ name: 't1' }, req2)

          should(found != null).be.True()

          await store().commitTransaction(req)
          await store().commitTransaction(req2)
        } catch (e) {
          await store().rollbackTransaction(req)
          await store().rollbackTransaction(req2)
          throw e
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found == null).be.True()
      })

      it('should not be able to commit changes of transaction from another transaction (insert)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        const req2 = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await store().beginTransaction(req)
        await store().beginTransaction(req2)

        try {
          await getCollection(colName).insert(t1, req)

          await store().commitTransaction(req2)

          let found = await getCollection(colName).findOne({ name: 't1' }, req2)

          should(found == null).be.True()

          await store().commitTransaction(req)

          found = await getCollection(colName).findOne({ name: 't1' }, req)

          should(found != null).be.True()
        } catch (e) {
          await store().rollbackTransaction(req)
          await store().rollbackTransaction(req2)
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found != null).be.True()
      })

      it('should not be able to commit changes of transaction from another transaction (update)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        const req2 = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)
        await store().beginTransaction(req2)

        try {
          await getCollection(colName).update({
            name: 't1'
          }, {
            $set: {
              engine: 'handlebars'
            }
          }, req)

          await store().commitTransaction(req2)

          let found = await getCollection(colName).findOne({ name: 't1' }, req2)

          should(found.engine).be.eql('none')

          await store().commitTransaction(req)

          found = await getCollection(colName).findOne({ name: 't1' }, req)

          should(found.engine).be.eql('handlebars')
        } catch (e) {
          await store().rollbackTransaction(req)
          await store().rollbackTransaction(req2)
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found.engine).be.eql('handlebars')
      })

      it('should not be able to commit changes of transaction from another transaction (remove)', async () => {
        const colName = !isInternal ? 'templates' : 'internalTemplates'
        const req = Request({})
        const req2 = Request({})

        const t1 = {
          name: 't1',
          engine: 'none',
          recipe: 'html'
        }

        await getCollection(colName).insert(t1)

        await store().beginTransaction(req)
        await store().beginTransaction(req2)

        try {
          await getCollection(colName).remove({
            name: 't1'
          }, req)

          await store().commitTransaction(req2)

          let found = await getCollection(colName).findOne({ name: 't1' }, req2)

          should(found != null).be.True()

          await store().commitTransaction(req)

          found = await getCollection(colName).findOne({ name: 't1' }, req)

          should(found == null).be.True()
        } catch (e) {
          await store().rollbackTransaction(req)
          await store().rollbackTransaction(req2)
        }

        const found = await getCollection(colName).findOne({ name: 't1' })

        should(found == null).be.True()
      })
    })
  }
}

function init (store) {
  store().registerComplexType('CommonPhantomType', {
    header: { type: 'Edm.String', document: { extension: 'html', engine: true } }
  })

  const templateType = {
    name: { type: 'Edm.String' },
    content: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    recipe: { type: 'Edm.String' },
    engine: { type: 'Edm.String' },
    phantom: { type: 'jsreport.CommonPhantomType', schema: { type: 'null' } }
  }

  store().registerEntityType('CommonTemplateType', { ...templateType })
  store().registerEntityType('CommonTemplateType2', { ...templateType })

  store().registerEntitySet('templates', {
    entityType: 'jsreport.CommonTemplateType',
    splitIntoDirectories: true
  })

  store().registerEntitySet('templates2', {
    entityType: 'jsreport.CommonTemplateType2',
    splitIntoDirectories: true
  })

  store().registerEntitySet('internalTemplates', {
    entityType: 'jsreport.CommonTemplateType',
    internal: true,
    splitIntoDirectories: true
  })

  store().registerEntitySet('internalTemplates2', {
    entityType: 'jsreport.CommonTemplateType2',
    internal: true,
    splitIntoDirectories: true
  })
}

async function clean (store) {
  await Promise.all(Object.keys(store().collections).map(async (collectionName) => {
    const all = await store().collection(collectionName).find({})
    return Promise.all(all.map((e) => store().collection(collectionName).remove({ _id: e._id })))
  }))

  await Promise.all(Object.keys(store().internalCollections).map(async (collectionName) => {
    const all = await store().internalCollection(collectionName).find({})
    return Promise.all(all.map((e) => store().internalCollection(collectionName).remove({ _id: e._id })))
  }))
}

module.exports.init = init
module.exports.clean = clean
