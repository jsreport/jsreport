
function rootUrl () {
  let url

  if (window.location.href.indexOf('/studio') !== -1) {
    url = window.location.href.substring(0, window.location.href.indexOf('/studio'))
  } else {
    url = window.location.href
  }

  url = url.slice(-1) === '/' ? url.slice(0, -1) : url

  return url
}

export default rootUrl
