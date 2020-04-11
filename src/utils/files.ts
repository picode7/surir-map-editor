function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/plain' })

    if (filename.indexOf('.') === -1)
        filename += '.txt'

    download(blob, filename)
}

function download(blob: Blob, filename: string) {
    const el = document.createElement('a')

    const url = URL.createObjectURL(blob);
    el.setAttribute('href', url)
    el.setAttribute('download', filename)

    el.style.display = 'none'
    document.body.appendChild(el)

    el.click()


    setTimeout(() => { URL.revokeObjectURL(url) }, 150)

    document.body.removeChild(el)
}

interface HTMLInputEvent extends Event {
    target: HTMLInputElement & EventTarget;
}

function openTextFile(callback: (file: File, content: any) => any, accept = '*') {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = accept
    fileInput.style.display = 'none'
    fileInput.addEventListener('change', (e: HTMLInputEvent) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.addEventListener('load', (eLoad) => {
            const contents = eLoad.target.result
            callback(e.target.files[0], contents)
            document.body.removeChild(fileInput)
        })
        reader.readAsText(file)
    })
    document.body.appendChild(fileInput)
    fileInput.click()
}

/**
 * Returns the file extension, case sensitive.
 * @param filename 
 */
function getFileExtension(filename: string) {
    // prevent errors with null and undefined
    if (typeof filename !== 'string') return ''

    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1) {
        return ''
    }

    return filename.slice(lastDot + 1)
}

/**
 * Returns the file base name without it's extention. Input expected without path.
 * @param filename filename without path.
 */
function getFileBaseName(filename: string) {
    // prevent errors with null and undefined
    if (typeof filename !== 'string') return ''

    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1) {
        return ''
    }

    return filename.slice(0, lastDot)

}