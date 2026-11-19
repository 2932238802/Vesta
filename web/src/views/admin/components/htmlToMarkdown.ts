// 富文本编辑器的 HTML → Markdown 转换。
//
// 覆盖编辑器会产生的常用格式：标题、段落、代码块 / 行内代码、加粗/斜体、
// 列表、引用、链接、图片和换行。其他标签按文本保留。URL 规则与
// `web/src/markdown.ts` 对齐：http/https、单个 `/` 开头的站内路径、普通
// 相对路径；拒绝 `//host` 与其他协议。输出顺序与空白稳定，便于
// 「编辑 → 保存 → 再打开」得到同样结果。

const INLINE_TAGS = new Set([
  'strong',
  'b',
  'em',
  'i',
  'a',
  'br',
  'span',
  'code',
  'del',
  's',
  'u',
  'sub',
  'sup',
  'mark',
  'img'
])

const CONTAINER_TAGS = new Set([
  'p',
  'div',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'nav',
  'aside',
  'figure',
  'figcaption',
  'li',
  'dl',
  'dt',
  'dd'
])

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, ' ')
}

function cleanInline(value: string): string {
  return normalizeText(value)
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
}

function backtickRun(value: string): number {
  const matches = value.match(/`+/g)
  return matches ? Math.max(...matches.map((item) => item.length)) : 0
}

function isSafeUrl(value: string): boolean {
  const url = value.trim()
  if (!url) return false
  if (/[\s\u0000-\u001f]/.test(url) || url.includes('\\')) return false
  if (/^https?:\/\//i.test(url)) return true
  // 拒绝协议相对地址 `//host`，避免绕过站内路径判断。
  if (url.startsWith('//')) return false
  if (url.startsWith('/')) return true
  // 普通相对路径允许；其他显式协议（javascript:、data:、mailto: 等）拒绝。
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false
  return true
}

function imageMarkdown(el: Element): string {
  const alt = cleanInline(el.getAttribute('alt') ?? '')
  const src = (el.getAttribute('src') ?? '').trim()
  if (!isSafeUrl(src)) return alt
  return `![${alt}](${src})`
}

function inlineChildren(node: Node, skipLists = false): string {
  let output = ''
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      output += child.textContent ?? ''
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as Element
    const tag = el.tagName.toLowerCase()
    if (skipLists && (tag === 'ul' || tag === 'ol')) continue
    output += inlineElement(el, skipLists)
  }
  return output
}

function inlineElement(el: Element, skipLists = false): string {
  const tag = el.tagName.toLowerCase()
  switch (tag) {
    case 'br':
      return '\n'
    case 'strong':
    case 'b': {
      const text = cleanInline(inlineChildren(el, skipLists))
      return text ? `**${text}**` : ''
    }
    case 'em':
    case 'i': {
      const text = cleanInline(inlineChildren(el, skipLists))
      return text ? `*${text}*` : ''
    }
    case 'a': {
      const text = cleanInline(inlineChildren(el, skipLists))
      const href = (el.getAttribute('href') ?? '').trim()
      if (!isSafeUrl(href)) return text
      const label = (text || href).replace(/\]/g, '\\]')
      return `[${label}](${href})`
    }
    case 'code': {
      const text = normalizeText(el.textContent ?? '')
      if (!text) return ''
      const ticks = '`'.repeat(backtickRun(text) + 1)
      return `${ticks}${text}${ticks}`
    }
    case 'img':
      return imageMarkdown(el)
    default:
      return inlineChildren(el, skipLists)
  }
}

function listBlocks(list: Element, ordered: boolean): string[] {
  const lines: string[] = []
  let index = 1

  for (const child of Array.from(list.children)) {
    if (child.tagName.toLowerCase() !== 'li') {
      lines.push(...elementBlocks(child))
      continue
    }

    const main = cleanInline(inlineChildren(child, true)).trim()
    if (main) lines.push(`${ordered ? `${index}.` : '-'} ${main}`)
    index += 1

    // 嵌套列表缩进两格；当前渲染器会按普通列表项显示，但文本不会丢。
    for (const nested of Array.from(child.children)) {
      const tag = nested.tagName.toLowerCase()
      if (tag !== 'ul' && tag !== 'ol') continue
      for (const line of listBlocks(nested, tag === 'ol')) lines.push(`  ${line}`)
    }
  }

  return lines.length ? [lines.join('\n')] : []
}

function elementBlocks(el: Element): string[] {
  const tag = el.tagName.toLowerCase()

  if (/^h[1-6]$/.test(tag)) {
    const text = cleanInline(inlineChildren(el)).trim()
    if (!text) return []
    return [`${'#'.repeat(Number(tag[1]))} ${text}`]
  }

  switch (tag) {
    case 'ul':
      return listBlocks(el, false)
    case 'ol':
      return listBlocks(el, true)
    case 'blockquote': {
      const inner = collectBlocks(el)
      if (!inner.length) return []
      return [
        inner
          .join('\n\n')
          .split('\n')
          .map((line) => (line ? `> ${line}` : '>'))
          .join('\n')
      ]
    }
    case 'pre': {
      const codeEl = el.querySelector('code')
      const source = codeEl ?? el
      const text = (source.textContent ?? '').replace(/\n+$/, '')
      if (!text.trim()) return []
      const classAttr = [source.getAttribute('class'), el.getAttribute('class')]
        .filter(Boolean)
        .join(' ')
      const language = /(?:^|\s)language-([A-Za-z0-9_+-]+)/.exec(classAttr)?.[1] ?? ''
      const fence = '`'.repeat(Math.max(3, backtickRun(text) + 1))
      return [`${fence}${language}\n${text}\n${fence}`]
    }
    case 'table': {
      // 表格不在编辑器能力内：保留单元格文本，避免整段内容丢失。
      const text = cleanInline(el.textContent ?? '').replace(/\n+/g, ' ').trim()
      return text ? [text] : []
    }
    case 'hr':
      return ['---']
    case 'img': {
      const image = imageMarkdown(el)
      return image ? [image] : []
    }
    case 'br':
      return []
    default: {
      if (CONTAINER_TAGS.has(tag) || el.children.length) return collectBlocks(el)
      const text = cleanInline(inlineChildren(el)).trim()
      return text ? [text] : []
    }
  }
}

function collectBlocks(parent: Node): string[] {
  const blocks: string[] = []
  let pending = ''

  const flush = () => {
    const text = cleanInline(pending).trim()
    if (text) blocks.push(text)
    pending = ''
  }

  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      pending += child.textContent ?? ''
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const el = child as Element
    const tag = el.tagName.toLowerCase()
    if (INLINE_TAGS.has(tag)) {
      pending += tag === 'br' ? '\n' : inlineElement(el)
      continue
    }

    flush()
    blocks.push(...elementBlocks(el))
  }

  flush()
  return blocks.filter((block) => block.trim().length > 0)
}

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return collectBlocks(doc.body).join('\n\n').trim()
}
