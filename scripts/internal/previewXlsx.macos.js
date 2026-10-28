// hook for the xlsx preview of the jsreport-xlsx tests (see previewXlsx in packages/jsreport-xlsx/test/utils.js),
// it opens the template and the output xlsx side by side in Excel (template on the left half of the screen,
// output on the right half). it is only for macOS (it uses AppleScript).
// usage: XLSX_PREVIEW=/absolute/path/to/scripts/internal/previewXlsx.macos.js npm test
// the files are opened on every render, so when more than one render happens all the outputs
// are opened (one window over the other), the template window is reused when it is already open
const path = require('path')
const { execFileSync } = require('child_process')

module.exports = function previewXlsxMacos ({ templatePath, templateName, previewOutputPath }) {
  if (process.platform !== 'darwin') {
    console.warn('xlsx preview hook is only supported on macOS')
    return
  }

  // the template is usually the same for the different renders of a case (for example in the
  // tests for true and false), so when it is already open we reuse its window
  const templateIsOpen = execFileSync('osascript', ['-e', `
    on run argv
      if application "Microsoft Excel" is not running then return "false"
      tell application "Microsoft Excel" to return (exists workbook (item 1 of argv)) as text
    end run
  `, templateName]).toString().trim() === 'true'

  // opening with "open" (instead of from AppleScript) gives the sandboxed Excel access to the files.
  // the template is not passed when it is already open, because "open" would bring its window to the
  // front after the output window gets the focus
  execFileSync('open', ['-a', 'Microsoft Excel', ...(templateIsOpen ? [] : [templatePath]), previewOutputPath])

  execFileSync('osascript', ['-e', `
    on run argv
      set templateName to item 1 of argv
      set outputName to item 2 of argv
      tell application "Microsoft Excel"
        repeat 80 times
          if (exists workbook templateName) and (exists workbook outputName) then exit repeat
          delay 0.25
        end repeat
        set screenWidth to usable width
        set screenHeight to usable height
        set halfWidth to (screenWidth / 2) as integer
        -- macOS keeps the windows inside the visible area (below the menu bar, above the Dock)
        set bounds of window 1 of workbook templateName to {0, 0, halfWidth, screenHeight}
        set bounds of window 1 of workbook outputName to {halfWidth, 0, screenWidth, screenHeight}
        activate
        -- the template is brought to the front (it can be behind other windows when it was already open)
        -- and then the output, the last file opened, so its window gets the focus
        activate object workbook templateName
        activate object workbook outputName
      end tell
    end run
  `, templateName, path.basename(previewOutputPath)])
}
