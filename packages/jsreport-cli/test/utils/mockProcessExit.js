let _originalProcessExit
let _hasBeenCalled = false
let _exitCode
let callInfo = {}

exports.enable = () => {
  _originalProcessExit = process.exit

  _exitCode = undefined
  _hasBeenCalled = false

  process.exit = (exitCode) => {
    _exitCode = exitCode
    _hasBeenCalled = true
  }
}

exports.callInfo = () => callInfo

exports.restore = () => {
  process.exit = _originalProcessExit

  callInfo = {
    called: _hasBeenCalled,
    exitCode: _exitCode
  }
}
