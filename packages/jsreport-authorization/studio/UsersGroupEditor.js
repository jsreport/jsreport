import Studio from 'jsreport-studio'

const UsersGroupEditor = (props) => {
  const { entity } = props

  let content = null

  if (Studio.authentication.user.isSuperAdmin) {
    content = (
      <div>
        <h2>Admin Management</h2>
        <div>
          <div className='form-group'>
            <label>Give admin privileges</label>
            <input
              type='checkbox'
              checked={entity.isAdmin === true}
              onChange={(v) => Studio.updateEntity({ ...entity, isAdmin: v.target.checked })}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='custom-editor'>
      <h1><i className='fa fa-users' /> {entity.name}</h1>
      {entity.isAdmin && (
        <div>
          <b>Admin group</b>
        </div>
      )}
      <div>
        <div>
          {content}
        </div>
      </div>
    </div>
  )
}

export default UsersGroupEditor
