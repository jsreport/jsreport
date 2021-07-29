import fileSaver from 'filesaver.js-npm'

const DownloadAction = ({ completed, data, closeMenu }) => {
  const { reportFile } = data
  const enabled = completed && reportFile != null

  return (
    <div
      className={enabled ? '' : 'disabled'} title='Download report output' onClick={() => {
        if (!enabled) {
          return
        }

        handleDownload(reportFile)
        closeMenu()
      }}
    >
      <i className='fa fa-download' /><span>Download</span>
    </div>
  )
}

function handleDownload (reportFile) {
  const blob = new Blob([reportFile.rawData.buffer], { type: reportFile.contentType })
  fileSaver.saveAs(blob, reportFile.filename)
}

export default DownloadAction
