import { ref, type Ref } from 'vue'
import { toPng } from 'html-to-image'
import type { ReportPayload } from '@shared/types'

/**
 * 报告页的导出交互：保存图片、保存 PDF、复制链接，以及截图预览与 toast。
 * 只搬运原 ReportView.vue 的实现，行为与调用顺序不变。
 */
export function useReportExport(
  slug: string,
  payload: Ref<ReportPayload | null>,
  sheetEl: Ref<HTMLElement | null>
) {
  const exporting = ref(false)
  const exportingPdf = ref(false)
  const shot = ref('')
  const toast = ref('')

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('报告图片读取失败'))
      image.src = src
    })
  }

  /** 在一行里找最接近白纸的位置，避免 PDF 翻页把文字从中间切开。 */
  function findCutRow(
    ctx: CanvasRenderingContext2D,
    width: number,
    target: number,
    min: number,
    max: number
  ): number {
    const from = Math.max(min, Math.floor(target - 140))
    const to = Math.min(max, Math.ceil(target + 140))
    if (to <= from) return Math.max(min, Math.min(target, max))
    const rows = to - from
    const data = ctx.getImageData(0, from, width, rows).data
    let best = Math.round(target)
    let bestScore = Number.POSITIVE_INFINITY
    for (let row = 0; row < rows; row += 1) {
      let dark = 0
      for (let x = 0; x < width; x += 3) {
        const index = (row * width + x) * 4
        if (data[index + 3] < 20) continue
        const luminance =
          0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]
        if (luminance < 190) dark += 1
      }
      const y = from + row
      const score = dark * 100000 + Math.abs(y - target)
      if (score < bestScore) {
        bestScore = score
        best = y
      }
    }
    return Math.max(min, Math.min(max, best))
  }

  function pageCuts(image: HTMLImageElement, slicePx: number): number[] {
    const height = image.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      const cuts = [0]
      for (let y = slicePx; y < height; y += slicePx) cuts.push(y)
      cuts.push(height)
      return cuts
    }
    ctx.drawImage(image, 0, 0)
    const cuts = [0]
    let start = 0
    while (height - start > slicePx * 1.02) {
      const target = start + slicePx
      const cut = findCutRow(
        ctx,
        image.naturalWidth,
        target,
        start + Math.floor(slicePx * 0.65),
        Math.min(height, target + Math.floor(slicePx * 0.18))
      )
      cuts.push(cut)
      start = cut
    }
    cuts.push(height)
    return cuts
  }

  async function savePdf() {
    if (!sheetEl.value || exportingPdf.value) return
    exportingPdf.value = true
    try {
      if (document.fonts) await document.fonts.ready
      const paper = payload.value?.theme.paper ?? '#f7f4ed'
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 36
      const contentWidth = pageWidth - margin * 2
      const contentHeight = pageHeight - margin * 2
      const paint = () => {
        doc.setFillColor(paper)
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
      }
      paint()
      let y = margin

      const nodes = Array.from(
        sheetEl.value.querySelectorAll<HTMLElement>('.report > .report-head, .report > .block')
      )
      for (const node of nodes) {
        const rect = node.getBoundingClientRect()
        if (!rect.width || !rect.height) continue
        // 目标约 300dpi；同时限制单张画布的边长和像素量，避免手机上生成长图时爆内存。
        let pixelRatio = Math.min(6, Math.max(3, 2200 / rect.width))
        const maxSide = 24000
        const maxPixels = 24_000_000
        pixelRatio = Math.min(pixelRatio, maxSide / rect.width, maxSide / rect.height)
        const pixels = rect.width * rect.height * pixelRatio * pixelRatio
        if (pixels > maxPixels) pixelRatio *= Math.sqrt(maxPixels / pixels)
        const dataUrl = await toPng(node, {
          pixelRatio,
          backgroundColor: paper,
          cacheBust: true,
          style: { margin: '0', borderRadius: '0', boxShadow: 'none' }
        })
        const image = await loadImage(dataUrl)
        let widthPt = contentWidth
        let heightPt = (widthPt * image.naturalHeight) / image.naturalWidth

        if (heightPt <= contentHeight * 1.12) {
          if (heightPt > contentHeight) {
            const fit = contentHeight / heightPt
            widthPt *= fit
            heightPt = contentHeight
          }
          if (y + heightPt > pageHeight - margin) {
            doc.addPage()
            paint()
            y = margin
          }
          const x = margin + (contentWidth - widthPt) / 2
          doc.addImage(dataUrl, 'PNG', x, y, widthPt, heightPt, undefined, 'FAST')
          y += heightPt
          continue
        }

        // 高过一页的区块：按图片里的空白行切片，避免把一行字从中间截断。
        const scale = heightPt / image.naturalHeight
        const cuts = pageCuts(image, Math.floor(contentHeight / scale))
        if (y > margin + 1) {
          doc.addPage()
          paint()
          y = margin
        }
        for (let index = 0; index < cuts.length - 1; index += 1) {
          if (index > 0) {
            doc.addPage()
            paint()
            y = margin
          }
          const start = cuts[index]
          doc.addImage(
            dataUrl,
            'PNG',
            margin,
            y - start * scale,
            contentWidth,
            heightPt,
            undefined,
            'FAST'
          )
        }
        const last = cuts[cuts.length - 2]
        y = margin + (image.naturalHeight - last) * scale
      }

      const pages = doc.getNumberOfPages()
      if (pages > 1) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor('#8a857c')
        for (let index = 1; index <= pages; index += 1) {
          doc.setPage(index)
          doc.text(`Vesta · ${index} / ${pages}`, pageWidth / 2, pageHeight - 15, {
            align: 'center'
          })
        }
      }
      doc.save(`vesta-report-${slug}.pdf`)
    } catch (error) {
      console.error('[report-pdf] 生成失败', error)
      flash('生成 PDF 失败，可以改用“保存图片”')
    } finally {
      exportingPdf.value = false
    }
  }

  async function saveImage() {
    if (!sheetEl.value || exporting.value) return
    exporting.value = true
    try {
      if (document.fonts) await document.fonts.ready
      const dataUrl = await toPng(sheetEl.value, {
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        backgroundColor: payload.value?.theme.paper ?? '#f7f4ed',
        cacheBust: true,
        style: { margin: '0', borderRadius: '0' }
      })
      shot.value = dataUrl
    } catch {
      flash('生成图片失败，可以改用“保存为 PDF”')
    } finally {
      exporting.value = false
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href)
      flash('链接已复制')
    } catch {
      const input = document.createElement('textarea')
      input.value = location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      flash('链接已复制')
    }
  }

  function flash(message: string) {
    toast.value = message
    setTimeout(() => {
      toast.value = ''
    }, 1800)
  }

  return { exporting, exportingPdf, shot, toast, savePdf, saveImage, copyLink }
}
