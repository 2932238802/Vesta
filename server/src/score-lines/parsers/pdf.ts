import type { Parser } from './types'
import { batchFromMetrics, metricsFromText } from './table'

/** 抽 PDF 文本层；扫描件返回空串，由调用方决定如何报错。 */
export async function extractPdfText(content: string | Uint8Array): Promise<string> {
  const data =
    typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const document = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true
  }).promise
  const pages: string[] = []
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index)
    const pageContent = await page.getTextContent()
    pages.push(
      pageContent.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    )
  }
  return pages.join('\n')
}

export const pdfTextParser: Parser = {
  id: 'pdf-text@1',
  async parse({ content, context }) {
    let text = ''
    try {
      text = await extractPdfText(content)
    } catch (error) {
      return { batches: [], issues: [`PDF 解析失败：${(error as Error).message}`] }
    }
    if (!text.trim()) {
      return { batches: [], issues: ['该 PDF 无文本层（扫描件），需人工导入'] }
    }
    const metrics = metricsFromText(text)
    if (metrics.length === 0) {
      return { batches: [], issues: ['PDF 文本里没有识别到科目分数'] }
    }
    return { batches: [batchFromMetrics(metrics, context)], issues: [] }
  }
}
