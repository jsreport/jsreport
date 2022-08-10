/* eslint-disable no-control-regex, no-useless-escape */

const createError = require('../shared/createError')

const invalidFileNameCharacters = [
  '<',
  '>',
  ':',
  '"',
  { character: '/', escaped: '\\/' },
  { character: '\\', escaped: '\\\\' },
  '|',
  '?',
  '*'
]

function getInvalidFileNameCharactersRegExp () {
  // original regexp taken from https://github.com/sindresorhus/filename-reserved-regex
  return new RegExp(`[${
    invalidFileNameCharacters.map(c => typeof c === 'string' ? c : c.escaped).join('')
  }\\x00-\\x1F]`, 'g')
}

module.exports = (name) => {
  if (name == null || (typeof name === 'string' && name.trim() === '')) {
    throw createError('Entity name can not be empty', {
      statusCode: 400
    })
  }

  if (typeof name !== 'string') {
    throw createError('Entity name must be a string', {
      statusCode: 400
    })
  }

  if (name.trim() === '.') {
    throw createError('Entity name can not be "."', {
      statusCode: 400
    })
  }

  if (name.trim() === '..') {
    throw createError('Entity name can not be ".."', {
      statusCode: 400
    })
  }

  const containsInvalid = getInvalidFileNameCharactersRegExp().test(name)

  if (containsInvalid) {
    const msg = `Entity name can not contain characters ${
      invalidFileNameCharacters.map(c => typeof c === 'string' ? c : c.character).join(', ')
    } and non-printable characters. name used: ${name}`

    throw createError(msg, {
      statusCode: 400
    })
  }

  if (name === 'config.json') {
    throw createError('Entity name "config.json" is reserved and can\'t be used', {
      statusCode: 400
    })
  }

  return true
}
