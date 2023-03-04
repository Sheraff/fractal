// @ts-check

/**
 * @typedef {[number, number]} Vec
 */

/**
 * @typedef {Object} State
 * @property {number} zoom
 * @property {Vec} focus
 */

const canvas = document.querySelector('canvas')
new ResizeObserver(([entry]) => {
	canvas.height = entry.contentRect.height
	canvas.width = entry.contentRect.width
}).observe(canvas)

/** @type {State} */
const state = {
	zoom: 1,
	focus: [0, 0],
}
canvas.addEventListener('wheel', (e) => {
	const _dz = - e.deltaY / 1000
	const dz = Math.max(state.zoom - 1, _dz)
	state.zoom = state.zoom - dz

	const dimension = Math.max(canvas.width, canvas.height)
	const dx = dz > 0
		? (e.offsetX - dimension / 2)
		: (-state.focus[0])
	const dy = dz > 0
		? (e.offsetY - dimension / 2)
		: (-state.focus[1])
	const multiplier = Math.abs(dz) * 2_500 * (2 - state.zoom) / dimension
	state.focus[0] += dx * multiplier
	state.focus[1] += dy * multiplier
})

const ctx = canvas.getContext('2d')
loop(ctx, state)

/**
 * Compute Zn² + C
 * @typedef {Vec} current
 * @typedef {Vec} constant
 * @returns {Vec}
 */
function computeNext (current, constant) {
	const zr = current[0] ** 2 - current[1] ** 2
	const zi = 2 * current[0] * current[1]
	return [zr + constant[0], zi + constant[1]]
}

/**
 * mod squared
 * @param {Vec} z
 * @returns {number}
 */
function modSquared (z) {
	return z[0] ** 2 + z[1] ** 2
}

/**
 * Compute the number of iterations before the sequence diverges
 * @param {Vec} z0
 * @param {Vec} c
 * @param {number} maxIterations
 * @returns {number}
 * @see https://en.wikipedia.org/wiki/Mandelbrot_set
 */
function computeIterations (z0, c, maxIterations) {
	let zn = z0
	for (let iteration = 0; iteration < maxIterations; iteration++) {
		zn = computeNext(zn, c)
		if (modSquared(zn) > 4) {
			return iteration
		}
	}
	return maxIterations
}

/**
 * Compute pixel color
 * @param {Vec} size
 * @param {Vec} constant
 * @param {number} maxIterations
 * @param {number} zoom - Zoom level, smaller is more zoomed in (5 - 10 is a good default)
 * @param {Vec} offset
 * @returns {ImageData}
 */
function computePixel (size, constant, maxIterations, zoom, offset) {
	const image = new ImageData(size[0], size[1])
	const scale = zoom / Math.max(size[0], size[1])
	for (let x = 0; x < size[0]; x++) {
		for (let y = 0; y < size[1]; y++) {
			const px = (x - size[0] / 2 + offset[0]) * scale
			const py = (y - size[1] / 2 + offset[1]) * scale
			const iterations = computeIterations([px, py], constant, maxIterations)
			const color = iterations === maxIterations ? 255 : iterations / maxIterations * 255
			const index = (x + y * size[0]) * 4
			image.data[index + 0] = color
			image.data[index + 1] = color
			image.data[index + 2] = color
			image.data[index + 3] = 255
		}
	}
	return image
}

/**
 * Loop to draw the image with varying constants
 * @param {CanvasRenderingContext2D} ctx
 * @param {State} state
 */
function loop (ctx, state) {
	/** @type {Vec} */
	const constant = [0, 0]
	const maxIterations = 100
	let t = 0
	function frame () {
		requestAnimationFrame((time) => {
			frame()
			if (!t) {
				t = time
				return
			}
			/** @type {Vec} */
			const size = [ctx.canvas.width, ctx.canvas.height]
			// const dt = time - t
			// constant[0] = Math.sin(dt / 5_000)
			// constant[1] = Math.cos(dt / 6_000)
			constant[0] = -0.4
			constant[1] = 0.6
			const image = computePixel(
				size,
				constant,
				maxIterations,
				Math.exp(state.zoom),
				state.focus,
			)
			ctx.putImageData(image, 0, 0)
		})
	}
	frame()
}
