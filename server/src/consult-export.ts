import zlib from 'node:zlib'
import type { ConsultBeat, ConsultRun, ConsultRunSection } from '../../shared/src/consult'

// 咨询稿导出：把已经写好的模块整理成一份可以直接看、可以打印的文档。
// 这里不依赖任何第三方库：HTML 直接拼字符串，docx 用一个最小的 zip 写入器包出 OOXML。
// 导出的正文和页面里的“拼好的全文”一致，只额外加上标题和日期。

export type ConsultExportFormat = 'html' | 'docx' | 'txt'

export interface ConsultExportParagraph {
  style: 'line' | 'student' | 'direction' | 'branch'
  text: string
}

export interface ConsultExportSection {
  heading: string
  paragraphs: ConsultExportParagraph[]
}

export interface ConsultExportModel {
  title: string
  subtitle: string
  sections: ConsultExportSection[]
}

const CHINESE_NUMBERS = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十'
]

function cleanText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    // XML 不允许的控制字符，顺手清掉，避免生成的 docx 打不开。
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
}

function beatToParagraph(beat: ConsultBeat): ConsultExportParagraph | null {
  const text = cleanText(beat.text)
  if (!text) return null
  if (beat.kind === 'student') return { style: 'student', text: `学生：${text}` }
  if (beat.kind === 'direction') return { style: 'direction', text: `（${text}）` }
  if (beat.kind === 'branch') {
    const when = cleanText(beat.when ?? '')
    return { style: 'branch', text: when ? `${when}：${text}` : `如果情况不同：${text}` }
  }
  // line 和 ask 都按咨询师的话处理，和正文拼接的规则保持一致。
  return { style: 'line', text: `咨询师：${text}` }
}

function legacyParagraph(line: string): ConsultExportParagraph | null {
  const text = cleanText(line)
  if (!text) return null
  if (text.startsWith('学生：')) return { style: 'student', text }
  if (text.startsWith('（') && text.endsWith('）')) return { style: 'direction', text }
  return { style: 'line', text }
}

function paragraphsFromSection(section: ConsultRunSection): ConsultExportParagraph[] {
  const beats = section.beats.map(beatToParagraph).filter((item): item is ConsultExportParagraph => Boolean(item))
  if (beats.length) return beats
  // 旧模块没有节拍，正文按行拆开，保留原来的咨询师/学生标记。
  return section.content
    .split(/\n+/)
    .map(legacyParagraph)
    .filter((item): item is ConsultExportParagraph => Boolean(item))
}

export function buildConsultExportModel(run: ConsultRun): ConsultExportModel | null {
  const sections: ConsultExportSection[] = []
  for (const section of run.sections) {
    if (section.status !== 'ready') continue
    const paragraphs = paragraphsFromSection(section)
    if (!paragraphs.length) continue
    const index = sections.length
    const title = cleanText(section.title) || '未命名模块'
    sections.push({
      heading: `${CHINESE_NUMBERS[index] ?? String(index + 1)}、${title}`,
      paragraphs
    })
  }
  if (!sections.length) return null

  const name = cleanText(run.context.name ?? '')
  const date = (run.createdAt || new Date().toISOString()).slice(0, 10)
  const subtitle = [name, cleanText(run.templateName) || '咨询稿', date].filter(Boolean).join(' · ')
  return { title: '咨询稿', subtitle, sections }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderConsultHtml(model: ConsultExportModel): string {
  const sections = model.sections
    .map((section) => {
      const paragraphs = section.paragraphs
        .map((paragraph) => `<p class="${paragraph.style}">${escapeHtml(paragraph.text)}</p>`)
        .join('\n')
      return `<section class="module">\n<h2>${escapeHtml(section.heading)}</h2>\n${paragraphs}\n</section>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(model.title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px 16px 64px;
    background: #f3f1ec;
    color: #24221f;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
    font-size: 15px;
    line-height: 1.9;
  }
  .doc {
    max-width: 760px;
    margin: 0 auto;
    padding: 56px 64px 72px;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 12px 32px rgba(0, 0, 0, .06);
  }
  header { text-align: center; padding-bottom: 28px; border-bottom: 1px solid #e8e3d9; margin-bottom: 36px; }
  h1 { margin: 0 0 10px; font-size: 26px; letter-spacing: .12em; }
  .subtitle { margin: 0; color: #7a746a; font-size: 13px; letter-spacing: .04em; }
  .module { margin-bottom: 34px; }
  h2 {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 600;
    color: #1d1b18;
    padding-left: 12px;
    border-left: 3px solid #b79b6c;
    line-height: 1.5;
  }
  p { margin: 0 0 10px; white-space: pre-wrap; word-break: break-word; }
  p.student { color: #5c5750; }
  p.direction { color: #857d72; font-style: italic; }
  p.branch {
    margin: 12px 0;
    padding: 8px 14px;
    color: #7a4a13;
    background: #faf5ec;
    border-left: 3px solid #d8bd93;
    border-radius: 0 4px 4px 0;
  }
  @media print {
    @page { size: A4; margin: 18mm 16mm; }
    body { padding: 0; background: #fff; font-size: 12pt; }
    .doc { max-width: none; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
    .module { break-inside: auto; }
    h2 { break-after: avoid; }
    p { break-inside: avoid; }
  }
</style>
</head>
<body>
<main class="doc">
<header>
<h1>${escapeHtml(model.title)}</h1>
${model.subtitle ? `<p class="subtitle">${escapeHtml(model.subtitle)}</p>` : ''}
</header>
${sections}
</main>
</body>
</html>
`
}

// 纯文本导出：方便直接发到微信、粘贴进别的系统，或者在手机上翻。
export function renderConsultText(model: ConsultExportModel): string {
  const lines: string[] = [model.title]
  if (model.subtitle) lines.push(model.subtitle)
  lines.push('')
  for (const section of model.sections) {
    lines.push(section.heading, '')
    for (const paragraph of section.paragraphs) lines.push(paragraph.text)
    lines.push('')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

// ---------- 最小 zip / docx 写入器 ----------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let value = 0xffffffff
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

function dosDateTime(date = new Date()): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  }
}

interface ZipInput {
  name: string
  data: Buffer
}

function buildZip(files: ZipInput[]): Buffer {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  const stamp = dosDateTime()
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const compressed = zlib.deflateRawSync(file.data, { level: 9 })
    const checksum = crc32(file.data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    // bit 11：文件名按 UTF-8 解释。
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(stamp.time, 10)
    local.writeUInt16LE(stamp.date, 12)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    chunks.push(local, name, compressed)

    const directory = Buffer.alloc(46)
    directory.writeUInt32LE(0x02014b50, 0)
    directory.writeUInt16LE(20, 4)
    directory.writeUInt16LE(20, 6)
    directory.writeUInt16LE(0x0800, 8)
    directory.writeUInt16LE(8, 10)
    directory.writeUInt16LE(stamp.time, 12)
    directory.writeUInt16LE(stamp.date, 14)
    directory.writeUInt32LE(checksum, 16)
    directory.writeUInt32LE(compressed.length, 20)
    directory.writeUInt32LE(file.data.length, 24)
    directory.writeUInt16LE(name.length, 28)
    directory.writeUInt32LE(offset, 42)
    central.push(directory, name)

    offset += local.length + name.length + compressed.length
  }

  const centralBuffer = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuffer.length, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...chunks, centralBuffer, end])
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function runXml(text: string): string {
  return text
    .split('\n')
    .map((line, index) => `${index ? '<w:br/>' : ''}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`)
    .join('')
}

function paragraphXml(text: string, styleId: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr><w:r>${runXml(text)}</w:r></w:p>`
}

const STYLE_BY_PARAGRAPH: Record<ConsultExportParagraph['style'], string> = {
  line: 'Body',
  student: 'Student',
  direction: 'Direction',
  branch: 'Branch'
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" w:cs="Calibri"/>
<w:sz w:val="22"/><w:szCs w:val="22"/>
<w:lang w:val="en-US" w:eastAsia="zh-CN"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal">
<w:name w:val="Normal"/><w:qFormat/>
</w:style>
<w:style w:type="paragraph" w:styleId="Title">
<w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Subtitle"/><w:qFormat/>
<w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="80"/></w:pPr>
<w:rPr><w:rFonts w:eastAsia="黑体"/><w:b/><w:sz w:val="38"/><w:szCs w:val="38"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Subtitle">
<w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Heading1"/><w:qFormat/>
<w:pPr><w:jc w:val="center"/><w:spacing w:after="320"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="12" w:color="E0D9CC"/></w:pBdr></w:pPr>
<w:rPr><w:color w:val="6F6A61"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Heading1">
<w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Body"/><w:qFormat/>
<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="140"/><w:outlineLvl w:val="0"/></w:pPr>
<w:rPr><w:rFonts w:eastAsia="黑体"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Body">
<w:name w:val="Body"/><w:basedOn w:val="Normal"/><w:qFormat/>
</w:style>
<w:style w:type="paragraph" w:styleId="Student">
<w:name w:val="Student"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:rPr><w:color w:val="555049"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Direction">
<w:name w:val="Direction"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:rPr><w:i/><w:color w:val="7C756B"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Branch">
<w:name w:val="Branch"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:spacing w:before="80" w:after="120"/><w:ind w:left="360"/></w:pPr>
<w:rPr><w:color w:val="7A4A13"/></w:rPr>
</w:style>
</w:styles>`

function documentXml(model: ConsultExportModel): string {
  const body: string[] = []
  body.push(paragraphXml(model.title, 'Title'))
  if (model.subtitle) body.push(paragraphXml(model.subtitle, 'Subtitle'))
  for (const section of model.sections) {
    body.push(paragraphXml(section.heading, 'Heading1'))
    for (const paragraph of section.paragraphs) {
      body.push(paragraphXml(paragraph.text, STYLE_BY_PARAGRAPH[paragraph.style]))
    }
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${body.join('\n')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`
}

export function renderConsultDocx(model: ConsultExportModel): Buffer {
  return buildZip([
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(ROOT_RELS, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(documentXml(model), 'utf8') },
    { name: 'word/styles.xml', data: Buffer.from(STYLES_XML, 'utf8') },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(DOCUMENT_RELS, 'utf8') }
  ])
}

export function consultExportFilename(run: ConsultRun, format: ConsultExportFormat): string {
  const name = cleanText(run.context.name ?? '')
  const date = (run.createdAt || new Date().toISOString()).slice(0, 10).replace(/-/g, '')
  const safeName = name.replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 24)
  const base = safeName ? `咨询稿-${safeName}-${date}` : `咨询稿-${date}`
  return `${base}.${format}`
}
