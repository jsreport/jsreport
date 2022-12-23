import storeMethods from '../redux/methods'

export default function openTextSearch () {
  const preview = storeMethods.getEditorPreview()

  if (preview != null && preview.type === 'text-search') {
    const textSearchInput = document.getElementById('jsreport-entities-text-search')

    if (textSearchInput != null) {
      textSearchInput.focus()
    }

    return
  }

  const running = storeMethods.getEditorRunning()

  if (running != null) {
    storeMethods.stopRun(running)
  }

  storeMethods.preview({
    type: 'text-search',
    data: {},
    completed: true
  })
}
