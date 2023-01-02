const race = require('race-as-promised')

module.exports = function createTextSearch (reporter) {
  const entitySetsForTextSearch = []

  for (const [entitySetName, entitySetInfo] of Object.entries(reporter.documentStore.model.entitySets)) {
    const documentProps = []
    const pendingTypes = [{ typeDef: entitySetInfo.entityTypeDef }]

    do {
      const { typeDef: currentTypeDef, parent = [] } = pendingTypes.shift()

      for (const [propName, propDef] of Object.entries(currentTypeDef)) {
        const fullPropParts = [...parent, propName]
        const resolveResult = reporter.documentStore.resolvePropertyDefinition(propDef)

        if (!resolveResult) {
          continue
        }

        if (resolveResult.subType) {
          pendingTypes.push({
            typeDef: resolveResult.subType,
            parent: fullPropParts
          })
        } else if (resolveResult.def.document != null) {
          documentProps.push({
            name: fullPropParts.join('.'),
            def: resolveResult.def
          })
        }
      }
    } while (pendingTypes.length > 0)

    if (documentProps.length > 0) {
      entitySetsForTextSearch.push({
        entitySet: entitySetName,
        documentProps
      })
    }
  }

  async function textSearch (reporter, req, text, opts = {}) {
    const { step = 100, signal } = opts
    const results = []
    const pending = new Map()
    let matchesCount = 0
    let entitiesCount = 0
    let resultsAsyncIterator

    signal.addEventListener('abort', () => {
      if (resultsAsyncIterator) {
        resultsAsyncIterator.throw(signal.reason).catch(() => {})
      }

      pending.clear()
    }, { once: true })

    for (const info of entitySetsForTextSearch) {
      pending.set(info.entitySet, { skip: 0, documentProps: info.documentProps })
    }

    do {
      const queries = []

      for (const [entitySet, info] of pending.entries()) {
        queries.push(
          reporter.documentStore.collection(entitySet).find({}, info.documentProps.reduce((acu, currentProp) => {
            acu[currentProp.name] = 1
            return acu
          }, {
            _id: 1,
            shortid: 1,
            name: 1,
            folder: 1
          }), req).skip(info.skip).limit(step).toArray().then((entities) => ({ entitySet, entities }))
        )
      }

      resultsAsyncIterator = getPromiseResultsAsAvailable(queries)

      for await (const { entitySet, entities } of resultsAsyncIterator) {
        const info = pending.get(entitySet)

        if (signal.aborted) {
          break
        }

        info.skip = info.skip + step

        if (entities.length > 0) {
          const entitiesMatches = await reporter.executeWorkerAction('text-matches',
            {
              text,
              documentProps: info.documentProps,
              entities
            },
            {
              signal,
              timeoutErrorMessage: 'Timeout during execution of text matches'
            },
            req
          )

          entitiesCount += entitiesMatches.length

          for (const entityMatch of entitiesMatches) {
            if (signal.aborted) {
              break
            }

            const entityPath = await reporter.folders.resolveEntityPath(entityMatch.entity, entitySet, req)

            matchesCount = entityMatch.docPropMatches.reduce((acu, docPropMatch) => (
              acu + docPropMatch.lineMatches.length
            ), matchesCount)

            results.push({
              entitySet,
              entityPath,
              ...entityMatch,
              entity: {
                _id: entityMatch.entity._id,
                shortid: entityMatch.entity.shortid,
                name: entityMatch.entity.name
              }
            })
          }
        }

        if (entities.length === 0 || entities.length < step) {
          pending.delete(entitySet)
        }
      }
    } while (pending.size > 0)

    if (signal.aborted) {
      const err = signal.reason instanceof Error ? signal.reason : new Error('Aborted')
      throw err
    }

    return {
      matchesCount,
      entitiesCount,
      results
    }
  }

  textSearch.entitySetsForTextSearch = entitySetsForTextSearch

  return textSearch
}

async function * getPromiseResultsAsAvailable (promises) {
  const pending = promises.map((p, idx) => p.then((result) => ({ idx, result })))
  const idxPromisesMap = new Map(pending.map((p, idx) => [idx, p]))

  do {
    // here just a reminder: when using Promise.race we should be very careful, the standard
    // implementation basically adds a new .then() call to the promises passed, when we do
    // this in a loop (like in this case) it basically means that the longer the loop keeps
    // going it will continue to add more and more .then() calls to the promises, this is likely
    // not a problem here but it is a bit of overhead that we can avoid by using a
    // safer/custom Promise.race that does not suffer from this problem, full details here:
    // https://github.com/nodejs/node/issues/17469
    // To recap: Promise.race can produce memory leaks when used in a loop and when some of the
    // promises passed never resolves because on each loop a new then callback will be queued
    const resolvedInfo = await race(pending)
    const resolvedPromise = idxPromisesMap.get(resolvedInfo.idx)
    const currentIdx = pending.findIndex((p) => p === resolvedPromise)
    pending.splice(currentIdx, 1)
    yield resolvedInfo.result
  } while (pending.length > 0)
}
