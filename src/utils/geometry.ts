interface Line {
	x1: number
	y1: number
	x2: number
	y2: number
}

function inBounds(
	position: { x: number; y: number },
	boundsRect: { x1: number; y1: number; x2: number; y2: number }
) {
	return (
		position.x >= boundsRect.x1 &&
		position.x <= boundsRect.x2 &&
		position.y >= boundsRect.y1 &&
		position.y <= boundsRect.y2
	)
}
