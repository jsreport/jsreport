import { rootPath } from '../lib/configuration'

const join = (a, b) => {
  const slashless = b[0] === '/' ? b.substring(1) : b
  return a[a.length - 1] === '/' ? a + slashless : a + '/' + slashless
}

export default (url) => {
  return join(rootPath(), url)
}
