
module.exports = (files) => {
  for (const file of files.filter(f => f.path.includes('ppt/slides/slide'))) {
    const slideDoc = file.doc

    if (!slideDoc.documentElement.hasAttribute('originalSlideNumber')) {
      continue
    }

    slideDoc.documentElement.removeAttribute('originalSlideNumber')
  }
}
