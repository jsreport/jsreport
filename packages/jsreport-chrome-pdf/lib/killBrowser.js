const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms).unref())

function processExited (proc) {
  return proc.exitCode != null || proc.signalCode != null
}

async function killBrowser (browser, { gracefulMs = 0, exitMs = 4000 } = {}) {
  const proc = typeof browser.process === 'function' ? browser.process() : null

  const exited = proc == null
    ? Promise.resolve()
    : new Promise((resolve) => {
      if (processExited(proc)) {
        return resolve()
      }

      proc.once('exit', resolve)
    })

  if (gracefulMs > 0) {
    await Promise.race([browser.close().catch(() => {}), delay(gracefulMs)])
  }

  if (proc != null && !processExited(proc)) {
    try {
      process.kill(-proc.pid, 'SIGKILL')
    } catch (e) {
      try {
        proc.kill('SIGKILL')
      } catch (e) {}
    }
  }

  await Promise.race([exited, delay(exitMs)])

  try {
    browser.disconnect()
  } catch (e) {}
}

module.exports = { killBrowser }
