const Semaphore = require('semaphore-async-await').default

// this is a modified version of http://blog.stevenlevithan.com/archives/javascript-match-recursive-regexp
function matchRecursiveRegExp (str, left, right, flags) {
  const f = flags || ''
  const g = f.indexOf('g') > -1
  const x = new RegExp(left + '|' + right, 'g' + f.replace(/g/g, ''))
  const l = new RegExp(left, f.replace(/g/g, ''))
  const a = []
  let t
  let s
  let m

  let leftPart

  do {
    t = 0

    // eslint-disable-next-line no-cond-assign
    while (m = x.exec(str)) {
      if (l.test(m[0])) {
        if (!t++) {
          s = x.lastIndex
        }

        if (!leftPart) {
          leftPart = {
            index: m.index,
            match: m[0]
          }
        }
      } else if (t) {
        if (!--t) {
          const match = str.slice(leftPart.index, m.index + m[0].length)
          const content = str.slice(s, m.index)

          a.push({
            left: {
              offset: leftPart.index,
              match: leftPart.match
            },
            right: {
              offset: m.index,
              match: m[0]
            },
            offset: s,
            match,
            content
          })

          leftPart = null

          if (!g) return a
        }
      }
    }
  } while (t && (x.lastIndex = s))

  return a
}

function matchAll (str, left, right, flags, onlyTopLevel) {
  const matches = []

  const results = matchRecursiveRegExp(str, left, right, flags)

  for (const result of results) {
    const childMatches = onlyTopLevel === true ? [] : matchAll(result.content, left, right, flags)

    if (childMatches.length > 0) {
      result.matches = childMatches
    }

    matches.push(result)
  }

  return matches
}

function replaceAll (str, matches) {
  return [...matches].reverse().reduce(function (res, match) {
    const prefix = res.slice(0, match.left.offset)
    const postfix = res.slice(match.right.offset + match.right.match.length)

    return prefix + match.replacement + postfix
  }, str)
}

async function assignReplacement (match, replacer) {
  const newMatch = Object.assign({}, match)
  let hasNestedMatch = false

  if (match.matches) {
    hasNestedMatch = true
    const newChildMatchesWithReplace = await execute(match.matches, replacer)
    newMatch.content = replaceAll(newMatch.content, newChildMatchesWithReplace)
    newMatch.match = `${newMatch.left.match}${newMatch.content}${newMatch.right.match}`
  }

  const args = [newMatch.match, newMatch.content, hasNestedMatch]

  return replacer(args).then(function (res) {
    newMatch.replacement = res
    return newMatch
  })
}

function execute (matches, replacer) {
  const promises = matches.map(function (match) {
    return assignReplacement(match, replacer)
  })

  return Promise.all(promises)
}

async function processString (stringOrParams, left, right, flags, replacer, onlyTopLevel) {
  let str
  let parallelLimit

  if (typeof stringOrParams === 'string') {
    str = stringOrParams
  } else {
    str = stringOrParams.string
    parallelLimit = stringOrParams.parallelLimit
  }

  const matches = matchAll(str, left, right, flags, onlyTopLevel)
  let semp

  if (parallelLimit != null && parallelLimit > 0) {
    semp = new Semaphore(parallelLimit)
  }

  const doReplace = async (...a) => {
    if (typeof replacer === 'string') {
      return replacer
    }

    return replacer.apply(null, ...a)
  }

  const replacerFn = async (...a) => {
    if (semp) {
      return semp.execute(() => {
        return doReplace(...a)
      })
    } else {
      return doReplace(...a)
    }
  }

  return execute(matches, replacerFn).then(function (matches) {
    // replace the missing top level replacements
    return replaceAll(str, matches)
  })
}

function recursiveStringReplaceAsync (str, left, right, flags, replacer, onlyTopLevel) {
  return processString(str, left, right, flags, replacer, onlyTopLevel)
}

module.exports = recursiveStringReplaceAsync
