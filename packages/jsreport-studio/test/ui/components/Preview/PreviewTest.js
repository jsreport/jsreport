import React from 'react'
import should from 'should'
import Preview from '../../../../src/components/Preview/Preview'
import { render } from '@testing-library/react'

// don't find out such kind of component tests very much useful, but contributions welcome
describe('<Preview />', () => {
  it('can render', () => {
    const { container } = render(<Preview />)
    // this is not the recommend way to assert with testing-library
    // for our purpose (of only 1 test) it is fine
    const blockElement = container.querySelector('.block')
    should(blockElement).be.ok()
  })
})
