import React from 'react'

export default (props) => <span>{props.entity.name + ' ' + props.tab.headerOrFooter + (props.entity.__isDirty ? '*' : '')}</span>
