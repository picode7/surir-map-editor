interface IWall {
    type: WallType,
    position: Line,
}

/**
 * Check if inside of maze and not one border
 * @param width 
 * @param height 
 * @param wall 
 */
function wallWithinBounds(size: { width: number, height: number }, wall: { position: Line }) {
    const horizontal = wall.position.x1 !== wall.position.x2
    if (horizontal) {
        if (inBounds({ x: wall.position.x1, y: wall.position.y1 }, { x1: 0, y1: 1, x2: size.width - 1, y2: size.height - 1 }) === false)
            return false
    } else {
        if (inBounds({ x: wall.position.x1, y: wall.position.y1 }, { x1: 1, y1: 0, x2: size.width - 1, y2: size.height - 1 }) === false)
            return false
    }

    return true
}

function getWallAt<T extends { position: Line }>(walls: T[], position: Line): T {
    for (const wall of walls) {
        if (
            wall.position.x1 === position.x1 &&
            wall.position.y1 === position.y1 &&
            wall.position.x2 === position.x2 &&
            wall.position.y2 === position.y2
        ) {
            return wall
        }
    }
    return null
}

function importMAZFile(text: string) {
    /*
    .MAZ File Format Specification
    Last updated: 10/28/99
    
    A .MAZ File has the following format:
    
    Size
    Maze Data
    
           Size: The size of the maze, counting from 0.  (For example, if
                 you have a maze whose top is 15 Xs wide, you have a size
                 14 maze.)  If you use MMUTIL32 -m -t## to make a template,
                 it sets this for you.  The size must be 2 digits; put a 0
                 in front of sizes less than 10.  It must be even from 02-62
                 (MidiMaze may restrict this further, I'm not sure).
    
      Maze Data: The maze data block is an array of characters:
                   X is a wall
                   . is blank space
                 Other characters in the maze data will cause errors.
    
    Blank Lines: No blank lines are allowed.
    
         Spaces: Spaces in the Maze Data area will cause errors.
    
    Sample .MAZ file:
    
    08
    XXXXXXXXX
    X...X...X
    X...X...X
    X..XX...X
    X.......X
    X...XXXXX
    X.......X
    X...X...X
    XXXXXXXXX 
    */

    let walls: IWall[] = []
    const lines = text.split('\n')

    // First line maze size
    lines[0] // we actually ignore that and rely on the map data itself

    // Maze data, square maze
    const lineOffest = 1
    const size = lines[lineOffest].trim().length - 1
    for (let l = lineOffest; l < lineOffest + (size + 1); ++l) {
        const lineNumber = l - lineOffest
        const line = lines[l]
        const y = Math.floor(lineNumber / 2)
        if (lineNumber % 2 === 0) {
            // read horizontal walls
            for (let i = 0; i < size + 1; ++i) {
                if (i % 2 === 0) continue // only every other value is significant
                switch (line[i]) {
                    case "X":
                        const x = Math.floor(i / 2)
                        walls.push({ type: WallType.Basic, position: { x1: x, y1: y, x2: x + 1, y2: y } })
                        break
                }
            }
        } else {
            // read vertical walls
            for (let i = 0; i < size + 1; ++i) {
                if (i % 2 === 1) continue // only every other value is significant
                switch (line[i]) {
                    case "X":
                        const x = Math.floor(i / 2)
                        walls.push({ type: WallType.Basic, position: { x1: x, y1: y, x2: x, y2: y + 1 } })
                        break
                }
            }
        }
    }

    return { walls, width: size / 2, height: size / 2 }
}

function generateMazeData(width: number, height: number, walls: { position: Line, type: WallType }[]) {
    let dataArray: string[][] = []
    for (let y = 0; y < height * 2 + 1; ++y) {
        dataArray[y] = []
        for (let x = 0; x < width * 2 + 1; ++x) {
            dataArray[y][x] = '.'
        }
    }

    for (let y = 0; y < height * 2 + 1; ++y) {
        const yPos = Math.floor(y / 2)
        for (let x = 0; x < width * 2 + 1; ++x) {
            if (y % 2 === 0) { // horizontals
                if (x % 2 === 1) {
                    // yep that can be a hor wall
                    const xPos = Math.floor(x / 2)
                    const wall = getWallAt(walls, { x1: xPos, y1: yPos, x2: xPos + 1, y2: yPos, })
                    if (wall === null) continue

                    switch (wall.type) {
                        case WallType.Basic:
                            dataArray[y][x - 1] = 'X'
                            dataArray[y][x] = 'X'
                            dataArray[y][x + 1] = 'X'
                            break
                        case WallType.Door:
                            if (dataArray[y][x - 1] !== 'X') dataArray[y][x - 1] = 'D'
                            dataArray[y][x] = 'D'
                            if (dataArray[y][x + 1] !== 'X') dataArray[y][x + 1] = 'D'
                            break
                        case WallType.Transparent:
                            if (dataArray[y][x - 1] !== 'X' && dataArray[y][x - 1] !== 'D') dataArray[y][x - 1] = 'T'
                            dataArray[y][x] = 'T'
                            if (dataArray[y][x + 1] !== 'X' && dataArray[y][x + 1] !== 'D') dataArray[y][x + 1] = 'T'
                            break
                    }
                }
            } else { // verticals
                if (x % 2 === 0) {
                    // yep that can be a ver wall
                    const xPos = Math.floor(x / 2)
                    const wall = getWallAt(walls, { x1: xPos, y1: yPos, x2: xPos, y2: yPos + 1, })
                    if (wall === null) continue

                    switch (wall.type) {
                        case WallType.Basic:
                            dataArray[y - 1][x] = 'X'
                            dataArray[y][x] = 'X'
                            dataArray[y + 1][x] = 'X'
                            break
                        case WallType.Door:
                            if (dataArray[y - 1][x] !== 'X') dataArray[y - 1][x] = 'D'
                            dataArray[y][x] = 'D'
                            if (dataArray[y + 1][x] !== 'X') dataArray[y + 1][x] = 'D'
                            break
                        case WallType.Transparent:
                            if (dataArray[y - 1][x] !== 'X' && dataArray[y - 1][x] !== 'D') dataArray[y - 1][x] = 'T'
                            dataArray[y][x] = 'T'
                            if (dataArray[y + 1][x] !== 'X' && dataArray[y + 1][x] !== 'D') dataArray[y + 1][x] = 'T'
                            break
                    }
                }
            }
        }
    }

    let dataLines: string[] = []
    dataArray.forEach(v => dataLines.push(v.join('')))
    const data = dataLines.join('\n')

    return data
}

function importSIRFile(text: string) {
    let walls: IWall[] = []
    let name: string
    let author: string
    let description: string
    let titleColor: number[] = []
    let fogColor: number[] = []
    let floorTexture: string
    let skyTexture: string
    let doorTexture: string
    let wallTexture: string

    const fParseTexOrColor = (param: string) => {
        if (param.length != 0) {
            if (param[0] == "c") {
                // expect cRRRGGGBBB
                if (param.length == 10) {
                    const r = parseInt(param.substr(1, 3))
                    const g = parseInt(param.substr(4, 3))
                    const b = parseInt(param.substr(7, 3))
                    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
                        return `rgb(${r},${g},${b})`
                    }
                }
            } else {
                // expect tex id
                const id = parseInt(param)
                if (id >= 0 && id <= 2) return `${id}`
            }
        }
        return `${0}`
    }


    let width = 0
    let height = 0
    let m = 0
    let t = 0
    const lines = text.split('\n')
    for (const line of lines) {
        if (line.length == 0) continue
        if (line[0] == "$") {
            // Meta Data
            const param = line.substr(1)
            switch (m) {
                case 0: name = param; break
                case 1: titleColor[0] = parseInt(param) /*title color r*/; break
                case 2: titleColor[1] = parseInt(param) /*title color g*/; break
                case 3: titleColor[2] = parseInt(param) /*title color b*/; break
                case 4: author = param; break
                case 5: /*width*/; break
                case 6: /*height*/; break
                case 7: description = param; break
                case 8: fogColor = [parseInt(param.substr(0, 3)), parseInt(param.substr(3, 3)), parseInt(param.substr(6, 3))] /*fog color rgb*/; break
                case 9: floorTexture = fParseTexOrColor(param); break
                case 10: skyTexture = fParseTexOrColor(param); break
                case 11: doorTexture = fParseTexOrColor(param); break
                case 12: wallTexture = fParseTexOrColor(param); break
            }
            m++
        } else {
            // Map Structure
            const y = Math.floor(t / 2)
            width = line.length - 1
            height = Math.max(height, y)
            if (t % 2 == 0) { // horizontal walls
                for (let x = 0; x < line.length - 1; ++x) {
                    if (line[x] == '.') continue
                    let type: WallType
                    switch (line[x]) {
                        case "X": type = WallType.Basic; break
                        case "Y": type = WallType.Door; break
                        case "Z": type = WallType.Transparent; break
                    }
                    walls.push({ type, position: { x1: x, y1: y, x2: x + 1, y2: y } })
                }
            } else { // verical walls
                for (let x = 0; x < line.length; ++x) {
                    if (line[x] == '.') continue
                    let type: WallType
                    switch (line[x]) {
                        case "X": type = WallType.Basic; break
                        case "Y": type = WallType.Door; break
                        case "Z": type = WallType.Transparent; break
                    }
                    walls.push({ type, position: { x1: x, y1: y, x2: x, y2: y + 1 } })
                }
            }
            t++  // toggle each line
        }
    }

    return {
        width,
        height,
        walls,
        name,
        author,
        description,

        titleColor,
        fogColor,
        floorTexture,
        skyTexture,
        doorTexture,
        wallTexture,
    }
}

function generateMazeDataInterlaced(width: number, height: number, walls: { position: Line, type: WallType }[]) {
    let data = ''

    for (let y = 0; y < height * 2 + 1; ++y) {
        const yPos = Math.floor(y / 2)
        for (let x = 0; x < width + 1; ++x) {
            let wall: { type: WallType }
            if (y % 2 === 0) { // horizontals
                wall = getWallAt(walls, { x1: x, y1: yPos, x2: x + 1, y2: yPos, })
            } else { // verticals
                wall = getWallAt(walls, { x1: x, y1: yPos, x2: x, y2: yPos + 1, })
            }

            if (wall === null) {
                data += '.'
            } else {
                switch (wall.type) {
                    case WallType.Basic:
                        data += 'X'
                        break
                    case WallType.Door:
                        data += 'Y'
                        break
                    case WallType.Transparent:
                        data += 'Z'
                        break
                }
            }
        }
        data += '\n'
    }

    return data
}