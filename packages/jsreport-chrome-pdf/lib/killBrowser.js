// Ends a browser that no render will use again, inside a bounded time. Used
// with chrome.killOnClose when a worker closes (a report timeout, a cancelled
// request, a shutdown) and when the pool recycles a browser after a crash or a
// timeout.
//
// The worker close has a hard deadline: the worker thread is terminated 5 s
// after it is asked to close (advanced-workers closeTimeout), and a terminated
// thread takes its references to the browser with it. A browser that is still
// alive then runs until the process ends, and one that exits later is never
// reaped. A graceful close cannot be trusted to end inside that time:
// browser.close() sends Browser.close and then awaits the process exit with no
// timeout (puppeteer BrowserLauncher.closeBrowser), and a page that is
// mid-render does not always exit on Browser.close. So the browser gets
// SIGKILL, at once or after a graceful attempt when the caller asks for one,
// and its exit is awaited: the thread that spawned the process is the one that
// reaps it, and puppeteer removes the temporary profile directory from the
// exit event of the process (BrowserLauncher onProcessExit), killed or not.
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
    // puppeteer launches the browser detached, so its pid is a process group id
    // and the group kill takes the renderers and the zygote with it.
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
