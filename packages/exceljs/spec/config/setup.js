const fs = require('fs');
const path = require('path');
const chai = require('chai');

const chaiXml = require('chai-xml');
const chaiDatetime = require('chai-datetime');
const dirtyChai = require('dirty-chai');

fs.mkdirSync(path.join(__dirname, '../out'), {recursive: true});
global.verquire = require('../utils/verquire');

global.expect = chai.expect;

chai.use(chaiXml);
chai.use(chaiDatetime);
chai.use(dirtyChai);
