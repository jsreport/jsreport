
const UsersGroupEditor = (props) => {
  const { entity } = props

  return (
    <div className='custom-editor'>
      <h1><i className='fa fa-users' /> {entity.name}</h1>
    </div>
  )
}

export default UsersGroupEditor
