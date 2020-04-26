class SVGZoom {
  defaultZoom: number
  zoom: number
  zoomCenter: { x: number; y: number } = { x: 0, y: 0 }
  contentWidth: number
  contentHeight: number

  svg: SVGSVGElement

  constructor(svg: SVGSVGElement, contentWidth: number, contentHeight: number, defaultZoom = 1) {
    this.svg = svg
    this.contentWidth = contentWidth
    this.contentHeight = contentHeight
    this.defaultZoom = defaultZoom
    this.zoom = this.defaultZoom

    this.centerView()

    // Zoom
    this.svg.addEventListener('wheel', (e: WheelEvent) => {
      /** one svg unit equals that many pixels including the zoom */
      const zoomPixelRatioPrev =
        Math.min(this.svg.clientWidth / this.contentWidth, this.svg.clientHeight / this.contentHeight) * this.zoom
      const pixelOffsetX = this.svg.clientWidth / 2 - e.clientX
      const pixelOffsetY = this.svg.clientHeight / 2 - e.clientY

      const offsetXPrev = pixelOffsetX / zoomPixelRatioPrev
      const offsetYPrev = pixelOffsetY / zoomPixelRatioPrev

      const zoomRatio = 1.3
      if (e.deltaY > 0) {
        this.zoom /= zoomRatio
      } else if (e.deltaY < 0) {
        this.zoom *= zoomRatio
      }

      /** one svg unit equals that many pixels including the zoom */
      const zoomPixelRatio =
        Math.min(this.svg.clientWidth / this.contentWidth, this.svg.clientHeight / this.contentHeight) * this.zoom
      /** one svg unit equals that many pixels including the zoom */
      const offsetX = pixelOffsetX / zoomPixelRatio
      const offsetY = pixelOffsetY / zoomPixelRatio
      // move by how much that point moved between the two zoom levels
      this.zoomCenter.x += offsetX - offsetXPrev
      this.zoomCenter.y += offsetY - offsetYPrev

      this.onResize()
    })

    // Drag
    const mouseMovePrevious = { x: 0, y: 0 }
    const onMouseMove = (e: MouseEvent) => {
      const zoomPixelRatio =
        Math.min(this.svg.clientWidth / this.contentWidth, this.svg.clientHeight / this.contentHeight) * this.zoom
      const pixelOffsetX = e.clientX - mouseMovePrevious.x
      const pixelOffsetY = e.clientY - mouseMovePrevious.y
      const offsetX = pixelOffsetX / zoomPixelRatio
      const offsetY = pixelOffsetY / zoomPixelRatio
      this.zoomCenter.x += -offsetX
      this.zoomCenter.y += -offsetY
      this.onResize()

      mouseMovePrevious.x = e.clientX
      mouseMovePrevious.y = e.clientY
    }

    this.svg.addEventListener('mousedown', (e: MouseEvent) => {
      window.addEventListener('mousemove', onMouseMove)
      mouseMovePrevious.x = e.clientX
      mouseMovePrevious.y = e.clientY
    })

    window.addEventListener('mouseup', (e: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
    })
  }

  setContentSize(width: number, height: number) {
    this.contentWidth = width
    this.contentHeight = height
  }

  centerView() {
    this.zoom = this.defaultZoom
    this.zoomCenter = {
      x: this.contentWidth / 2,
      y: this.contentHeight / 2,
    }

    this.onResize()
  }

  screenToSVGPosition(screenPixelX: number, screenPixelY: number) {
    const zoomPixelRatio =
      Math.min(this.svg.clientWidth / this.contentWidth, this.svg.clientHeight / this.contentHeight) * this.zoom
    // in map units:
    const screenWidth = this.svg.clientWidth / zoomPixelRatio
    const screenHeight = this.svg.clientHeight / zoomPixelRatio
    const leftScreenOffset = screenWidth / 2 - this.zoomCenter.x
    const topScreenOffset = screenHeight / 2 - this.zoomCenter.y
    // mouse x,y on screen in map units from top left
    const screenX = screenPixelX / zoomPixelRatio
    const screenY = screenPixelY / zoomPixelRatio
    // remove offset
    const x = screenX - leftScreenOffset
    const y = screenY - topScreenOffset

    return { x, y }
  }

  onResize() {
    this.svg.style.width = `${window.innerWidth}px`
    this.svg.style.height = `${window.innerHeight}px`
    const left = this.zoomCenter.x - this.contentWidth / 2 / this.zoom
    const top = this.zoomCenter.y - this.contentHeight / 2 / this.zoom
    this.svg.setAttribute(
      'viewBox',
      `${left} ${top} ${this.contentWidth / this.zoom} ${this.contentHeight / this.zoom}`
    )
  }
}
