/* eslint-disable no-alert */

function init() {
  new SurirEditor()
}

const WALL_LENGTH = 1
const WC = new Map([
  [WallType.Basic, '#808080'],
  [WallType.Door, '#ffff00'],
  [WallType.Transparent, '#ffffff'],
])

const WALL_COLOR: { readonly [P in WallType]: string } = {
  [WallType.Basic]: '#808080',
  [WallType.Door]: '#ffff00',
  [WallType.Transparent]: '#ffffff',
}

const FLOOR_COLOR = '#5c5c5c'

const SKY_COLOR = '#5c6bde'

const PLAYER_RADIUS = 6 / 48

const SHOT_RADIUS = 2 / 48
const SHOT_COLLISION_PLAYER_RADIUS = 3 / 48

const enum WallType {
  Basic,
  Door,
  Transparent,
}

type EditorTransmissionIds = 'mapNew' | 'mapName' | 'mapAuthor'

class EditorMap {
  private _name: string
  private _author: string | undefined = undefined

  description: string | undefined = ''
  transmitter: Transmitter<EditorTransmissionIds>

  width = 6
  height = 6
  walls: Wall[] = []

  constructor(transmitter: Transmitter<EditorTransmissionIds>) {
    this.transmitter = transmitter

    this._name = 'New Map'

    this.transmitter.send('mapNew')
  }

  get name() {
    return this._name
  }

  set name(value: EditorMap['_name']) {
    if (this._name != value) {
      this._name = value
      this.transmitter.send('mapName')
    } else {
      this._name = value
    }
  }

  get author() {
    return this._author
  }

  set author(value: EditorMap['_author']) {
    if (this._author != value) {
      this._author = value
      this.transmitter.send('mapAuthor')
    } else {
      this._author = value
    }
  }
}

class SurirEditor {
  readonly exportTypes = ['.sir', '.maz']
  readonly importTypes = ['.sir', '.maz']
  readonly wallOptions = [
    { title: 'Basic Wall', wallType: WallType.Basic },
    { title: 'Door', wallType: WallType.Door },
    { title: 'Transparent Wall', wallType: WallType.Transparent },
  ]

  zoom: SVGZoom
  undoManager = new UndoManager()

  map: EditorMap

  selectedWallType = WallType.Basic

  svg: SVGSVGElement
  zonesLayer: SVGElement
  wallLayer: SVGElement
  floorRect: SVGElement

  buttonName: HTMLButtonElement
  buttonAuthor: HTMLButtonElement
  buttonMapSize: HTMLButtonElement
  buttonRemoveWalls: HTMLButtonElement
  buttonUndo: HTMLButtonElement
  buttonRedo: HTMLButtonElement
  buttonSave: HTMLButtonElement

  tm = new Transmitter<EditorTransmissionIds>()

  constructor() {
    this.map = new EditorMap(this.tm)
    // Controls Input

    // Controls container
    const buttonContainer = document.createElement('div')
    applyStyles(buttonContainer, {
      position: 'absolute',
      top: '0px',
      left: '0px',
      right: '0px',
      display: 'flex',
      justifyContent: 'flex-end',
    })
    document.body.appendChild(buttonContainer)

    // Button Map Name
    this.buttonName = document.createElement('button')
    this.tm.sub(['mapName', 'mapNew'], () => {
      this.buttonName.textContent = `Map Name: ${this.map.name}`
    })
    this.buttonName.addEventListener('click', () => {
      const value = prompt('Set map name:', `${this.map.name}`)
      if (value === null) return // canceled

      const cleanName = trimAndReduce(value)
      this.actionSetMetaData({ name: cleanName, author: this.map.author })
    })
    buttonContainer.appendChild(this.buttonName)

    // Button Map Author
    this.buttonAuthor = document.createElement('button')
    this.tm.sub(['mapAuthor', 'mapNew'], () => {
      this.buttonAuthor.textContent = `Author: ${this.map.author == 'undefined' ? '' : this.map.author}`
    })
    this.buttonAuthor.addEventListener('click', () => {
      const value = prompt('Set author:', `${this.map.author}`)
      if (value === null) return // canceled

      const cleanName = trimAndReduce(value)
      this.actionSetMetaData({ name: this.map.name, author: cleanName })
    })
    buttonContainer.appendChild(this.buttonAuthor)

    // Button Map Size
    this.buttonMapSize = document.createElement('button')
    this.buttonMapSize.textContent = `Map Size: ${this.map.width} x ${this.map.height}` // also in actionSetMapSize
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
    buttonContainer.appendChild(this.buttonMapSize)

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
    buttonContainer.appendChild(selectWallType)

    // Button Remove Walls
    this.buttonRemoveWalls = document.createElement('button')
    this.buttonRemoveWalls.textContent = 'Remove Walls'
    this.buttonRemoveWalls.addEventListener('click', () => this.actionRemoveWalls())
    buttonContainer.appendChild(this.buttonRemoveWalls)

    // Button Remove Undo
    this.buttonUndo = document.createElement('button')
    this.buttonUndo.textContent = 'Undo'
    this.buttonUndo.disabled = true
    this.buttonUndo.addEventListener('click', () => this.undoManager.undo())
    this.undoManager.onAction.listen((state) => {
      this.buttonUndo.disabled = !state.canUndo
    })
    buttonContainer.appendChild(this.buttonUndo)

    // Button Remove Redo
    this.buttonRedo = document.createElement('button')
    this.buttonRedo.textContent = 'Redo'
    this.buttonRedo.disabled = true
    this.buttonRedo.addEventListener('click', () => this.undoManager.redo())
    this.undoManager.onAction.listen((state) => {
      this.buttonRedo.disabled = !state.canRedo
    })
    buttonContainer.appendChild(this.buttonRedo)

    // Button Center view
    const buttonCenterView = document.createElement('button')
    buttonCenterView.textContent = 'Center View'
    buttonCenterView.addEventListener('click', () => this.zoom.centerView())
    buttonContainer.appendChild(buttonCenterView)

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
    buttonContainer.appendChild(selectExportType)

    // Button Save
    this.buttonSave = document.createElement('button')
    this.buttonSave.textContent = 'Save'
    this.undoManager.onAction.listen((state) => {
      if (state.saved) this.buttonSave.textContent = 'Save'
      else this.buttonSave.textContent = 'Save *'
    })
    this.buttonSave.addEventListener('click', () => {
      this.undoManager.save()
      this.exportFile(selectedExportType, this.map.name, 'download')
    })
    buttonContainer.appendChild(this.buttonSave)

    // Button Share
    const buttonShare = document.createElement('button')
    buttonShare.textContent = 'Share'
    buttonShare.addEventListener('click', () => {
      const link = this.exportFile(selectedExportType, this.map.name, 'share')
      if (typeof link === 'undefined') return

      copyText(link, (err) => {
        if (err) prompt('Here is your link:', link)
        else alert('Link copied to clipboard.')
      })
    })
    buttonContainer.appendChild(buttonShare)

    // Button Import
    const buttonImport = document.createElement('button')
    buttonImport.textContent = 'Open'
    buttonImport.addEventListener('click', () => {
      if (this.undoManager.getState().saved === false && confirm('You have unsaved changes, open a new map?') === false)
        return

      openTextFile((file: File, content: string) => this.importFile(file.name, content), this.importTypes.join(','))
    })
    buttonContainer.appendChild(buttonImport)

    // SVG container
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.style.backgroundColor = SKY_COLOR
    document.body.appendChild(this.svg)

    // Pattern
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    pattern.id = 'pattern'
    pattern.setAttribute('width', '0.04')
    pattern.setAttribute('height', '0.04')
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    this.svg.appendChild(pattern)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.style.stroke = WALL_COLOR[WallType.Basic]
    path.style.strokeWidth = '0.01'
    path.style.opacity = '.3'
    path.setAttribute('d', 'M-0.01,0.01 l0.02,-0.02 M0.00,0.04 l0.04,-0.04 M0.03,0.05 l0.02,-0.02')
    pattern.appendChild(path)

    // Floor
    this.floorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    this.floorRect.style.fill = FLOOR_COLOR
    this.svg.appendChild(this.floorRect)

    // Zones
    this.zonesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.svg.appendChild(this.zonesLayer)

    // Walls
    this.wallLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.svg.appendChild(this.wallLayer)

    // Load

    const hash = urlGetHash()
    if (hash === '') {
      // Create default walls
      for (let x = 0; x < this.map.width; ++x) {
        this.addWall(
          {
            type: WallType.Basic,
            position: { x1: x, y1: 0, x2: x + 1, y2: 0 },
          },
          false
        )
        this.addWall(
          {
            type: WallType.Basic,
            position: {
              x1: x,
              y1: this.map.height,
              x2: x + 1,
              y2: this.map.height,
            },
          },
          false
        )
      }

      for (let y = 0; y < this.map.height; ++y) {
        this.addWall(
          {
            type: WallType.Basic,
            position: { x1: 0, y1: y, x2: 0, y2: y + 1 },
          },
          false
        )
        this.addWall(
          {
            type: WallType.Basic,
            position: {
              x1: this.map.width,
              y1: y,
              x2: this.map.width,
              y2: y + 1,
            },
          },
          false
        )
      }
      this.map.name = 'New Maze'
      this.map.author = ''
      this.updateMap()
    } else {
      urlRemoveHash()
      this.importShare(hash)
    }

    // Player
    new Player(this.svg)

    // Marker
    const wallMarker = new WallMarker(this.svg)

    // Adjust UI
    this.setMapSize(this.map.width, this.map.height, false)
    this.updateMap()

    // Input Listeners

    // Render size
    window.addEventListener('resize', () => this.zoom.onResize())

    // Prevent unsaved leaves
    window.addEventListener('beforeunload', (event: BeforeUnloadEvent) => {
      if (this.undoManager.getState().saved == false) {
        event.preventDefault()
        event.returnValue = ''
      }
    })

    // Load on Hash Change
    window.addEventListener('hashchange', () => {
      const hash = urlGetHash()
      urlRemoveHash()

      if (this.undoManager.getState().saved === false && confirm('You have unsaved changes, open a new map?') === false)
        return

      this.importShare(hash)
    })

    this.zoom = new SVGZoom(this.svg, this.map.width, this.map.height, 0.95)

    // Marker / Set wall
    let clickMoved = false
    this.svg.addEventListener('mousedown', (e: MouseEvent) => {
      clickMoved = false
    })

    window.addEventListener('mousemove', (e: MouseEvent) => {
      clickMoved = true
      const coords = this.zoom.screenToSVGPosition(e.clientX, e.clientY)
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

      const existingWall = getWallAt(this.map.walls, position)
      if (existingWall === null) {
        this.actionNewWall({ type: this.selectedWallType, position })
      } else {
        this.actionRemoveWall(existingWall)
      }
    })
  }

  setMapSize(width: number, height: number, resetView = true) {
    this.map.width = width
    this.map.height = height

    // Adjust floor size
    this.floorRect.setAttribute('width', `${WALL_LENGTH * this.map.width}`)
    this.floorRect.setAttribute('height', `${WALL_LENGTH * this.map.height}`)

    this.buttonMapSize.textContent = `Map size: ${this.map.width} x ${this.map.height}` // also in buttonMapSize init

    if (typeof this.zoom !== 'undefined') {
      this.zoom.setContentSize(this.map.width, this.map.height)
      if (resetView) {
        this.zoom.centerView()
      }
    }
  }

  updateMap() {
    if (typeof this.buttonRemoveWalls !== 'undefined')
      this.buttonRemoveWalls.disabled = this.map.walls.length == this.map.width * 2 + this.map.height * 2 // only outer walls, no inner walls to remove

    // Update unreachable zones
    this.zonesLayer.innerHTML = ''

    for (let y = 0; y < this.map.height; ++y) {
      for (let x = 0; x < this.map.width; ++x) {
        if (
          getWallAt(this.map.walls, { x1: x, y1: y, x2: x + 1, y2: y }) && // top
          getWallAt(this.map.walls, {
            x1: x + 1,
            y1: y,
            x2: x + 1,
            y2: y + 1,
          }) && // right
          getWallAt(this.map.walls, {
            x1: x,
            y1: y + 1,
            x2: x + 1,
            y2: y + 1,
          }) && // bottom
          getWallAt(this.map.walls, { x1: x, y1: y, x2: x, y2: y + 1 }) // left
        ) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.style.fill = 'url(#pattern)'
          rect.setAttribute('x', `${x}`)
          rect.setAttribute('y', `${y}`)
          rect.setAttribute('width', `${WALL_LENGTH}`)
          rect.setAttribute('height', `${WALL_LENGTH}`)
          this.zonesLayer.appendChild(rect)
        }
      }
    }
  }

  removeAllWalls(updateUnreachableZones: boolean) {
    for (const wall of this.map.walls) {
      wall.remove()
    }
    this.map.walls = []
    if (updateUnreachableZones) this.updateMap()
  }

  removeWall(wall: Wall, updateUnreachableZones: boolean) {
    for (let i = 0; i < this.map.walls.length; ++i) {
      if (wall == this.map.walls[i]) {
        this.map.walls[i].remove()
        this.map.walls.splice(i, 1)
      }
    }
    if (updateUnreachableZones) this.updateMap()
  }

  addWall(wall: WallDescription, updateUnreachableZones: boolean) {
    const newWall = new Wall(this.wallLayer, { ...wall.position }, wall.type)
    this.map.walls.push(newWall)
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
      alert("Files of type .sir need to start with 'map_' to be identified as a maze.")
      return
    }

    switch (fileExtension) {
      case 'maz':
        {
          const map = importMAZFile(fileContent)

          this.undoManager.clear()
          this.map.name = fileBaseName
          this.setMapSize(map.width, map.height)

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

          this.undoManager.clear()
          this.map.name = typeof map.name !== 'undefined' ? map.name : 'New Maze'
          this.map.author = map.author
          this.map.description = map.description
          this.setMapSize(map.width, map.height)

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
    let fileName = ''
    let fileContent = ''

    switch (format) {
      case '.maz':
        {
          // only square mazes
          if (this.map.width !== this.map.height) {
            alert(
              `MAZ files only supports square mazes.\nThe map has to be of same width and height.\n\nCurrent width: ${this.map.width}\nCurrent height: ${this.map.height}`
            )
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
          for (const wall of this.map.walls) {
            if (wall.type !== WallType.Basic) nonBasicWalls++
          }
          if (nonBasicWalls !== 0) {
            alert(`MAZ files only supports mazes made of basic walls.\n\nAmount of non basic walls: ${nonBasicWalls}`)
            break
          }

          // Export
          const lengthString = size < 10 ? `0${size}` : `${size}`
          const data = generateMazeData(this.map.width, this.map.height, this.map.walls)

          fileName = `${name}.MAZ`
          fileContent = `${lengthString}\n${data}\n`
        }
        break

      case '.sir':
        {
          let textFile = ''
          textFile += `$${this.map.name}\n`
          textFile += `$${0}\n` // Title color red value 0-255
          textFile += `$${0}\n` // Title color green value 0-255
          textFile += `$${0}\n` // Title color blue value 0-255
          textFile += `$${this.map.author}\n`
          textFile += `$${this.map.width}\n`
          textFile += `$${this.map.height}\n`
          textFile += `$${this.map.description}\n`
          textFile += `$${'000000000'}\n` // fog color
          textFile += `$${'0'}\n` // floor texture
          textFile += `$${'0'}\n` // sky texture
          textFile += `$${'0'}\n` // door texture
          textFile += `$${'0'}\n` // wall texture
          const mazeData = generateMazeDataInterlaced(this.map.width, this.map.height, this.map.walls)
          textFile += `${mazeData}`

          fileName = `map_${name}.sir`
          fileContent = textFile
        }
        break
    }

    if (fileName === '' || fileContent === '') return

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

    this.undoManager.clear()
    const fileName = decodeURIComponent(split[0])
    const fileContent = decodeURIComponent(split[1])

    this.importFile(fileName, fileContent)
  }

  shareLink(fileName: string, fileContent: string) {
    const fileNameEncoded = encodeURIComponent(fileName)
    const fileContentEncoded = encodeURIComponent(fileContent)

    return `${location.href}#${fileNameEncoded};${fileContentEncoded}`
  }

  actionSetMetaData(metaData: { name: string; author: string | undefined }) {
    const newData = { ...metaData }
    const oldData: { name: string; author: string | undefined } = {
      name: this.map.name,
      author: this.map.author,
    }

    const action = (metaData: { name: string; author: string | undefined }) => {
      if (typeof metaData.name !== 'undefined') {
        this.map.name = metaData.name
      }
      this.map.author = metaData.author
    }

    const redo = () => {
      action(newData)
    }

    const undo = () => {
      action(oldData)
    }

    redo()

    this.undoManager.add({ undo, redo })
  }

  actionResizeMap(width: number, height: number) {
    if (this.map.width == width && this.map.height == height) {
      // nothing really happend
      return
    }

    // TODO also remove other walls in zone
    let removedWalls: WallDescription[] = []

    const previousWidth = this.map.width
    const previousHeight = this.map.height

    const applySize = (newWidth: number, newHeight: number) => {
      // remove outer walls
      for (let x = 0; x < this.map.width; ++x) {
        const wallTop = getWallAt(this.map.walls, {
          x1: x,
          y1: 0,
          x2: x + 1,
          y2: 0,
        })
        if (wallTop !== null) this.removeWall(wallTop, false)
        const wallBottom = getWallAt(this.map.walls, {
          x1: x,
          y1: this.map.height,
          x2: x + 1,
          y2: this.map.height,
        })
        if (wallBottom !== null) this.removeWall(wallBottom, false)
      }
      for (let y = 0; y < this.map.height; ++y) {
        const wallLeft = getWallAt(this.map.walls, {
          x1: 0,
          y1: y,
          x2: 0,
          y2: y + 1,
        })
        if (wallLeft !== null) this.removeWall(wallLeft, false)
        const wallRight = getWallAt(this.map.walls, {
          x1: this.map.width,
          y1: y,
          x2: this.map.width,
          y2: y + 1,
        })
        if (wallRight !== null) this.removeWall(wallRight, false)
      }

      // put new outer walls
      for (let x = 0; x < newWidth; ++x) {
        this.addWall(
          {
            type: WallType.Basic,
            position: { x1: x, y1: 0, x2: x + 1, y2: 0 },
          },
          false
        )
        this.addWall(
          {
            type: WallType.Basic,
            position: { x1: x, y1: newHeight, x2: x + 1, y2: newHeight },
          },
          false
        )
      }
      for (let y = 0; y < newHeight; ++y) {
        this.addWall(
          {
            type: WallType.Basic,
            position: { x1: 0, y1: y, x2: 0, y2: y + 1 },
          },
          false
        )
        this.addWall(
          {
            type: WallType.Basic,
            position: { x1: newWidth, y1: y, x2: newWidth, y2: y + 1 },
          },
          false
        )
      }

      // Update map and stuff
      this.setMapSize(newWidth, newHeight)
      this.updateMap()
      this.zoom.centerView()
    }

    const redo = () => {
      // remove inner walls out of zone
      const size = { width, height }
      for (let i = 0; i < this.map.walls.length; ++i) {
        const wall = this.map.walls[i]
        if (
          wallWithinBounds(size, wall) == false && // not in new zone
          wallWithinBounds(this.map, wall) == true // in currently, so it's not and edge wall
        ) {
          removedWalls.push({ type: wall.type, position: { ...wall.position } })
          wall.remove()
          this.map.walls.splice(i, 1)
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

    this.undoManager.add({ undo, redo })
  }

  actionNewWall(wall: WallDescription) {
    const newWall: WallDescription = {
      type: wall.type,
      position: { ...wall.position },
    }

    const redo = () => {
      this.addWall(newWall, true)
    }

    const undo = () => {
      const wallAtPos = getWallAt(this.map.walls, newWall.position)
      if (wallAtPos !== null) this.removeWall(wallAtPos, true)
    }

    redo()

    this.undoManager.add({ undo, redo })
  }

  actionRemoveWall(wall: Wall) {
    const removedWall: WallDescription = {
      type: wall.type,
      position: { ...wall.position },
    }

    const redo = () => {
      const wallAtPos = getWallAt(this.map.walls, removedWall.position)
      if (wallAtPos !== null) this.removeWall(wallAtPos, true)
    }

    const undo = () => {
      this.addWall(removedWall, true)
    }

    redo()

    this.undoManager.add({ undo, redo })
  }

  actionRemoveWalls() {
    if (this.map.walls.length == this.map.width * 2 + this.map.height * 2) {
      // empty already
      return
    }

    let removedWalls: WallDescription[] = []

    const redo = () => {
      for (let i = 0; i < this.map.walls.length; ++i) {
        const wall = this.map.walls[i]
        if (wallWithinBounds(this.map, wall)) {
          removedWalls.push({ type: wall.type, position: { ...wall.position } })
          wall.remove()
          this.map.walls.splice(i, 1)
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

    this.undoManager.add({ undo, redo })
  }
}

class Player {
  position = {
    x: WALL_LENGTH / 2,
    y: WALL_LENGTH / 2,
  }
  direction = 0

  constructor(parent: SVGElement) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    parent.appendChild(g)

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.style.fill = 'yellow'
    circle.setAttribute('cx', `${this.position.x}`)
    circle.setAttribute('cy', `${this.position.y}`)
    circle.setAttribute('r', `${PLAYER_RADIUS}`)
    g.appendChild(circle)

    const x2 = this.position.x + PLAYER_RADIUS * Math.cos((this.direction * Math.PI) / 180)
    const y2 = this.position.y + PLAYER_RADIUS * Math.sin((this.direction * Math.PI) / 180)

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

  constructor(parent: SVGElement, position: { x: number; y: number }) {
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
    circle2.setAttribute('r', `${SHOT_COLLISION_PLAYER_RADIUS}`)
    g.appendChild(circle2)

    const x2 = this.position.x + SHOT_COLLISION_PLAYER_RADIUS * Math.cos((this.direction * Math.PI) / 180)
    const y2 = this.position.y + SHOT_COLLISION_PLAYER_RADIUS * Math.sin((this.direction * Math.PI) / 180)

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
    line.style.stroke = WALL_COLOR[this.type]
    line.style.opacity = this.type == WallType.Transparent ? '0.05' : '1'
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

  constructor(parent: SVGElement) {
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
  }

  snapPosition(pointX: number, pointY: number, map: { width: number; height: number }) {
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
        position = { x1: x, y1: y, x2: x + 1, y2: y }
      } else {
        position = { x1: x - 1, y1: y, x2: x, y2: y }
      }
    } else {
      const bottom = detlaY > 0
      if (bottom) {
        position = { x1: x, y1: y, x2: x, y2: y + 1 }
      } else {
        position = { x1: x, y1: y - 1, x2: x, y2: y }
      }
    }
    this.setPosition(position)

    if (wallWithinBounds(map, { position }) === false) this.rect.style.display = 'none'
    else this.rect.style.display = 'block'
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
