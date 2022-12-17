const _ = require('lodash')
const isbinaryfile = require('isbinaryfile').isBinaryFileSync
const { findAll } = require('highlight-words-core')
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

  return async function textSearch (reporter, req, text, step) {
    const results = []
    const pending = new Map()

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

      for await (const { entitySet, entities } of getPromiseResultsAsAvailable(queries)) {
        const info = pending.get(entitySet)
        info.skip = info.skip + step

        for (const entity of entities) {
          for (const docProp of info.documentProps) {
            let propContent = _.get(entity, docProp.name)

            if (propContent == null) {
              continue
            }

            if (typeof propContent !== 'string') {
              const isBuffer = Buffer.isBuffer(propContent)

              if (isBuffer) {
                if (isbinaryfile(propContent)) {
                  continue
                }

                propContent = propContent.toString()
              } else {
                propContent = String(propContent)
              }
            }

            const matches = findAll({
              searchWords: [text],
              textToHighlight: propContent,
              autoEscape: true,
              caseSensitive: false
            })

            if (matches.length === 0) {
              continue
            }

            const highlightedMatches = []

            for (const match of matches) {
              const { highlight, ...rest } = match

              if (highlight) {
                highlightedMatches.push({ ...rest })
              }
            }

            if (highlightedMatches.length === 0) {
              continue
            }

            const entityPath = await reporter.folders.resolveEntityPath(entity, entitySet, req)

            const getStringLine = (str, start) => {
              let startLineIdx = start

              while (startLineIdx > 0) {
                startLineIdx--

                if (str[startLineIdx] === '\n') {
                  startLineIdx++
                  break
                }
              }

              const targetText = str.slice(startLineIdx)
              const newLineMatch = targetText.match(/\r?\n/)
              let endLineIdx = str.length - 1

              if (newLineMatch != null) {
                endLineIdx = (startLineIdx + newLineMatch.index) - 1
              }

              return str.slice(startLineIdx, endLineIdx + 1)
            }

            const lineMatches = highlightedMatches.map((match) => {
              const beforeMatchText = propContent.slice(0, match.start)
              const beforeMatchParts = beforeMatchText.split(/\r?\n/g)
              const matchText = propContent.slice(match.start, match.end)
              const matchParts = matchText.split(/\r?\n/g)
              const previewText = getStringLine(propContent, match.start)
              const start = beforeMatchParts.length

              return {
                start,
                end: matchParts.length > 1 ? start + (matchParts.length - 1) : start,
                preview: previewText
              }
            })

            results.push({
              entitySet,
              entityPath,
              entity: {
                _id: entity._id,
                shortid: entity.shortid,
                name: entity.name
              },
              docProp: docProp.name,
              matches: highlightedMatches,
              lineMatches
            })
          }
        }

        if (entities.length === 0 || entities.length < step) {
          pending.delete(entitySet)
        }
      }
    } while (pending.size > 0)

    return results
  }
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
