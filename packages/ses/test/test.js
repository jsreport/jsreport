/* globals lockdown, Compartment */
const should = require('should')

require('@jsreport/ses')

lockdown()

describe('SES changes', () => {
  it('should allow html comments in source code', () => {
    const compartment = new Compartment()

    should.doesNotThrow(() => {
      compartment.evaluate('// <!-- hello world -->\nconst x = 1;\nx')
    })
  })
})
