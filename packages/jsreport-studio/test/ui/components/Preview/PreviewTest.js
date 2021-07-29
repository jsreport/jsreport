import React from 'react'
import should from 'should'
import Preview from '../../../../src/components/Preview/Preview'
import Enzyme, { shallow } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

Enzyme.configure({ adapter: new Adapter() })

// don't find out such kind of component tests very much useful, but contributions welcome
describe('<Preview />', () => {
  it('calls componentDidMount', () => {
    should(shallow(<Preview />).find('.block')).have.lengthOf(1)
  })
})
