import zlib from 'node:zlib'

interface ZipEntry {
  data: Buffer
  method: number
  compressedSize: number
}

function readZipEntry(buffer: Buffer, wanted: string): ZipEntry | null {
  let eocd = -1
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset
      break
    }
  }
  if (eocd < 0) throw new Error('不是有效的 Word / docx 文件')

  const count = buffer.readUInt16LE(eocd + 10)
  let cursor = buffer.readUInt32LE(eocd + 16)
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('docx 目录损坏')
    const method = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localOffset = buffer.readUInt32LE(cursor + 42)
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    if (name === wanted) {
      if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('docx 文件头损坏')
      const localNameLength = buffer.readUInt16LE(localOffset + 26)
      const localExtraLength = buffer.readUInt16LE(localOffset + 28)
      const start = localOffset + 30 + localNameLength + localExtraLength
      return { data: buffer.subarray(start, start + compressedSize), method, compressedSize }
    }
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return null
}

function decodeXml(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function entryBuffer(entry: ZipEntry): Buffer {
  if (entry.method === 0) return entry.data
  if (entry.method === 8) return zlib.inflateRawSync(entry.data)
  throw new Error(`不支持的 docx 压缩方式：${entry.method}`)
}

export interface ParsedDocx {
  paragraphs: string[]
  text: string
}

// 只抽取正文段落。咨询稿通常是一段一句，保留段落顺序和学生/咨询师标记行。
export function parseDocx(buffer: Buffer): ParsedDocx {
  const entry = readZipEntry(buffer, 'word/document.xml')
  if (!entry) throw new Error('docx 中没有正文内容')
  const xml = entryBuffer(entry).toString('utf8')
  const paragraphs: string[] = []
  for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const body = match[1]
    const text = decodeXml(
      [...body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((item) => item[1])
        .join('')
    )
      .replace(/\u00a0/g, ' ')
      .trim()
    if (text) paragraphs.push(text)
  }
  return { paragraphs, text: paragraphs.join('\n\n') }
}
