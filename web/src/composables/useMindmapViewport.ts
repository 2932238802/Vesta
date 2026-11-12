import { onBeforeUnmount, onMounted, ref } from 'vue'

export interface MindmapPositionedNode {
  node: { id: string }
  x: number
  y: number
}

interface MindmapViewportOptions {
  getNodes: () => MindmapPositionedNode[]
  getSize: () => { width: number; height: number }
  nodeWidth: number
  nodeHeight: number
  onBlankClick: () => void
}

export function useMindmapViewport(options: MindmapViewportOptions) {
  const mapCard = ref<HTMLElement | null>(null)
  const mapCanvas = ref<HTMLElement | null>(null)
  const isFullscreen = ref(false)
  const pan = ref({ x: 24, y: 24 })
  const zoom = ref(1)
  const panning = ref(false)
  let panStart = { x: 0, y: 0, panX: 0, panY: 0 }
  let panMoved = false

  async function toggleFullscreen() {
    const card = mapCard.value
    if (!card) return
    try {
      if (document.fullscreenElement === card) await document.exitFullscreen()
      else await card.requestFullscreen()
    } catch {
      // 浏览器拒绝全屏时保持当前视图
    }
  }

  function onFullscreenChange() {
    isFullscreen.value = document.fullscreenElement === mapCard.value
  }

  function fitMap() {
    const canvas = mapCanvas.value
    const size = options.getSize()
    if (!canvas || !size.width || !size.height) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return
    // 顶部给悬浮工具条留出空间，避免第一张卡片被压在下面。
    const insetX = 40
    const insetTop = 64
    const insetBottom = 40
    const target = Math.min(
      1.15,
      Math.max(
        0.06,
        Math.min(
          (width - insetX * 2) / size.width,
          (height - insetTop - insetBottom) / size.height
        )
      )
    )
    zoom.value = target
    pan.value = {
      x: (width - size.width * target) / 2,
      y: insetTop + (height - insetTop - insetBottom - size.height * target) / 2
    }
  }

  function zoomMap(factor: number) {
    const canvas = mapCanvas.value
    if (!canvas) return
    const nextZoom = Math.min(2.4, Math.max(0.06, zoom.value * factor))
    const centerX = canvas.clientWidth / 2
    const centerY = canvas.clientHeight / 2
    const worldX = (centerX - pan.value.x) / zoom.value
    const worldY = (centerY - pan.value.y) / zoom.value
    zoom.value = nextZoom
    pan.value = {
      x: centerX - worldX * nextZoom,
      y: centerY - worldY * nextZoom
    }
  }

  function handleWheel(event: WheelEvent) {
    const canvas = mapCanvas.value
    if (!canvas) return
    // 普通滚轮上下移动画布；按住 Ctrl / Command 才缩放（触控板捏合也会带 ctrlKey）。
    const deltaY = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
    if (!event.ctrlKey && !event.metaKey) {
      pan.value = {
        x: pan.value.x,
        y: pan.value.y - deltaY
      }
      return
    }
    const rect = canvas.getBoundingClientRect()
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top
    const factor = deltaY < 0 ? 1.12 : 0.89
    const nextZoom = Math.min(2.4, Math.max(0.06, zoom.value * factor))
    const worldX = (pointerX - pan.value.x) / zoom.value
    const worldY = (pointerY - pan.value.y) / zoom.value
    zoom.value = nextZoom
    pan.value = {
      x: pointerX - worldX * nextZoom,
      y: pointerY - worldY * nextZoom
    }
  }

  function startPan(event: MouseEvent) {
    if (event.button !== 0) {
      event.preventDefault()
      event.stopPropagation()
      stopPan()
      return
    }
    panning.value = true
    panMoved = false
    panStart = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.value.x,
      panY: pan.value.y
    }
    window.addEventListener('mousemove', onPan)
    window.addEventListener('mouseup', stopPan)
  }

  function onPan(event: MouseEvent) {
    if (!panning.value) return
    const dx = event.clientX - panStart.x
    const dy = event.clientY - panStart.y
    if (Math.abs(dx) + Math.abs(dy) > 4) panMoved = true
    pan.value = {
      x: panStart.panX + dx,
      y: panStart.panY + dy
    }
  }

  // 点空白处取消选中，同时去掉链路流动；拖动画布不算点击。
  function handleCanvasClick(event: MouseEvent) {
    if (panMoved) {
      panMoved = false
      return
    }
    const target = event.target as HTMLElement | null
    if (target?.closest('.mindmap-node') || target?.closest('.map-overlay')) return
    options.onBlankClick()
  }

  function stopPan() {
    panning.value = false
    window.removeEventListener('mousemove', onPan)
    window.removeEventListener('mouseup', stopPan)
  }

  // 只在节点被挤出可视区时做最小平移，不改变缩放，也不把节点强行拉到屏幕中间。
  function ensureNodeVisible(id: string) {
    const canvas = mapCanvas.value
    if (!canvas) return
    const item = options.getNodes().find((entry) => entry.node.id === id)
    if (!item) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return

    const marginX = 48
    const marginY = 40
    const left = item.x * zoom.value + pan.value.x
    const top = (item.y - options.nodeHeight / 2) * zoom.value + pan.value.y
    const right = left + options.nodeWidth * zoom.value
    const bottom = top + options.nodeHeight * zoom.value

    let dx = 0
    let dy = 0
    if (right > width - marginX) dx = width - marginX - right
    else if (left < marginX) dx = marginX - left
    if (bottom > height - marginY) dy = height - marginY - bottom
    else if (top < marginY) dy = marginY - top
    if (!dx && !dy) return
    pan.value = { x: pan.value.x + dx, y: pan.value.y + dy }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
  })
  onBeforeUnmount(() => {
    stopPan()
    document.removeEventListener('fullscreenchange', onFullscreenChange)
  })

  return {
    mapCard,
    mapCanvas,
    isFullscreen,
    pan,
    zoom,
    panning,
    toggleFullscreen,
    fitMap,
    zoomMap,
    handleWheel,
    startPan,
    stopPan,
    handleCanvasClick,
    ensureNodeVisible
  }
}
