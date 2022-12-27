import React from 'react'

export default (props) => <span>{props.entity.name + ' ' + props.headerOrFooter + (props.entity.__isDirty ? '*' : '')}</span>
