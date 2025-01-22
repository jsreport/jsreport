
const elements = [
  {
    type: 'inline',
    tag: 'span'
  },
  {
    tag: 'p',
    alias: 'div'
  },
  {
    type: 'inline',
    tag: 'b',
    alias: 'strong'
  },
  {
    type: 'inline',
    tag: 'i',
    alias: 'em'
  },
  {
    type: 'inline',
    tag: 'u',
    alias: 'ins'
  },
  {
    type: 'inline',
    tag: 'br'
  },
  {
    type: 'inline',
    tag: 'sub',
    alias: 'small'
  },
  {
    type: 'inline',
    tag: 'sup'
  },
  {
    type: 'inline',
    tag: 's',
    alias: 'del'
  },
  {
    type: 'inline',
    tag: 'code'
  },
  {
    type: 'inline',
    tag: 'a'
  },
  {
    type: 'inline',
    tag: 'img'
  },
  {
    tag: 'pre'
  },
  {
    tag: 'h1'
  },
  {
    tag: 'h2'
  },
  {
    tag: 'h3'
  },
  {
    tag: 'h4'
  },
  {
    tag: 'h5'
  },
  {
    tag: 'h6'
  },
  {
    tag: 'ul'
  },
  {
    tag: 'ol'
  },
  {
    tag: 'li'
  },
  {
    tag: 'table'
  },
  {
    tag: 'caption'
  },
  {
    tag: 'colgroup',
    meta: true
  },
  {
    tag: 'col',
    meta: true
  },
  {
    tag: 'thead'
  },
  {
    tag: 'tbody'
  },
  {
    tag: 'tfoot'
  },
  {
    tag: 'tr'
  },
  {
    tag: 'td'
  },
  {
    tag: 'th'
  }
]

const ELEMENTS = elements.map((el) => {
  const normalized = { ...el }

  if (normalized.tag == null || normalized.tag === '') {
    throw new Error(`Invalid element definition, tag "${normalized.type}" must be a non-empty string`)
  }

  if (normalized.type == null) {
    normalized.type = 'block'
  }

  if (normalized.type !== 'block' && normalized.type !== 'inline') {
    throw new Error(`Invalid element definition, type "${normalized.type}" is not supported`)
  }

  if (normalized.alias != null) {
    normalized.alias = Array.isArray(normalized.alias) ? normalized.alias : [normalized.alias]
  }

  return normalized
})

const BLOCK_ELEMENTS = []
const INLINE_ELEMENTS = []
const META_ELEMENTS = []

for (const el of ELEMENTS) {
  let collection

  if (el.type === 'block') {
    collection = BLOCK_ELEMENTS
  } else if (el.type === 'inline') {
    collection = INLINE_ELEMENTS
  }

  if (collection == null) {
    continue
  }

  collection.push(el.tag)

  if (el.alias != null) {
    collection.push(...el.alias)
  }

  if (el.meta === true) {
    META_ELEMENTS.push(el.tag)

    if (el.alias != null) {
      META_ELEMENTS.push(...el.alias)
    }
  }
}

const SUPPORTED_ELEMENTS = [...BLOCK_ELEMENTS, ...INLINE_ELEMENTS]

module.exports.ELEMENTS = ELEMENTS
module.exports.BLOCK_ELEMENTS = BLOCK_ELEMENTS
module.exports.INLINE_ELEMENTS = INLINE_ELEMENTS
module.exports.META_ELEMENTS = META_ELEMENTS
module.exports.SUPPORTED_ELEMENTS = SUPPORTED_ELEMENTS
