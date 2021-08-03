import Studio from 'jsreport-studio'
import DownloadBigFileModal from './DownloadBigFileModal'

const openDiff = async (change) => {
  if (change.type === 'bigfile') {
    return Studio.openModal(DownloadBigFileModal, {
      change
    })
  }

  const previewId = Studio.preview({
    type: 'rawContent',
    data: {}
  })

  try {
    const response = await Studio.api.post('/studio/diff-html', {
      parseJSON: false,
      data: {
        patch: change.patch
      }
    })

    Studio.updatePreview(previewId, {
      type: 'rawContent',
      data: {
        type: 'text/html',
        content: response
      },
      completed: true
    })
  } catch (err) {
    Studio.updatePreview(previewId, {
      type: 'rawContent',
      data: {
        type: 'text/html',
        content: err.stack
      },
      completed: true
    })
  }
}

const operationIcon = (operation) => {
  switch (operation) {
    case 'insert': return 'fa fa-plus'
    case 'remove': return 'fa fa-eraser'
    case 'update': return 'fa fa-pencil'
  }
}

const renderChange = (c) => {
  return (
    <tbody key={`${c.entitySet}-${c.path}`}>
      <tr onClick={() => openDiff(c)}>
        <td style={{ textAlign: 'center' }}><i className={operationIcon(c.operation)} /></td>
        <td>{c.path}</td>
        <td>{c.entitySet}</td>
      </tr>
    </tbody>
  )
}

export default ({ changes }) => (
  <table className='table'>
    <thead>
      <tr>
        <th style={{ width: '20px' }}>operation</th>
        <th>path</th>
        <th>entity set</th>
      </tr>
    </thead>
    {changes.map((c) => renderChange(c))}
  </table>
)
