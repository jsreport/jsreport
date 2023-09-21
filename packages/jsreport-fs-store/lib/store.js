const mingo = require('@jsreport/mingo')
const { cloneDocuments } = require('./customUtils')

class Store {
  constructor (documents = {}, { documentsModel }) {
    this._indexes = {
      _id: {},
      shortid: {},
      folder: {},
      nullFolder: {}
    }
    this.documents = documents
    this.documentsModel = documentsModel
    this._buildIndexes(documents)
  }

  _buildIndexes (documents) {
    this._indexes = {
      _id: {},
      shortid: {},
      folder: {},
      nullFolder: {}
    }
    for (const es of Object.keys(this.documentsModel.entitySets)) {
      this._indexes._id[es] = {}
      this._indexes.shortid[es] = {}

      if (this.documentsModel.entitySets[es].entityType.folder) {
        this._indexes.folder[es] = {}
        this._indexes.nullFolder[es] = []
      }

      if (documents[es]) {
        for (const document of documents[es]) {
          this._indexes._id[es][document._id] = document
          this._indexes.shortid[es][document.shortid] = document

          if (this.documentsModel.entitySets[es].entityType.folder) {
            if (document.folder?.shortid) {
              this._indexes.folder[es][document.folder?.shortid] = this._indexes.folder[es][document.folder?.shortid] || []
              this._indexes.folder[es][document.folder?.shortid].push(document)
            } else {
              this._indexes.nullFolder[es].push(document)
            }
          }
        }
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
    this._indexes.shortid[es][document.shortid] = document

    if (this.documentsModel.entitySets[es].entityType.folder) {
      if (document.folder?.shortid) {
        this._indexes.folder[es][document.folder.shortid] = this._indexes.folder[es][document.folder.shortid] || []
        this._indexes.folder[es][document.folder.shortid].push(document)
      } else {
        this._indexes.nullFolder[es].push(document)
      }
    }
  }

  update (es, document, set) {
    if (set.shortid && document.shortid !== set.shortid) {
      delete this._indexes.shortid[es][document.shortid]
      this._indexes.shortid[es][set.shortid] = document
    }

    if (this.documentsModel.entitySets[es].entityType.folder && set.folder !== undefined) {
      if (document.folder?.shortid !== set.folder?.shortid) {
        if (document.folder?.shortid) {
          this._indexes.folder[es][document.folder.shortid] = this._indexes.folder[es][document.folder.shortid].filter(d => d._id !== document._id)
        } else {
          this._indexes.nullFolder[es] = this._indexes.nullFolder[es].filter(d => d._id !== document._id)
        }

        if (set.folder?.shortid) {
          this._indexes.folder[es][set.folder?.shortid] = this._indexes.folder[es][set.folder?.shortid] || []
          this._indexes.folder[es][set.folder?.shortid].push(document)
        } else {
          this._indexes.nullFolder[es].push(document)
        }
      }
    }

    Object.assign(document, set)
    document.$$etag = Date.now()
  }

  remove (es, document) {
    if (this.documentsModel.entitySets[es].entityType.folder) {
      if (document.folder?.shortid) {
        this._indexes.folder[es][document.folder.shortid] = this._indexes.folder[es][document.folder.shortid].filter(d => d._id !== document._id)
      } else {
        this._indexes.nullFolder[es] = this._indexes.nullFolder[es].filter(d => d._id !== document._id)
      }
    }

    delete this._indexes._id[es][document._id]
    delete this._indexes.shortid[es][document.shortid]
    this.documents[es] = this.documents[es].filter(d => d._id !== document._id)
  }

  find (es, query, fields) {
    if (query._id && (typeof query._id === 'string' || query._id instanceof String)) {
      return mingo.find([this._indexes._id[es][query._id]], query, fields)
    }

    if (query.shortid && (typeof query.shortid === 'string' || query.shortid instanceof String)) {
      return mingo.find([this._indexes.shortid[es][query.shortid]], query, fields)
    }

    if (this.documentsModel.entitySets[es].entityType.folder) {
      if (query.folder?.shortid && (typeof query.folder?.shortid === 'string' || query.folder?.shortid instanceof String)) {
        return mingo.find(this._indexes.folder[es][query.folder.shortid] || [], query, fields)
      }

      if (query.folder && query.folder?.shortid === null) {
        return mingo.find(this._indexes.nullFolder[es] || [], query, fields)
      }
    }

    return mingo.find(this.documents[es], query, fields)
  }

  clone () {
    const clonedDocuments = cloneDocuments(this.documents)
    return new Store(clonedDocuments, { documentsModel: this.documentsModel })
  }
}

module.exports = (documents, options) => new Store(documents, options)
