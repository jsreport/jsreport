module.exports = class DocumentBase {
  get pages () {
    function collectPages (pagesObj, pages) {
      for (const page of pagesObj.properties.get('Kids').map(k => k.object)) {
        if (page.properties.get('Type').name === 'Pages') {
          collectPages(page, pages)
        } else {
          pages.push(page)
        }
      }
    }
    const pages = []
    collectPages(this.catalog.properties.get('Pages').object, pages)
    return pages
  }
}
