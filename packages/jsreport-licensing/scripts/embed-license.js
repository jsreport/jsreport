const { join } = require("path");
const { writeFileSync, readFileSync } = require("fs");

const licenseFile = join(__dirname, "..", "..", "..", "embeddable-license.txt");
let licenseValue;

try {
  licenseValue = process.env.EMBEDDABLE_LICENSE_VALUE || readFileSync(licenseFile, "utf8");
} catch (e) {
  console.error("Looking for embeddable license file", e.message);
  licenseValue = "";
}

const distFilePath = join(__dirname, "..", "lib", "embedded-license.js");
const fileContent = readFileSync(distFilePath, "utf8");

let editedFileContent = fileContent;

const regex = RegExp(/module.exports.embeddedLicense = \'.*\';/g);
const match = fileContent.match(regex);
if (match.length) {
  editedFileContent = fileContent.replace(
    regex,
    `module.exports.embeddedLicense = '${licenseValue}';`
  );
}

writeFileSync(distFilePath, editedFileContent, "utf8");