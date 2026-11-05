// 收藏栏使用的轻量 Markdown 渲染。
//
// 只支持常用的块级与行内语法：标题、段落、加粗/斜体、删除线、列表、
// 引用、代码、链接和图片。所有原文先转义，再插入固定标签，链接只允许
// http/https（含站内相对地址），避免 v-html 注入。

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeUrl(raw: string): string {
  const url = raw.replace(/&amp;/g, '&').trim()
  if (!url) return ''
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return escapeHtml(url)
    }
  } catch {
    // 非法地址按纯文本保留
  }
  return ''
}

function renderEmphasis(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>')
}

export function renderInlineMarkdown(input: string): string {
  const stash: string[] = []
  const hold = (html: string) => {
    stash.push(html)
    return `\u0000${stash.length - 1}\u0000`
  }

  let text = escapeHtml(input)
  text = text.replace(/`([^`]+)`/g, (_match, code: string) => hold(`<code>${code}</code>`))
  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (match, alt: string, url: string) => {
      const safe = safeUrl(url)
      return safe ? hold(`<img src="${safe}" alt="${alt}" loading="lazy">`) : match
    }
  )
  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (match, label: string, url: string) => {
      const safe = safeUrl(url)
      if (!safe) return match
      return hold(
        `<a href="${safe}" target="_blank" rel="noopener noreferrer">${renderEmphasis(label)}</a>`
      )
    }
  )
  text = renderEmphasis(text)
  return text.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => stash[Number(index)] ?? '')
}

function isBlockStart(line: string): boolean {
  const value = line.trim()
  return (
    /^```/.test(value) ||
    /^#{1,6}\s+/.test(value) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(value)
  )
}

export function renderMarkdown(source: string): string {
  const lines = (source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = /^```(\w*)\s*$/.exec(line.trim())
    if (fence) {
      const language = fence[1]
      const code: string[] = []
      index += 1
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        code.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      const className = language ? ` class="language-${escapeHtml(language)}"` : ''
      out.push(`<pre><code${className}>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      out.push(
        `<h${level}>${renderInlineMarkdown(heading[2].trim())}</h${level}>`
      )
      index += 1
      continue
    }

    if (/^((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line.trim())) {
      out.push('<hr>')
      index += 1
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      out.push(
        `<blockquote>${quote.map((item) => renderInlineMarkdown(item)).join('<br>')}</blockquote>`
      )
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(`<li>${renderInlineMarkdown(lines[index].replace(/^\s*[-*+]\s+/, ''))}</li>`)
        index += 1
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(`<li>${renderInlineMarkdown(lines[index].replace(/^\s*\d+[.)]\s+/, ''))}</li>`)
        index += 1
      }
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    if (paragraph.length) {
      out.push(`<p>${paragraph.map((item) => renderInlineMarkdown(item)).join('<br>')}</p>`)
    } else {
      // 理论上不会到这里；兜底避免死循环。
      index += 1
    }
  }

  return out.join('\n')
}
