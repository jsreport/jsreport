const mingo = require('@jsreport/mingo')
const { cloneDocuments } = require('./customUtils')

class Store {
  constructor (documents = {}) {
    this._indexes = {
      _id: {}
    }
    this.documents = documents
    this._buildIndexes(documents)
  }

  _buildIndexes (documents) {
    this._indexes = {
      _id: {}
    }
    for (const es of Object.keys(documents)) {
      this._indexes._id[es] = {}
      for (const document of documents[es]) {
        this._indexes._id[es][document._id] = document
      }
    }
  }

  replace (adocuments) {
    this.documents = adocuments
    this._buildIndexes(this.documents)
  }

  insert (es, document) {
    this.documents[es].push(document)
    this._indexes._id[es][document._id] = document
  }

  remove (es, document) {
    delete this._indexes._id[es][document._id]
    this.documents[es] = this.documents[es].filter(d => d._id !== document._id)
  }

  find (es, query, fields) {
    if (query._id) {
      return mingo.find([this._indexes._id[es][query._id]], query, fields)
    }

    return mingo.find(this.documents[es], query, fields)
  }

  clone () {
    const clonedDocuments = cloneDocuments(this.documents)
    return new Store(clonedDocuments)
  }
}

module.exports = () => new Store({})
