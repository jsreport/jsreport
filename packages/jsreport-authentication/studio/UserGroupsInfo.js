import { useCallback, useMemo } from 'react'
import Studio from 'jsreport-studio'

function UserGroupsInfo (props) {
  const { user } = props
  const { usersGroups: groups } = Studio.getReferences()

  const groupsForUser = useMemo(() => {
    return groups.filter((g) => {
      const users = g.users || []
      return users.find((u) => u.shortid === user.shortid) != null
    })
  }, [groups])

  return (
    <div>
      <h2>Groups</h2>
      <div>
        <div className='form-group'>
          <GroupsDisplay groups={groupsForUser} />
        </div>
      </div>
    </div>
  )
}

function GroupsDisplay ({ groups }) {
  const handleOpenGroupTab = useCallback(function handleOpenGroupTab (groupId) {
    Studio.openTab({ _id: groupId })
  }, [])

  if (groups.length === 0) {
    return (
      <span>
        <i>No groups assigned</i>
      </span>
    )
  }

  const groupsIcon = 'fa-users'
  const lastGroupIdx = groups.length - 1

  return (
    <span>
      <i className={`fa ${groupsIcon}`} />
      &nbsp;
      {groups.map((g, idx) => (
        <span key={g.name}>
          <span
            onClick={() => handleOpenGroupTab(g._id)}
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
          >
            {g.name}
          </span>
          {idx !== lastGroupIdx ? ', ' : ''}
        </span>
      ))}
    </span>
  )
}

export default UserGroupsInfo
