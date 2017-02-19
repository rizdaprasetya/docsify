let INDEXS = {}
let helper

function escapeHtml (string) {
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
    '/': '&#x2F;'
  }

  return String(string).replace(/[&<>"'\/]/g, s => entityMap[s])
}

function getAllPaths () {
  const paths = []

  helper.dom.findAll('a')
    .map(node => {
      const href = node.href
      const originHref = node.getAttribute('href')
      const path = helper.route.parse(href).path

      if (paths.indexOf(path) === -1 &&
        !helper.route.isAbsolutePath(originHref)) {
        paths.push(path)
      }
    })

  return paths
}

function saveData (maxAge) {
  localStorage.setItem('docsify.search.expires', Date.now() + maxAge)
  localStorage.setItem('docsify.search.index', JSON.stringify(INDEXS))
}

export function genIndex (path, content = '') {
  const tokens = window.marked.lexer(content)
  const toURL = Docsify.route.toURL
  let slug

  tokens.forEach(token => {
    if (token.type === 'heading' && token.depth === 1) {
      slug = toURL(path, { id: token.text })
      INDEXS[slug] = { slug, title: token.text, body: '' }
    } else {
      if (!slug) return
      if (!INDEXS[slug]) {
        INDEXS[slug] = { slug, title: '', body: '' }
      } else {
        if (INDEXS[slug].body) {
          INDEXS[slug].body += '\n' + (token.text || '')
        } else {
          INDEXS[slug].body = token.text
        }
      }
    }
  })
}

export function search (keywords) {
  const matchingResults = []
  const data = Object.keys(INDEXS).map(key => INDEXS[key])

  keywords = keywords.trim().split(/[\s\-\，\\/]+/)

  for (let i = 0; i < data.length; i++) {
    const post = data[i]
    let isMatch = false
    let resultStr = ''
    const postTitle = post.title && post.title.trim()
    const postContent = post.body && post.body.trim()
    const postUrl = post.slug || ''

    if (postTitle !== '' && postContent !== '') {
      keywords.forEach((keyword, i) => {
        const regEx = new RegExp(keyword, 'gi')
        let indexTitle = -1
        let indexContent = -1

        indexTitle = postTitle.search(regEx)
        indexContent = postContent.search(regEx)

        if (indexTitle < 0 && indexContent < 0) {
          isMatch = false
        } else {
          isMatch = true
          if (indexContent < 0) indexContent = 0

          let start = 0
          let end = 0

          start = indexContent < 11 ? 0 : indexContent - 10
          end = start === 0 ? 70 : indexContent + keyword.length + 60

          if (end > postContent.length) end = postContent.length

          const matchContent = '...' +
            postContent
              .substring(start, end)
              .replace(regEx, `<em class="search-keyword">${keyword}</em>`) +
              '...'

          resultStr += matchContent
        }
      })

      if (isMatch) {
        const matchingPost = {
          title: escapeHtml(postTitle),
          content: resultStr,
          url: postUrl
        }

        matchingResults.push(matchingPost)
      }
    }
  }

  return matchingResults
}

export function init (config, vm) {
  helper = Docsify

  const isAuto = config.paths === 'auto'
  const isExpired = localStorage.getItem('docsify.search.expires') < Date.now()

  INDEXS = JSON.parse(localStorage.getItem('docsify.search.index'))

  if (isExpired) {
    INDEXS = {}
  } else if (!isAuto) {
    return
  }

  const paths = isAuto ? getAllPaths() : config.paths
  const len = paths.length
  let count = 0

  paths.forEach(path => {
    if (INDEXS[path]) return count++

    path = vm.$getFile(path)
    helper
      .get(path)
      .then(result => {
        genIndex(path, result)
        len === ++count && saveData(config.maxAge)
      })
  })
}
