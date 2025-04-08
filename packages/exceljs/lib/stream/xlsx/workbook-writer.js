const {StringDecoder} = require('string_decoder');
const {Readable, Transform} = require('stream');
const {DOMParser} = require('@xmldom/xmldom');
const fs = require('fs');
const Archiver = require('archiver');
const unzip = require('unzipper');

const tmp = require('tmp');
const StreamBuf = require('../../utils/stream-buf');

const RelType = require('../../xlsx/rel-type');
const StylesXform = require('../../xlsx/xform/style/styles-xform');
const SharedStrings = require('../../utils/shared-strings');
const DefinedNames = require('../../doc/defined-names');

const CoreXform = require('../../xlsx/xform/core/core-xform');
const RelationshipsXform = require('../../xlsx/xform/core/relationships-xform');
const ContentTypesXform = require('../../xlsx/xform/core/content-types-xform');
const AppXform = require('../../xlsx/xform/core/app-xform');
const WorkbookXform = require('../../xlsx/xform/book/workbook-xform');
const SharedStringsXform = require('../../xlsx/xform/strings/shared-strings-xform');

const WorksheetWriter = require('./worksheet-writer');

const theme1Xml = require('../../xlsx/xml/theme1');

class WorkbookWriter {
  constructor(options) {
    options = options || {};

    this.created = options.created || new Date();
    this.modified = options.modified || this.created;
    this.creator = options.creator || 'ExcelJS';
    this.lastModifiedBy = options.lastModifiedBy || 'ExcelJS';
    this.lastPrinted = options.lastPrinted;

    // using shared strings creates a smaller xlsx file but may use more memory
    this.useSharedStrings = options.useSharedStrings || false;
    this.sharedStrings = new SharedStrings();

    // style manager
    if (options.template) {
      this.styles = new StylesXform(true);
    } else {
      this.styles = options.useStyles ? new StylesXform(true) : new StylesXform.Mock(true);
    }

    // defined names
    this._definedNames = new DefinedNames();

    this._worksheets = [];
    this._tmpWorksheets = new Map();
    this._cellStylesCache = new Map();
    this.views = [];

    this.zipOptions = options.zip;

    this.media = [];
    this.commentRefs = [];

    if (options.template) {
      this.templateBuf = options.template;
      this.templateWrites = [];
      this.templateInfo = {};
      this.templateZip = unzip.Parse();
    }

    this.zip = Archiver('zip', this.zipOptions);
    if (options.stream) {
      this.stream = options.stream;
    } else if (options.filename) {
      this.stream = fs.createWriteStream(options.filename);
    } else {
      this.stream = new StreamBuf();
    }
    this.zip.pipe(this.stream);

    // these bits can be added right now
    if (options.template) {
      this.promise = new Promise(resolve => resolve());
    } else {
      // these bits can be added right now
      this.promise = Promise.all([this.addThemes(), this.addOfficeRels()]);
    }
  }

  get definedNames() {
    return this._definedNames;
  }

  _getNextWorksheetId(name) {
    let id;

    if (this.templateInfo) {
      const existingWorkSheet = this.templateInfo.sheets.find(s => s.name === name);

      if (existingWorkSheet) {
        id = existingWorkSheet.sheetFileId;
      } else {
        id = this.nextId;
      }
    } else {
      id = this.nextId;
    }

    return id;
  }

  _openStream(path, sheetId) {
    const stream = new StreamBuf({bufSize: 65536, batch: true});
    const isWorksheet = sheetId != null;

    if (isWorksheet && this._tmpWorksheets.has(sheetId)) {
      const tmpWorksheet = this._tmpWorksheets.get(sheetId);
      tmpWorksheet.zipEntryPath = path;

      const tmpWriteStream = fs.createWriteStream(tmpWorksheet.tmpPath);

      tmpWorksheet.waitComplete = new Promise((resolve, reject) => {
        tmpWriteStream.on('error', reject);
        tmpWriteStream.on('finish', resolve);
      });

      stream.pipe(tmpWriteStream);
    } else {
      this.zip.append(stream, {name: path});
    }

    stream.on('finish', () => {
      stream.emit('zipped');
    });
    return stream;
  }

  _commitWorksheets() {
    const commitWorksheet = function(worksheet) {
      if (!worksheet.committed) {
        return new Promise(resolve => {
          worksheet.stream.on('zipped', () => {
            resolve();
          });
          worksheet.commit();
        });
      }
      return Promise.resolve();
    };
    // if there are any uncommitted worksheets, commit them now and wait
    const promises = this._worksheets.map(commitWorksheet);
    if (promises.length) {
      return Promise.all(promises);
    }
    return Promise.resolve();
  }

  async waitForTemplateParse() {
    const templateStream = Readable.from(this.templateBuf, {
      objectMode: false,
    });

    const files = {};
    const pendingOperations = [];
    const waitingWorkSheets = [];

    await new Promise((resolve, reject) => {
      this.templateZip.on('entry', entry => {
        switch (entry.path) {
          case '[Content_Types].xml':
          case 'xl/styles.xml':
          case 'xl/workbook.xml':
          case 'xl/_rels/workbook.xml.rels':
          case 'xl/calcChain.xml':
            pendingOperations.push(parseXMLFile(files, entry));
            break;
          default:
            if (entry.path.match(/xl\/worksheets\/sheet\d+[.]xml/)) {
              pendingOperations.push(new Promise((_resolve, _reject) => {
                // eslint-disable-next-line consistent-return
                tmp.file((err, tmpFilePath) => {
                  if (err) { return reject(err); }

                  const tempStream = fs.createWriteStream(tmpFilePath);

                  waitingWorkSheets.push({
                    ref: entry.path,
                    path: tmpFilePath,
                  });

                  entry.on('error', _reject);
                  tempStream.on('error', _reject);
                  tempStream.on('finish', _resolve);

                  entry.pipe(tempStream);
                });
              }));
            } else {
              this.templateWrites.push(new Promise(_resolve => {
                this.zip.append(entry, {name: entry.path});
                _resolve();
              }));
            }
            break;
        }
      });

      this.templateZip.on('close', () => {
        resolve();
      });

      this.templateZip.on('error', reject);

      templateStream.pipe(this.templateZip);
    });

    await Promise.all(pendingOperations);

    this.templateInfo.filesDocuments = files;

    const workbookDoc = this.templateInfo.filesDocuments['xl/workbook.xml'].doc;
    const relsDoc = this.templateInfo.filesDocuments['xl/_rels/workbook.xml.rels'].doc;

    let lastSheetId;
    let lastSheetFileId;

    const sheets = Array.from(workbookDoc.getElementsByTagName('sheet')).map(sheetNode => {
      const sheetId = parseInt(sheetNode.getAttribute('sheetId'), 10);
      const rId = sheetNode.getAttribute('r:id');
      const targetRNode = Array.from(relsDoc.getElementsByTagName('Relationship')).find(rNode => rNode.getAttribute('Id') === rId);
      const sheetFile = targetRNode.getAttribute('Target');
      const sheetFileId = parseInt(sheetFile.match(/worksheets\/sheet(\d+)[.]xml/)[1], 10);
      const sheetFileFound = waitingWorkSheets.find(w => w.ref === `xl/worksheets/sheet${sheetFileId}.xml`);

      if (lastSheetId == null || lastSheetId < sheetId) {
        lastSheetId = sheetId;
      }

      if (lastSheetFileId == null || lastSheetFileId < sheetFileId) {
        lastSheetFileId = sheetFileId;
      }

      return {
        id: sheetId,
        name: sheetNode.getAttribute('name'),
        rId,
        sheetFile,
        sheetFileId,
        sheetFileSrc: {
          path: sheetFileFound.path,
        },
      };
    });

    // take existing styles from template as the base of new styles
    await this.styles.parseStream(
      Readable.from(this.templateInfo.filesDocuments['xl/styles.xml'].originalSrc, {
        objectMode: false,
      })
    );

    const lastWorkbookRelsId = Array.from(
      relsDoc.getElementsByTagName('Relationship')
    ).reduce((acu, relNode) => {
      const rId = relNode.getAttribute('Id');
      const rIdNumber = parseInt(rId.match(/rId(\d+)/)[1], 10);

      if (rIdNumber > acu) {
        return rIdNumber;
      }

      return acu;
    }, 0);

    this.templateInfo.sheets = sheets;
    this.templateInfo.lastSheetId = lastSheetId;
    this.templateInfo.lastSheetFileId = lastSheetFileId;
    this.templateInfo.lastWorkbookRelsId = lastWorkbookRelsId;
  }

  async commit() {
    // commit all worksheets, then add supplementary files
    await this.promise;

    if (this.templateWrites) {
      await Promise.all(this.templateWrites);
    }

    await this.addMedia();

    const newWorksheets = [];
    const newWorksheetsColsWidth = new Map();

    this._worksheets.forEach(w => {
      if (w == null) {
        return;
      }

      // eslint-disable-next-line no-underscore-dangle
      if (Array.isArray(w._columns)) {
        // eslint-disable-next-line no-underscore-dangle
        newWorksheetsColsWidth.set(w.id, w._columns.map(c => {
          return {
            // eslint-disable-next-line no-underscore-dangle
            number: c._number,
            width: c.width,
          };
        }));
      }

      newWorksheets.push(w);
    });

    let replacedWorksheets = [];

    if (this.templateInfo) {
      this.templateInfo.sheets.forEach(sheet => {
        const existingWorksheetIndex = newWorksheets.findIndex(w => w.name === sheet.name);

        if (existingWorksheetIndex !== -1) {
          sheet.replaced = true;
          // eslint-disable-next-line no-underscore-dangle
          sheet.calcCells = newWorksheets[existingWorksheetIndex]._calcCells;
          newWorksheets.splice(existingWorksheetIndex, 1);
          return;
        }

        this.zip.append(fs.createReadStream(sheet.sheetFileSrc.path), {
          name: `xl/worksheets/sheet${sheet.sheetFileId}.xml`,
        });
      });

      replacedWorksheets = this.templateInfo.sheets.filter(s => s.replaced === true);
    }

    await this._commitWorksheets();

    if (this.templateInfo) {
      // eslint-disable-next-line no-restricted-syntax
      for (const [fileName, {doc: fileDoc, originalSrc}] of Object.entries(this.templateInfo.filesDocuments)) {
        let content = originalSrc;

        if (fileName === '[Content_Types].xml' && newWorksheets.length > 0) {
          const sheetNodeRef = Array.from(
            fileDoc.getElementsByTagName('Override')
          ).find(node => {
            return node.getAttribute('PartName') === `/xl/worksheets/sheet${this.templateInfo.lastSheetFileId}.xml`;
          });

          // eslint-disable-next-line no-restricted-syntax
          for (const newWorksheet of newWorksheets) {
            const newWorkSheetRef = sheetNodeRef.cloneNode();
            newWorkSheetRef.setAttribute('PartName', `/xl/worksheets/sheet${newWorksheet.id}.xml`);
            sheetNodeRef.parentNode.insertBefore(newWorkSheetRef, sheetNodeRef.nextSibling);
          }

          content = fileDoc.toString();
        } else if (fileName === 'xl/styles.xml') {
          content = this.styles.xml;
        } else if (fileName === 'xl/workbook.xml' && newWorksheets.length > 0) {
          const sheetsNode = fileDoc.getElementsByTagName('sheets')[0];

          for (let i = 0; i < newWorksheets.length; i++) {
            const newWorksheet = newWorksheets[i];
            const newSheetNode = fileDoc.createElement('sheet');
            newSheetNode.setAttribute('name', newWorksheet.name);
            newSheetNode.setAttribute('sheetId', this.templateInfo.lastSheetId + i + 1);
            newSheetNode.setAttribute('r:id', `rId${this.templateInfo.lastWorkbookRelsId + i + 1}`);
            sheetsNode.appendChild(newSheetNode);
          }

          content = fileDoc.toString();
        } else if (fileName === 'xl/_rels/workbook.xml.rels' && newWorksheets.length > 0) {
          const relationshipsNode = fileDoc.getElementsByTagName('Relationships')[0];

          for (let i = 0; i < newWorksheets.length; i++) {
            const newWorksheet = newWorksheets[i];
            const newRelNode = fileDoc.createElement('Relationship');
            newRelNode.setAttribute('Id', `rId${this.templateInfo.lastWorkbookRelsId + i + 1}`);
            newRelNode.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet');
            newRelNode.setAttribute('Target', `worksheets/sheet${newWorksheet.id}.xml`);
            relationshipsNode.appendChild(newRelNode);
          }

          content = fileDoc.toString();
        } else if (fileName === 'xl/calcChain.xml' && replacedWorksheets.length > 0) {
          const calcChainNode = fileDoc.getElementsByTagName('calcChain')[0];
          const cellRefNodes = Array.from(fileDoc.getElementsByTagName('c'));

          const existingCalcCells = {};

          cellRefNodes.forEach(cellRefNode => {
            const worksheetIndex = parseInt(cellRefNode.getAttribute('i'), 10);
            const cellRef = cellRefNode.getAttribute('r');
            const replacedWorksheetFound = replacedWorksheets.find(w => w.id === worksheetIndex);

            if (!replacedWorksheetFound) {
              return;
            }

            if (!replacedWorksheetFound.calcCells[cellRef]) {
              cellRefNode.parentNode.removeChild(cellRefNode);
            } else {
              existingCalcCells[worksheetIndex] = existingCalcCells[worksheetIndex] || {};
              existingCalcCells[worksheetIndex][cellRef] = true;
            }
          });

          replacedWorksheets.forEach(replacedWorksheet => {
            const calcCellsInWorksheet = existingCalcCells[replacedWorksheet.id] || {};

            // eslint-disable-next-line no-restricted-syntax
            for (const [cellAddress] of Object.entries(replacedWorksheet.calcCells)) {
              if (!calcCellsInWorksheet[cellAddress]) {
                const newCellRef = fileDoc.createElement('c');
                newCellRef.setAttribute('r', cellAddress);
                newCellRef.setAttribute('i', replacedWorksheet.id);
                calcChainNode.appendChild(newCellRef);
              }
            }
          });

          content = fileDoc.toString();
        }

        this.zip.append(content, {
          name: fileName,
        });
      }
    } else {
      await Promise.all([
        this.addContentTypes(),
        this.addApp(),
        this.addCore(),
        this.addSharedStrings(),
        this.addStyles(),
        this.addWorkbookRels(),
      ]);

      await this.addWorkbook();
    }

    const tmpWorksheetCompletePromises = [];

    this._tmpWorksheets.forEach(value => {
      tmpWorksheetCompletePromises.push(value.waitComplete);
    });

    await Promise.all(tmpWorksheetCompletePromises);

    const worksheetsToCopy = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const [sheetId, tmpWorksheet] of this._tmpWorksheets.entries()) {
      worksheetsToCopy.push({
        sheetId,
        tmpWorksheet,
      });
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const w of worksheetsToCopy) {
      const {sheetId, tmpWorksheet} = w;

      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve, reject) => {
        const worksheetStream = fs.createReadStream(tmpWorksheet.tmpPath);
        const decoder = new StringDecoder('utf8');
        let placeholderFound = false;

        const distStream = new Transform({
          transform: (chunk, enc, cb) => {
            const chunkStr = decoder.write(chunk);

            if (!placeholderFound && chunkStr.includes('$colsContent')) {
              placeholderFound = true;
              let colsXML = this._worksheets[sheetId].rawColsXML;

              colsXML = colsXML.slice('<cols>'.length).slice(0, '</cols>'.length * -1);

              cb(null, chunkStr.replace('$colsContent', colsXML));
            } else {
              cb(null, chunkStr);
            }
          },
          flush: cb => {
            const str = decoder.end();

            if (str !== '') {
              cb(null, str);
            } else {
              cb();
            }
          },
        });

        distStream.on('finish', resolve);
        worksheetStream.on('error', reject);
        distStream.on('error', reject);

        this.zip.append(distStream, {
          name: tmpWorksheet.zipEntryPath,
        });

        worksheetStream.pipe(distStream);
      });
    }

    const result = await this._finalize();

    return result;
  }

  get nextId() {
    let id;
    // find the next unique spot to add worksheet
    let i;

    if (this.templateInfo && this.templateInfo.lastSheetFileId != null) {
      const existingSheetsId = this.templateInfo.sheets.map(s => s.sheetFileId);

      const existingSheets = Object.values(this._worksheets).filter(o => {
        return existingSheetsId.includes(o.id) === false;
      });

      return this.templateInfo.lastSheetFileId + existingSheets.length + 1;
    }

    for (i = 1; i < this._worksheets.length; i++) {
      if (!this._worksheets[i]) {
        id = i;
        break;
      }
    }

    if (id == null) {
      id = this._worksheets.length || 1;
    }

    return id;
  }

  addImage(image) {
    const id = this.media.length;
    const medium = Object.assign({}, image, {type: 'image', name: `image${id}.${image.extension}`});
    this.media.push(medium);
    return id;
  }

  getImage(id) {
    return this.media[id];
  }

  addWorksheet(name, options) {
    // it's possible to add a worksheet with different than default
    // shared string handling
    // in fact, it's even possible to switch it mid-sheet
    options = options || {};
    const useSharedStrings =
      options.useSharedStrings !== undefined ? options.useSharedStrings : this.useSharedStrings;

    if (options.tabColor) {
      // eslint-disable-next-line no-console
      console.trace('tabColor option has moved to { properties: tabColor: {...} }');
      options.properties = Object.assign(
        {
          tabColor: options.tabColor,
        },
        options.properties
      );
    }

    let id;

    if (options.id) {
      // eslint-disable-next-line prefer-destructuring
      id = options.id;
      delete options.id;
    } else {
      id = this._getNextWorksheetId(name);
    }

    name = name || `sheet${id}`;

    const worksheet = new WorksheetWriter({
      id,
      name,
      async: options.async === true,
      workbook: this,
      useSharedStrings,
      properties: options.properties,
      state: options.state,
      pageSetup: options.pageSetup,
      views: options.views,
      autoFilter: options.autoFilter,
      headerFooter: options.headerFooter,
    });

    this._worksheets[id] = worksheet;
    return worksheet;
  }

  async addWorksheetAsync(name, options) {
    const id = this._getNextWorksheetId(name);

    const tmpPath = await new Promise((resolve, reject) => {
      // eslint-disable-next-line consistent-return
      tmp.file((err, tmpFilePath) => {
        if (err) { return reject(err); }
        resolve(tmpFilePath);
      });
    });

    this._tmpWorksheets.set(id, {
      tmpPath,
    });

    return this.addWorksheet(name, {
      ...options,
      async: true,
      id,
    });
  }

  getWorksheet(id) {
    if (id === undefined) {
      return this._worksheets.find(() => true);
    }
    if (typeof id === 'number') {
      return this._worksheets[id];
    }
    if (typeof id === 'string') {
      return this._worksheets.find(worksheet => worksheet && worksheet.name === id);
    }
    return undefined;
  }

  addStyles() {
    return new Promise(resolve => {
      this.zip.append(this.styles.xml, {name: 'xl/styles.xml'});
      resolve();
    });
  }

  addThemes() {
    return new Promise(resolve => {
      this.zip.append(theme1Xml, {name: 'xl/theme/theme1.xml'});
      resolve();
    });
  }

  addOfficeRels() {
    return new Promise(resolve => {
      const xform = new RelationshipsXform();
      const xml = xform.toXml([
        {Id: 'rId1', Type: RelType.OfficeDocument, Target: 'xl/workbook.xml'},
        {Id: 'rId2', Type: RelType.CoreProperties, Target: 'docProps/core.xml'},
        {Id: 'rId3', Type: RelType.ExtenderProperties, Target: 'docProps/app.xml'},
      ]);
      this.zip.append(xml, {name: '/_rels/.rels'});
      resolve();
    });
  }

  addContentTypes() {
    return new Promise(resolve => {
      const model = {
        worksheets: this._worksheets.filter(Boolean),
        sharedStrings: this.sharedStrings,
        commentRefs: this.commentRefs,
        media: this.media,
      };
      const xform = new ContentTypesXform();
      const xml = xform.toXml(model);
      this.zip.append(xml, {name: '[Content_Types].xml'});
      resolve();
    });
  }

  addMedia() {
    return Promise.all(
      this.media.map(medium => {
        if (medium.type === 'image') {
          const filename = `xl/media/${medium.name}`;
          if (medium.filename) {
            return this.zip.file(medium.filename, {name: filename});
          }
          if (medium.buffer) {
            return this.zip.append(medium.buffer, {name: filename});
          }
          if (medium.base64) {
            const dataimg64 = medium.base64;
            const content = dataimg64.substring(dataimg64.indexOf(',') + 1);
            return this.zip.append(content, {name: filename, base64: true});
          }
        }
        throw new Error('Unsupported media');
      })
    );
  }

  addApp() {
    return new Promise(resolve => {
      const model = {
        worksheets: this._worksheets.filter(Boolean),
      };
      const xform = new AppXform();
      const xml = xform.toXml(model);
      this.zip.append(xml, {name: 'docProps/app.xml'});
      resolve();
    });
  }

  addCore() {
    return new Promise(resolve => {
      const coreXform = new CoreXform();
      const xml = coreXform.toXml(this);
      this.zip.append(xml, {name: 'docProps/core.xml'});
      resolve();
    });
  }

  addSharedStrings() {
    if (this.sharedStrings.count) {
      return new Promise(resolve => {
        const sharedStringsXform = new SharedStringsXform();
        const xml = sharedStringsXform.toXml(this.sharedStrings);
        this.zip.append(xml, {name: '/xl/sharedStrings.xml'});
        resolve();
      });
    }
    return Promise.resolve();
  }

  addWorkbookRels() {
    let count = 1;
    const relationships = [
      {Id: `rId${count++}`, Type: RelType.Styles, Target: 'styles.xml'},
      {Id: `rId${count++}`, Type: RelType.Theme, Target: 'theme/theme1.xml'},
    ];
    if (this.sharedStrings.count) {
      relationships.push({
        Id: `rId${count++}`,
        Type: RelType.SharedStrings,
        Target: 'sharedStrings.xml',
      });
    }
    this._worksheets.forEach(worksheet => {
      if (worksheet) {
        worksheet.rId = `rId${count++}`;
        relationships.push({
          Id: worksheet.rId,
          Type: RelType.Worksheet,
          Target: `worksheets/sheet${worksheet.id}.xml`,
        });
      }
    });
    return new Promise(resolve => {
      const xform = new RelationshipsXform();
      const xml = xform.toXml(relationships);
      this.zip.append(xml, {name: '/xl/_rels/workbook.xml.rels'});
      resolve();
    });
  }

  addWorkbook() {
    const {zip} = this;
    const model = {
      worksheets: this._worksheets.filter(Boolean),
      definedNames: this._definedNames.model,
      views: this.views,
      properties: {},
      calcProperties: {},
    };

    return new Promise(resolve => {
      const xform = new WorkbookXform();
      xform.prepare(model);
      zip.append(xform.toXml(model), {name: '/xl/workbook.xml'});
      resolve();
    });
  }

  _finalize() {
    return new Promise((resolve, reject) => {
      this.stream.on('error', reject);
      this.stream.on('finish', () => {
        resolve(this);
      });
      this.zip.on('error', reject);

      this.zip.finalize();
    });
  }
}

async function parseXMLFile(files, entry) {
  const xml = (await entry.buffer()).toString();
  const doc = new DOMParser().parseFromString(xml);

  files[entry.path] = {
    originalSrc: xml,
    doc,
  };
}

module.exports = WorkbookWriter;
