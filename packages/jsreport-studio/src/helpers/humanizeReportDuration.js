export default function humanizeReportDuration (t) {
  if (t == null) {
    return ''
  }

  if (t < 1000) {
    return `${t}ms`
  }

  if (t < 60000) {
    return `${Math.round(t / 1000 * 10) / 10}s`
  }

  const minutes = Math.floor(t / 60000)
  return `${minutes}m ${Math.round((t - (minutes * 60000)) / 1000)}s`
}
