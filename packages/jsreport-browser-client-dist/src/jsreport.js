/* globals jsreportInit define saveAs */
/* eslint-env browser */

;
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : global.jsreport = factory()
}(this, function () {
  'use strict'

  function JsReport () {
    this.options = {}
    this.headers = this.headers || {}
  }

  function isObject (value) {
    var type = typeof value
    return type === 'function' || (value && type === 'object') || false
  }

  function responseToString (response) {
    // String.fromCharCode.apply(null, new Uint8Array(response)) was too slow
    // see https://github.com/jsreport/jsreport-browser-client-dist/issues/4
    var array = new Uint8Array(response)
    var res = ''
    for (var i = 0; i < array.length; i++) {
      res += String.fromCharCode(array[i])
    }

    return res
  }

  function _serverSideRender (request, placeholder) {
    var frameName = placeholder || '_blank'

    if (placeholder && (placeholder !== '_blank' && placeholder !== '_top' && placeholder !== '_parent' && placeholder !== '_self')) {
      if (typeof placeholder === 'string' || placeholder instanceof String) {
        var contentIframe = document.getElementById('contentIframe')
        if (contentIframe) {
          var contentIframeDoc = contentIframe.contentDocument || contentIframe.contentWindow.document
          placeholder = contentIframeDoc.getElementById(placeholder)
        } else {
          placeholder = document.getElementById(placeholder)
        }
      }

      if (placeholder.length) {
        placeholder = placeholder[0]
      }

      frameName = request.template.shortid || new Date().getTime()

      var iframe = "<iframe frameborder='0' name='" + frameName + "' style='width:100%;height:100%;z-index:50'></iframe>"
      placeholder.innerHTML = iframe
    }

    var mapForm = document.createElement('form')
    mapForm.target = frameName
    mapForm.id = new Date().getTime()
    mapForm.method = 'POST'
    mapForm.action = this.serverUrl + '/api/report'

    function addInput (form, name, value) {
      var input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }

    function addBody (path, body) {
      if (body === undefined) {
        return
      }

      for (var key in body) {
        if (isObject(body[key])) {
          // somehow it skips empty array for template.scripts, this condition fixes that
          if (body[key] instanceof Array && body[key].length === 0) {
            addInput(mapForm, path + '[' + key + ']', [])
          }
          addBody(path + '[' + key + ']', body[key])
        } else {
          if (body[key] !== undefined && !(body[key] instanceof Array)) {
            addInput(mapForm, path + '[' + key + ']', body[key])
          }
        }
      }
    }

    addBody('template', request.template)

    if (request.options != null) {
      addBody('options', request.options)
    }

    if (request.data) {
      addBody('data', request.data)
    }

    var headers = this.headers
    headers['host-cookie'] = document.cookie
    addBody('headers', headers)

    document.body.appendChild(mapForm)

    function submit (i) {
      if (i > 10) {
        return console.log('Unable to submit render form.')
      }
      try {
        mapForm.submit()
        mapForm.outerHTML = ''
      } catch (e) {
        setTimeout(function () {
          submit(i + 1)
        }, 50)
      }
    }

    submit(0)
  }

  function _render (placeholder, request) {
    var self = this

    if (!this.serverUrl) {
      throw new Error('The script was not linked from jsreport. You need to fill jsreport.serverUrl property with valid url to jsreport server.')
    }

    if (!request) {
      request = placeholder
      placeholder = '_blank'
    }

    if (typeof request === 'string' || request instanceof String) {
      request = {
        template: { shortid: request }
      }
    }

    if (!request.template) {
      request = { template: request }
    }

    _serverSideRender.call(self, request, placeholder)
  }

  function _renderAsync (request) {
    var self = this

    if (!this.serverUrl) {
      throw new Error('The script was not linked from jsreport. You need to fill jsreport.serverUrl property with valid url to jsreport server.')
    }

    if (!request.template) {
      request = { template: request }
    }

    var xhr = new XMLHttpRequest()
    var data = JSON.stringify(request)
    xhr.open('POST', this.serverUrl + '/api/report', true)
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8')

    Object.keys(this.headers).forEach(function (k) {
      xhr.setRequestHeader(k, self.headers[k])
    })
    xhr.responseType = 'arraybuffer'

    var PromiseImpl = this.promise || window.Promise || undefined

    if (!PromiseImpl) {
      throw new Error('Native Promise is not supported in this browser. Use jsreport.Promise = bluebirdOrAnyOtherLib;')
    }

    return new PromiseImpl(function (resolve, reject) {
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var response = xhr.response
          response.xhr = xhr
          response.toString = function () {
            return decodeURIComponent(escape(responseToString(response)))
          }
          response.toDataURI = function () {
            var contentType = xhr.getResponseHeader('Content-Type')
            var base64 = window.btoa(responseToString(response))
            return 'data:' + contentType + ';base64, ' + base64
          }
          response.toObjectURL = function () {
            return URL.createObjectURL(response.toBlob())
          }
          response.toBlob = function () {
            var contentType = xhr.getResponseHeader('Content-Type')
            var dataView = new DataView(response)
            var blob

            try {
              blob = new Blob([dataView], { type: contentType })
            } catch (e) {
              if (e.name === 'InvalidStateError') {
                var byteArray = new Uint8Array(response)
                blob = new Blob([byteArray.buffer], { type: contentType })
              } else {
                throw e
              }
            }

            return blob
          }

          response.download = function (afilename) {
            saveAs(response.toBlob(), afilename)
          }

          resolve(response)
        } else {
          var error
          try {
            var body = responseToString(xhr.response)
            error = JSON.parse(body)
          } catch (e) {
          }

          reject({
            status: this.status,
            statusText: xhr.statusText,
            error: error,
            response: xhr.response
          })
        }
      }

      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText
        })
      }

      xhr.send(data)
    })
  }

  function _request (req) {
    var self = this
    var xhr = new XMLHttpRequest()
    xhr.open(req.method, this.serverUrl + req.path, true)
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8')
    Object.keys(this.headers).forEach(function (k) {
      xhr.setRequestHeader(k, self.headers[k])
    })

    var PromiseImpl = this.promise || window.Promise || undefined

    if (!PromiseImpl) {
      throw new Error('Native Promise is not supported in this browser. Use jsreport.Promise = bluebirdOrAnyOtherLib;')
    }

    return new PromiseImpl(function (resolve, reject) {
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          if (xhr.response) {
            return resolve(JSON.parse(xhr.response))
          }

          resolve(xhr.response)
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          })
        }
      }

      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText
        })
      }

      xhr.send(req.data ? JSON.stringify(req.data) : undefined)
    })
  }

  JsReport.prototype = {
    render: function (placeholder, request) {
      return _render.call(this, placeholder, request)
    },

    download: function (filename, request) {
      request.options = request.options || {}
      request.options['Content-Disposition'] = 'attachment;filename=' + filename
      return _render.call(this, '_self', request)
    },

    getTemplateByName: function (name) {
      return _request.call(this, {
        method: 'GET',
        path: '/odata/templates?$filter=name' + encodeURI(" eq '" + name + "'")
      }).then(function (r) {
        if (r.value.length === 0) {
          throw new Error('Template ' + name + ' not found')
        }
        return r.value[0]
      })
    },

    updateTemplate: function (template) {
      return _request.call(this, { method: 'PATCH', path: '/odata/templates(' + template._id + ')', data: template })
    },

    renderAsync: function (request) {
      return _renderAsync.call(this, request)
    }
  }

  var jsreportInstance = new JsReport()

  setTimeout(function () {
    if (window.jsreportInit !== undefined) {
      jsreportInit(jsreportInstance)
    }
  }, 0)

  var assign = Object.assign
  // polyfill for Object.assign
  if (!assign) {
    (function () {
      assign = function (target) {
        'use strict'
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert undefined or null to object')
        }

        var output = Object(target)
        for (var index = 1; index < arguments.length; index++) {
          var source = arguments[index]
          if (source !== undefined && source !== null) {
            for (var nextKey in source) {
              if (source.hasOwnProperty(nextKey)) {
                output[nextKey] = source[nextKey]
              }
            }
          }
        }
        return output
      }
    })()
  }

  if (window.jsreport) {
    Object.assign(jsreportInstance, window.jsreport)
  }

  return jsreportInstance
}))
