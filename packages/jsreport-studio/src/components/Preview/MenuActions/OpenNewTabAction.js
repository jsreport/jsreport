import { toFile } from '../../../helpers/reportFileInfoPreview'

function OpenNewTabAction ({ id, completed, data, closeMenu }) {
  const { template, reportFile } = data
  const enabled = completed && reportFile != null

  return (
    <div
      className={enabled ? '' : 'disabled'} onClick={() => {
        if (!enabled) {
          return
        }

        openNewTab(id, template.name, reportFile)
        closeMenu()
      }}
    >
      <i className='fa fa-external-link' /><span>Open in new tab</span>
    </div>
  )
}

function openNewTab (id, templateName, reportFile) {
  const file = toFile(reportFile)

  const fileURLBlob = URL.createObjectURL(file)

  const previewURL = window.URL.createObjectURL(new Blob([`
    <html>
      <head>
        <title>Preview - ${templateName}</title>
        <style>
          html, body {
            margin: 0px;
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <iframe src="${fileURLBlob}" frameborder="0" width="100%" height="100%" />
      </body>
    </html>
  `], { type: 'text/html' }))

  const newWindow = window.open(
    previewURL,
    `preview-report-${id}`
  )

  const timerRef = setInterval(() => {
    if (newWindow.closed) {
      window.URL.revokeObjectURL(fileURLBlob)
      window.URL.revokeObjectURL(previewURL)
      clearInterval(timerRef)
    }
  }, 1000)
}

export default OpenNewTabAction
