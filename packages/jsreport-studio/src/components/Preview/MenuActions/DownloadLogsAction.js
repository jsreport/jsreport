import fileSaver from 'filesaver.js-npm'

const DownloadLogsAction = ({ completed, data, closeMenu }) => {
  const { template, reportFile, profileLogs } = data
  const enabled = completed && profileLogs != null && profileLogs.length > 0

  return (
    <div
      className={enabled ? '' : 'disabled'} title='Download logs' onClick={() => {
        if (!enabled) {
          return
        }

        let baseName = 'anonymous'

        if (reportFile != null && reportFile.filename != null) {
          if (reportFile.filename.indexOf('.') !== -1) {
            baseName = reportFile.filename.substring(0, reportFile.filename.lastIndexOf('.'))
          } else {
            baseName = reportFile.filename
          }
        } else if (template != null && template.name != null) {
          baseName = template.name
        }

        handleDownload(profileLogs, baseName)
        closeMenu()
      }}
    >
      <i className='fa fa-download' /><span>Download Logs</span>
    </div>
  )
}

function handleDownload (profileLogs, baseName) {
  const logs = []
  let prevLog

  for (const log of profileLogs) {
    const relativeTime = `+${prevLog == null ? '0' : String(log.timestamp - prevLog.timestamp)}`
    logs.push(`${log.level}\t${relativeTime}\t${log.message}`)
    prevLog = log
  }

  const logsBuf = new TextEncoder().encode(logs.join('\n'))
  const blob = new Blob([logsBuf.buffer], { type: 'text/plain' })
  fileSaver.saveAs(blob, `${baseName}.txt`)
}

export default DownloadLogsAction
