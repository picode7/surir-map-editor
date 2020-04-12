function init() {
    new SurirEditor()
}

const WallLength = 1
const WallColorBasic = '#808080'
const WallColorDoor = '#ffff00'
const WallColorTransparent = '#fff'

const FloorColor = '#5c5c5c'

const SkyColor = '#5c6bde'

const PlayerRadius = 6 / 48 // 6

const ShotRadius = 2 / 48 // 2, h=10
const ShotCollisionPlayerRadius = 3 / 48

const enum WallType {
    Basic,
    Door,
    Transparent
}

class SurirEditor {

    readonly exportTypes = ['.sir', '.maz',]
    readonly importTypes = ['.sir', '.maz',]
    readonly wallOptions = [
        { title: 'Basic Wall', wallType: WallType.Basic },
        { title: 'Door', wallType: WallType.Door },
        { title: 'Transparent Wall', wallType: WallType.Transparent },
    ]

    mapName: string = 'New Maze'
    mapAuthor: string = ''
    mapDescription: string = ''
    map = {
        width: 6,
        height: 6,
    }
    walls: Wall[] = []

    zoom: number
    zoomCenter: { x: number, y: number, }
    selectedWallType = WallType.Basic

    svg: SVGElement
    zonesLayer: SVGElement
    wallLayer: SVGElement
    floorRect: SVGElement

    buttonMapSize: HTMLButtonElement
    buttonRemoveWalls: HTMLButtonElement
    buttonUndo: HTMLButtonElement
    buttonRedo: HTMLButtonElement
    buttonSave: HTMLButtonElement

    constructor() {
        // Controls Input

        // Controls container
        const div = document.createElement('div')
        div.style.position = 'absolute'
        div.style.top = '0px'
        div.style.left = '0px'
        div.style.right = '0px'
        div.style.display = 'flex'
        div.style.justifyContent = 'flex-end'
        document.body.appendChild(div)

        // Button Map Size
        this.buttonMapSize = document.createElement('button')
        this.buttonMapSize.textContent = `Map size: ${this.map.width} x ${this.map.height}` // also in actionSetMapSize
        this.buttonMapSize.addEventListener('click', () => {
            const value = prompt('New map size:', `${this.map.width}x${this.map.height}`)
            if (value === null) return // canceled

            const match = value.match(/^\s*(\d+)\s*[xX]\s*(\d+)\s*$/)
            if (match === null) {
                alert(`Bad input\n\n${value}`)
                return
            }

            const width = parseInt(match[1])
            const height = parseInt(match[2])

            this.actionResizeMap(width, height)
        })
        div.appendChild(this.buttonMapSize)

        // Select Wall Type
        const selectWallType = document.createElement('select')
        selectWallType.addEventListener('change', () => {
            const value = selectWallType.selectedOptions[0].value
            for (const option of this.wallOptions) {
                if (option.title !== value) continue
                this.selectedWallType = option.wallType
                break
            }
        })
        for (const option of this.wallOptions) {
            const elOption = document.createElement('option')
            elOption.innerText = option.title
            selectWallType.options.add(elOption)
        }
        div.appendChild(selectWallType)

        // Button Remove Walls
        this.buttonRemoveWalls = document.createElement('button')
        this.buttonRemoveWalls.textContent = 'Remove Walls'
        this.buttonRemoveWalls.addEventListener('click', () => this.actionRemoveWalls())
        div.appendChild(this.buttonRemoveWalls)

        // Button Remove Undo
        this.buttonUndo = document.createElement('button')
        this.buttonUndo.textContent = 'Undo'
        this.buttonUndo.disabled = true
        this.buttonUndo.addEventListener('click', () => this.undo())
        div.appendChild(this.buttonUndo)

        // Button Remove Redo
        this.buttonRedo = document.createElement('button')
        this.buttonRedo.textContent = 'Redo'
        this.buttonRedo.disabled = true
        this.buttonRedo.addEventListener('click', () => this.redo())
        div.appendChild(this.buttonRedo)

        // Button Center view
        const buttonCenterView = document.createElement('button')
        buttonCenterView.textContent = 'Center View'
        buttonCenterView.addEventListener('click', () => this.centerView())
        div.appendChild(buttonCenterView)

        // Select Export Type
        let selectedExportType = this.exportTypes[0]
        const selectExportType = document.createElement('select')
        selectExportType.addEventListener('change', () => {
            const value = selectExportType.selectedOptions[0].value
            for (const option of this.exportTypes) {
                if (option !== value) continue
                selectedExportType = value
                break
            }
        })
        for (const option of this.exportTypes) {
            const elOption = document.createElement('option')
            elOption.innerText = option
            selectExportType.options.add(elOption)
        }
        div.appendChild(selectExportType)

        // Button Save
        this.buttonSave = document.createElement('button')
        this.buttonSave.textContent = 'Save'
        this.buttonSave.addEventListener('click', () => {
            this.actionsSaved = true
            this.exportFile(selectedExportType, this.mapName, 'download')
        })
        div.appendChild(this.buttonSave)

        // Button Share
        const buttonShare = document.createElement('button')
        buttonShare.textContent = 'Share'
        buttonShare.addEventListener('click', () => {
            const link = this.exportFile(selectedExportType, this.mapName, 'share')
            if (typeof link === 'undefined') return

            copyText(link, (err) => {
                if (err) prompt('Here is your link:', link)
                else alert('Link copied to clipboard.')
            })
        })
        div.appendChild(buttonShare)

        // Button Import
        const buttonImport = document.createElement('button')
        buttonImport.textContent = 'Open'
        buttonImport.addEventListener('click', () => {
            if (this.actionsSaved === false && confirm('You have unsaved changes, open a new map?') === false) return

            openTextFile((file: File, content: string) => this.importFile(file.name, content), this.importTypes.join(','))
        })
        div.appendChild(buttonImport)

        // Prevent unsaved leaves
        window.addEventListener('beforeunload', (event: BeforeUnloadEvent) => {
            if (this.actionsSaved == false) {
                event.preventDefault()
                event.returnValue = ''
            }
        })

        // SVG container
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        this.svg.style.backgroundColor = SkyColor
        document.body.appendChild(this.svg)

        // Pattern
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
        pattern.id = 'pattern'
        pattern.setAttribute('width', `0.04`)
        pattern.setAttribute('height', `0.04`)
        pattern.setAttribute('patternUnits', `userSpaceOnUse`)
        this.svg.appendChild(pattern)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.style.stroke = WallColorBasic
        path.style.strokeWidth = '0.01'
        path.style.opacity = '.3'
        path.setAttribute('d', `M-0.01,0.01 l0.02,-0.02 M0.00,0.04 l0.04,-0.04 M0.03,0.05 l0.02,-0.02`)
        pattern.appendChild(path)

        // Floor
        this.floorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        this.floorRect.style.fill = FloorColor
        this.svg.appendChild(this.floorRect)

        // Zones
        this.zonesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        this.svg.appendChild(this.zonesLayer)

        // Walls
        this.wallLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        this.svg.appendChild(this.wallLayer)

        // Load
        const onHashChange = () => {
            const hash = urlGetHash()
            urlRemoveHash()

            if (this.actionsSaved === false && confirm('You have unsaved changes, open a new map?') === false) return

            this.importShare(hash)
        }
        window.addEventListener('hashchange', () => onHashChange())

        const hash = urlGetHash()
        if (hash === '') {
            // Create default walls
            for (let x = 0; x < this.map.width; ++x) {
                this.addWall({ type: WallType.Basic, position: { x1: x, y1: 0, x2: x + 1, y2: 0 } }, false)
                this.addWall({ type: WallType.Basic, position: { x1: x, y1: this.map.height, x2: x + 1, y2: this.map.height } }, false)
            }

            for (let y = 0; y < this.map.height; ++y) {
                this.addWall({ type: WallType.Basic, position: { x1: 0, y1: y, x2: 0, y2: y + 1 } }, false)
                this.addWall({ type: WallType.Basic, position: { x1: this.map.width, y1: y, x2: this.map.width, y2: y + 1 } }, false)
            }
            this.updateMap()
        } else {
            urlRemoveHash()
            this.importShare(hash)
        }

        // Player
        //new Player(this.svg)

        // Marker
        const wallMarker = new WallMarker(this.svg, { x1: 0, y1: 0, x2: 1, y2: 0 })

        // Adjust UI
        this.setMapSize(this.map.width, this.map.height)
        // Reset zoom
        this.centerView()

        // GUI-Map inputs

        let clickMoved = false

        // Render size
        window.addEventListener('resize', () => this.resize())

        // Zoom
        this.svg.addEventListener('mousewheel', (e: WheelEvent) => {

            /** one svg unit equals that many pixels including the zoom */
            const zoomPixelRatioPrev = Math.min(this.svg.clientWidth / this.map.width, this.svg.clientHeight / this.map.height) * this.zoom
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
            const zoomPixelRatio = Math.min(this.svg.clientWidth / this.map.width, this.svg.clientHeight / this.map.height) * this.zoom
            /** one svg unit equals that many pixels including the zoom */
            const offsetX = pixelOffsetX / zoomPixelRatio
            const offsetY = pixelOffsetY / zoomPixelRatio
            // move by how much that point moved between the two zoom levels
            this.zoomCenter.x += offsetX - offsetXPrev
            this.zoomCenter.y += offsetY - offsetYPrev

            this.resize()
        })

        // Drag
        let mouseMovePrevious = { x: 0, y: 0 }
        const onMouseMove = (e: MouseEvent) => {
            const zoomPixelRatio = Math.min(this.svg.clientWidth / this.map.width, this.svg.clientHeight / this.map.height) * this.zoom
            const pixelOffsetX = e.clientX - mouseMovePrevious.x
            const pixelOffsetY = e.clientY - mouseMovePrevious.y
            const offsetX = pixelOffsetX / zoomPixelRatio
            const offsetY = pixelOffsetY / zoomPixelRatio
            this.zoomCenter.x += -offsetX
            this.zoomCenter.y += -offsetY
            this.resize()
            clickMoved = true

            mouseMovePrevious.x = e.clientX
            mouseMovePrevious.y = e.clientY
        }

        this.svg.addEventListener('mousedown', (e: MouseEvent) => {
            window.addEventListener('mousemove', onMouseMove)
            mouseMovePrevious.x = e.clientX
            mouseMovePrevious.y = e.clientY
            clickMoved = false
        })

        window.addEventListener('mouseup', (e: MouseEvent) => {
            window.removeEventListener('mousemove', onMouseMove)
        })

        // Marker / Set wall
        this.svg.addEventListener('mousemove', (e: MouseEvent) => {
            const coords = this.screenToMapPosition(e.clientX, e.clientY)
            wallMarker.snapPosition(coords.x, coords.y, this.map)
        })

        this.svg.addEventListener('click', (e: MouseEvent) => {
            if (clickMoved) return

            const position = {
                x1: wallMarker.position.x1,
                y1: wallMarker.position.y1,
                x2: wallMarker.position.x2,
                y2: wallMarker.position.y2,
            }

            if (wallWithinBounds(this.map, wallMarker) === false) return

            const existingWall = getWallAt(this.walls, position)
            if (existingWall === null) {
                this.actionNewWall({ type: this.selectedWallType, position })
            } else {
                this.actionRemoveWall(existingWall)
            }

        })

        this.updateMap()
        this.resetActions()
    }

    screenToMapPosition(screenPixelX: number, screenPixelY: number) {
        const zoomPixelRatio = Math.min(this.svg.clientWidth / this.map.width, this.svg.clientHeight / this.map.height) * this.zoom
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

    resize() {
        this.svg.style.width = `${window.innerWidth}px`
        this.svg.style.height = `${window.innerHeight}px`
        const left = this.zoomCenter.x - this.map.width / 2 / this.zoom
        const top = this.zoomCenter.y - this.map.height / 2 / this.zoom
        this.svg.setAttribute('viewBox', `${left} ${top} ${this.map.width / this.zoom} ${this.map.height / this.zoom}`)
    }

    setMapSize(width: number, height: number) {
        this.map.width = width
        this.map.height = height

        // Adjust floor size
        this.floorRect.setAttribute('width', `${WallLength * this.map.width}`)
        this.floorRect.setAttribute('height', `${WallLength * this.map.height}`)

        this.buttonMapSize.textContent = `Map size: ${this.map.width} x ${this.map.height}` // also in buttonMapSize init
    }

    updateMap() {
        if (typeof this.buttonRemoveWalls !== 'undefined')
            this.buttonRemoveWalls.disabled = this.walls.length == this.map.width * 2 + this.map.height * 2 // only outer walls, no inner walls to remove

        // Update unreachable zones
        this.zonesLayer.innerHTML = ''

        for (let y = 0; y < this.map.height; ++y) {
            for (let x = 0; x < this.map.width; ++x) {
                if (
                    getWallAt(this.walls, { x1: x, y1: y, x2: x + 1, y2: y, }) &&// top
                    getWallAt(this.walls, { x1: x + 1, y1: y, x2: x + 1, y2: y + 1, }) && // right
                    getWallAt(this.walls, { x1: x, y1: y + 1, x2: x + 1, y2: y + 1, }) && // bottom
                    getWallAt(this.walls, { x1: x, y1: y, x2: x, y2: y + 1, }) // left
                ) {
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
                    rect.style.fill = 'url(#pattern)'
                    rect.setAttribute('x', `${x}`)
                    rect.setAttribute('y', `${y}`)
                    rect.setAttribute('width', `${WallLength}`)
                    rect.setAttribute('height', `${WallLength}`)
                    this.zonesLayer.appendChild(rect)
                }
            }
        }
    }

    centerView() {
        this.zoom = 0.95
        this.zoomCenter = {
            x: this.map.width / 2,
            y: this.map.height / 2,
        }

        this.resize()
    }

    removeAllWalls(updateUnreachableZones: boolean) {
        for (const wall of this.walls) {
            wall.remove()
        }
        this.walls = []
        if (updateUnreachableZones) this.updateMap()
    }

    removeWall(wall: Wall, updateUnreachableZones: boolean) {
        for (let i = 0; i < this.walls.length; ++i) {
            if (wall == this.walls[i]) {
                this.walls[i].remove()
                this.walls.splice(i, 1)
            }
        }
        if (updateUnreachableZones) this.updateMap()
    }

    addWall(wall: IWall, updateUnreachableZones: boolean) {
        const newWall = new Wall(this.wallLayer, copyObject(wall.position), wall.type)
        this.walls.push(newWall)
        if (updateUnreachableZones) this.updateMap()
        return newWall
    }

    importFile(fileName: string, fileContent: string) {
        // Test File Type
        const fileExtension = getFileExtension(fileName).toLowerCase()
        if (this.importTypes.indexOf(`.${fileExtension}`) === -1) {
            alert(`File type .${fileExtension} is not supported.\n\nSupported file types: ${this.importTypes.join(', ')}`)
            return
        }

        const fileBaseName = getFileBaseName(fileName)
        // sir files need 'map_' in the beginning of the file name
        if (fileExtension === 'sir' && fileBaseName.slice(0, 4) !== 'map_') {
            alert(`Files of type .sir need to start with 'map_' to be identified as a maze.`)
            return
        }

        switch (fileExtension) {
            case 'maz':
                {
                    const map = importMAZFile(fileContent)

                    this.resetActions()
                    this.mapName = fileBaseName
                    this.setMapSize(map.width, map.height)
                    // Reset zoom
                    this.centerView()

                    this.removeAllWalls(false)
                    for (const wall of map.walls) {
                        this.addWall(wall, false)
                    }
                    this.updateMap()
                }
                break
            case 'sir':
                {
                    const map = importSIRFile(fileContent)

                    this.resetActions()
                    this.mapName = map.name
                    this.mapAuthor = map.author
                    this.mapDescription = map.description
                    this.setMapSize(map.width, map.height)
                    // Reset zoom
                    this.centerView()

                    this.removeAllWalls(false)
                    for (const wall of map.walls) {
                        this.addWall(wall, false)
                    }
                    this.updateMap()
                }
                break
        }
    }

    exportFile(format: string, name: string, option: 'download' | 'share') {
        let fileName: string
        let fileContent: string

        switch (format) {
            case '.maz':
                {  // only square mazes
                    if (this.map.width !== this.map.height) {
                        alert(`MAZ files only supports square mazes.\nThe map has to be of same width and height.\n\nCurrent width: ${this.map.width}\nCurrent height: ${this.map.height}`)
                        break
                    }

                    const size = this.map.width - 1

                    // only mazes smallen then 
                    if (size < 2 || size > 62) {
                        alert(`MAZ files only supports mazes of the size 1 to 31.\n\nCurrent size: ${this.map.width}`)
                        break
                    }

                    // only basic walls
                    let nonBasicWalls = 0
                    for (const wall of this.walls) {
                        if (wall.type !== WallType.Basic) nonBasicWalls++
                    }
                    if (nonBasicWalls !== 0) {
                        alert(`MAZ files only supports mazes made of basic walls.\n\nAmount of non basic walls: ${nonBasicWalls}`)
                        break
                    }

                    // Export
                    const lengthString = size < 10 ? `0${size}` : `${size}`
                    const data = generateMazeData(this.map.width, this.map.height, this.walls)

                    fileName = `${name}.MAZ`
                    fileContent = `${lengthString}\n${data}\n`
                }

            case '.sir':
                {
                    let textFile = ''
                    textFile += `$${this.mapName}\n`
                    textFile += `$${0}\n` // Title color red value 0-255
                    textFile += `$${0}\n` // Title color green value 0-255
                    textFile += `$${0}\n` // Title color blue value 0-255
                    textFile += `$${this.mapAuthor}\n`
                    textFile += `$${this.map.width}\n`
                    textFile += `$${this.map.height}\n`
                    textFile += `$${this.mapDescription}\n`
                    textFile += `$${'000000000'}\n` // fog color
                    textFile += `$${'0'}\n` // floor texture
                    textFile += `$${'0'}\n` // sky texture
                    textFile += `$${'0'}\n` // door texture
                    textFile += `$${'0'}\n` // wall texture
                    const mazeData = generateMazeDataInterlaced(this.map.width, this.map.height, this.walls)
                    textFile += `${mazeData}`

                    fileName = `map_${name}.sir`
                    fileContent = textFile
                }
        }

        if (option === 'download') {
            downloadText(fileName, fileContent)
        } else if (option === 'share') {
            if (typeof fileName !== 'undefined' && typeof fileContent !== 'undefined')
                return this.shareLink(fileName, fileContent)
            else return undefined
        }
    }

    importShare(hash: string) {
        const split = hash.split(';')
        if (split.length !== 2) return

        this.resetActions()
        const fileName = decodeURIComponent(split[0])
        const fileContent = decodeURIComponent(split[1])

        this.importFile(fileName, fileContent)
    }

    shareLink(fileName: string, fileContent: string) {
        const fileNameEncoded = encodeURIComponent(fileName)
        const fileContentEncoded = encodeURIComponent(fileContent)

        return `${location.href}#${fileNameEncoded};${fileContentEncoded}`
    }

    actionResizeMap(width: number, height: number) {

        if (this.map.width == width && this.map.height == height) {
            // nothing really happend
            return
        }



        // TODO also remove other walls in zone
        let removedWalls: IWall[] = []


        const previousWidth = this.map.width
        const previousHeight = this.map.height

        const applySize = (newWidth: number, newHeight: number) => {
            // remove outer walls
            for (let x = 0; x < this.map.width; ++x) {
                const wallTop = getWallAt(this.walls, { x1: x, y1: 0, x2: x + 1, y2: 0 })
                this.removeWall(wallTop, false)
                const wallBottom = getWallAt(this.walls, { x1: x, y1: this.map.height, x2: x + 1, y2: this.map.height })
                this.removeWall(wallBottom, false)
            }
            for (let y = 0; y < this.map.height; ++y) {
                const wallLeft = getWallAt(this.walls, { x1: 0, y1: y, x2: 0, y2: y + 1 })
                this.removeWall(wallLeft, false)
                const wallRight = getWallAt(this.walls, { x1: this.map.width, y1: y, x2: this.map.width, y2: y + 1 })
                this.removeWall(wallRight, false)
            }

            // put new outer walls
            for (let x = 0; x < newWidth; ++x) {
                this.addWall({ type: WallType.Basic, position: { x1: x, y1: 0, x2: x + 1, y2: 0 } }, false)
                this.addWall({ type: WallType.Basic, position: { x1: x, y1: newHeight, x2: x + 1, y2: newHeight } }, false)
            }
            for (let y = 0; y < newHeight; ++y) {
                this.addWall({ type: WallType.Basic, position: { x1: 0, y1: y, x2: 0, y2: y + 1 } }, false)
                this.addWall({ type: WallType.Basic, position: { x1: newWidth, y1: y, x2: newWidth, y2: y + 1 } }, false)
            }

            // Update map and stuff
            this.setMapSize(newWidth, newHeight)
            this.updateMap()
            this.centerView()
        }

        const redo = () => {

            // remove inner walls out of zone
            const size = { width, height }
            for (let i = 0; i < this.walls.length; ++i) {
                const wall = this.walls[i]
                if (wallWithinBounds(size, wall) == false && // not in new zone
                    wallWithinBounds(this.map, wall) == true // in currently, so it's not and edge wall
                ) {
                    console.log(wall)
                    removedWalls.push({ type: wall.type, position: copyObject(wall.position) })
                    wall.remove()
                    this.walls.splice(i, 1)
                    i -= 1
                }
            }

            applySize(width, height)
        }

        const undo = () => {
            // restore walls
            for (const wall of removedWalls) {
                this.addWall(wall, false)
            }
            removedWalls = []

            applySize(previousWidth, previousHeight)
        }

        redo()

        this.newAction({
            type: ActionType.MapResize,
            redo,
            undo,
        })

    }

    actionNewWall(wall: IWall) {

        let newWall: IWall = {
            type: wall.type,
            position: copyObject(wall.position),
        }

        const redo = () => {
            this.addWall(newWall, true)
        }

        const undo = () => {
            const wallAtPos = getWallAt(this.walls, newWall.position)
            this.removeWall(wallAtPos, true)
        }

        redo()

        this.newAction({
            type: ActionType.NewWall,
            redo,
            undo,
        })
    }

    actionRemoveWall(wall: Wall) {

        let removedWall: IWall = {
            type: wall.type,
            position: copyObject(wall.position),
        }

        const redo = () => {
            const wallAtPos = getWallAt(this.walls, removedWall.position)
            this.removeWall(wallAtPos, true)
        }

        const undo = () => {
            this.addWall(removedWall, true)
        }

        redo()

        this.newAction({
            type: ActionType.NewWall,
            redo,
            undo,
        })
    }

    actionRemoveWalls() {

        if (this.walls.length == this.map.width * 2 + this.map.height * 2) {
            // empty already
            return
        }

        let removedWalls: IWall[] = []

        const redo = () => {
            for (let i = 0; i < this.walls.length; ++i) {
                const wall = this.walls[i]
                if (wallWithinBounds(this.map, wall)) {
                    removedWalls.push({ type: wall.type, position: copyObject(wall.position) })
                    wall.remove()
                    this.walls.splice(i, 1)
                    i -= 1
                }
            }
            this.updateMap()
        }

        const undo = () => {
            // restore walls
            for (const wall of removedWalls) {
                this.addWall(wall, false)
            }
            removedWalls = []
            this.updateMap()
        }

        redo()

        this.newAction({
            type: ActionType.RemoveInnerWalls,
            redo,
            undo,
        })
    }

    actions: Action[]
    actionIndex: number // the current action state
    _actionsSaved: boolean
    actionsSavedIndex: number

    set actionsSaved(value: boolean) {
        this._actionsSaved = value
        if (this._actionsSaved === true) this.actionsSavedIndex = this.actionIndex

        if (typeof this.buttonSave !== 'undefined') {
            if (this._actionsSaved) this.buttonSave.textContent = `Save`
            else this.buttonSave.textContent = `Save *`
        }
    }

    get actionsSaved() {
        return this._actionsSaved
    }

    resetActions() {
        this.actions = []
        this.actionIndex = -1
        this.actionsSaved = true
        this.actionsSavedIndex = -1
        this.updateActionButtons()
    }

    updateActionButtons() {
        if (typeof this.buttonUndo !== 'undefined') {
            this.buttonUndo.disabled = this.actionIndex == -1
            this.buttonRedo.disabled = this.actionIndex == this.actions.length - 1
        }
    }

    newAction(action: Action) {
        // Remove potential redo actions
        this.actions.splice(this.actionIndex + 1)

        this.actions.push(action)
        this.actionIndex = this.actions.length - 1
        if (this.actionsSavedIndex >= this.actionIndex) {
            this.actionsSavedIndex = -1
        }
        this.actionsSaved = false

        this.updateActionButtons()
    }

    undo() {
        // Undo current action
        this.actions[this.actionIndex].undo()

        // Move index to previous action
        this.actionIndex--
        this.actionsSaved = this.actionsSavedIndex == this.actionIndex

        this.updateActionButtons()
    }

    redo() {
        // Redo following action
        this.actions[this.actionIndex + 1].redo()

        // Move index to following action
        this.actionIndex++
        this.actionsSaved = this.actionsSavedIndex == this.actionIndex

        this.updateActionButtons()
    }
}

const enum ActionType {
    NewWall,
    RemoveWall,
    RemoveInnerWalls,
    MapResize,
}
interface Action {
    type: ActionType
    undo: () => any
    redo: () => any
}

class Player {

    position = {
        x: WallLength / 2,
        y: WallLength / 2,
    }
    direction = 0

    constructor(parent: SVGElement) {

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        parent.appendChild(g)

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.style.fill = 'yellow'
        circle.setAttribute('cx', `${this.position.x}`)
        circle.setAttribute('cy', `${this.position.y}`)
        circle.setAttribute('r', `${PlayerRadius}`)
        g.appendChild(circle)

        const x2 = this.position.x + PlayerRadius * Math.cos(this.direction * Math.PI / 180)
        const y2 = this.position.y + PlayerRadius * Math.sin(this.direction * Math.PI / 180)

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.style.stroke = 'black'
        line.style.strokeWidth = '0.05'
        line.style.opacity = '0.5'
        line.setAttribute('x1', `${this.position.x}`)
        line.setAttribute('y1', `${this.position.y}`)
        line.setAttribute('x2', `${x2}`)
        line.setAttribute('y2', `${y2}`)
        g.appendChild(line)

        new Shot(parent, { x: this.position.x + 1, y: this.position.y })
    }

}

class Shot {

    position = {
        x: 0,
        y: 0,
    }
    direction = 0

    constructor(parent: SVGElement, position: { x: number, y: number }) {
        this.position = position

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        parent.appendChild(g)

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.style.fill = 'yellow'
        circle.setAttribute('cx', `${this.position.x}`)
        circle.setAttribute('cy', `${this.position.y}`)
        circle.setAttribute('r', `${0.005}`)
        g.appendChild(circle)

        const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle2.style.fill = 'none'
        circle2.style.stroke = 'yellow'
        circle2.style.strokeWidth = '0.005'
        circle2.setAttribute('cx', `${this.position.x}`)
        circle2.setAttribute('cy', `${this.position.y}`)
        circle2.setAttribute('r', `${ShotCollisionPlayerRadius}`)
        g.appendChild(circle2)

        const x2 = this.position.x + ShotCollisionPlayerRadius * Math.cos(this.direction * Math.PI / 180)
        const y2 = this.position.y + ShotCollisionPlayerRadius * Math.sin(this.direction * Math.PI / 180)

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.style.stroke = 'black'
        line.style.strokeWidth = '0.01'
        line.style.opacity = '0.5'
        line.setAttribute('x1', `${this.position.x}`)
        line.setAttribute('y1', `${this.position.y}`)
        line.setAttribute('x2', `${x2}`)
        line.setAttribute('y2', `${y2}`)
        g.appendChild(line)

    }

}

class Wall {

    parent: SVGElement
    g: SVGElement

    type: WallType
    position = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
    }

    constructor(parent: SVGElement, position: Line, type: WallType) {
        this.parent = parent
        this.position = position
        this.type = type

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        parent.appendChild(g)
        this.g = g

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        switch (this.type) {
            case WallType.Basic: line.style.stroke = WallColorBasic; break
            case WallType.Door: line.style.stroke = WallColorDoor; break
            case WallType.Transparent:
                line.style.stroke = WallColorTransparent
                line.style.opacity = '0.05'
                break
        }
        line.style.strokeWidth = '0.02'
        line.style.strokeLinecap = 'square'
        line.setAttribute('x1', `${this.position.x1}`)
        line.setAttribute('y1', `${this.position.y1}`)
        line.setAttribute('x2', `${this.position.x2}`)
        line.setAttribute('y2', `${this.position.y2}`)
        g.appendChild(line)

    }

    remove() {
        this.parent.removeChild(this.g)
    }

}

class WallMarker {

    rect: SVGRectElement

    position = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
    }

    constructor(parent: SVGElement, position: Line) {

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        parent.appendChild(g)

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.style.fill = 'none'
        rect.style.stroke = '#000'
        rect.style.strokeWidth = '0.02'
        rect.style.opacity = '0.5'
        rect.style.display = 'none'
        g.appendChild(rect)
        this.rect = rect

        this.setPosition(position)
    }

    snapPosition(pointX: number, pointY: number, map: { width: number, height: number }) {

        // find closed grid segment line to the point

        // round to closest grid point
        const x = Math.round(pointX)
        const y = Math.round(pointY)

        const detlaX = pointX - x
        const detlaY = pointY - y

        let position: Line

        const horizontal = Math.abs(detlaX) > Math.abs(detlaY)
        if (horizontal) {
            const right = detlaX > 0
            if (right) {
                position = { x1: x, y1: y, x2: x + 1, y2: y, }
            } else {
                position = { x1: x - 1, y1: y, x2: x, y2: y, }
            }
        } else {
            const bottom = detlaY > 0
            if (bottom) {
                position = { x1: x, y1: y, x2: x, y2: y + 1, }
            } else {
                position = { x1: x, y1: y - 1, x2: x, y2: y, }
            }
        }
        this.setPosition(position)

        if (wallWithinBounds(map, { position }) === false)
            this.rect.style.display = 'none'
        else
            this.rect.style.display = 'block'
    }

    setPosition(position: Line) {
        this.position = position

        this.rect.setAttribute('x', `${this.position.x1 - 0.01 * 2}`)
        this.rect.setAttribute('y', `${this.position.y1 - 0.01 * 2}`)

        const horizontal = this.position.y1 === this.position.y2
        if (horizontal) {
            this.rect.setAttribute('width', `${this.position.x2 - this.position.x1 + 0.01 * 2 * 2}`)
            this.rect.setAttribute('height', `${0.02 * 2}`)
        } else {
            this.rect.setAttribute('width', `${0.02 * 2}`)
            this.rect.setAttribute('height', `${this.position.y2 - this.position.y1 + 0.01 * 2 * 2}`)
        }
    }

}