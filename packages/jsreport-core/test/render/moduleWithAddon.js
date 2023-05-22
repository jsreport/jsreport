module.exports = async () => {
  const { sign } = require('@node-rs/jsonwebtoken')
  const getUtcTimestamp = () => Math.floor(new Date().getTime() / 1000)
  const oneDayInSeconds = 86400
  const secretKey = 'secret'

  const claims = {
    data: {
      id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
      pr: 33,
      isM: true,
      set: ['KL', 'TV', 'JI'],
      nest: { id: 'poly' }
    },
    exp: getUtcTimestamp() + oneDayInSeconds
  }

  const result = await sign(claims, secretKey)

  return result
}
