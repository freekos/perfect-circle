import { createStore, sample } from 'effector'
import { interval } from 'patronum'

import { createPageEvent } from '~src/entities/page_event'
import { createSvgCanvas, type Position } from '~src/entities/svg_canvas'

interface PositionDetail {
	position: Position
	accuracy: number
	createAt: number
	quarter: number
}
// Consts
export const POSITION_TIMER_TIMEOUT = 1
export const POSITION_CHANGE_DELAY = 30

export const CIRCLE_MIN_RADIUS = 25

export const CENTER_CIRCLE_RADIUS = 8.5

// Events

// Factories
export const $$pageEvent = createPageEvent<void, void>()

export const $$svgCanvas = createSvgCanvas()

// Stores
export const $circleRadius = createStore<number>(0)
export const $circleError = createStore<string>('')

export const $positionsDetails = createStore<Array<PositionDetail>>([])
export const $positionTimer = createStore<number>(0)

export const $circleAccuracy = $positionsDetails.map((positionsDetails) => {
	if (positionsDetails.length === 0) return 0
	const positions = positionsDetails.map((detail) => detail.position)
	const center = getCenter()
	return calculateCirclePerfect({ positions, center })
})

// Logics

sample({
	clock: $$svgCanvas.isDrawingChanged,
	filter: ({ value }) => value,
	fn: ({ position }) => {
		const center = getCenter()
		const circleRadius = calculateDistance({ position, center })
		return circleRadius
	},
	target: [$circleRadius, $circleError.reinit!, $positionsDetails.reinit!, $positionTimer.reinit!],
})

const circleWillEnd = sample({
	clock: $$svgCanvas.positionChanged,
	source: { isDrawing: $$svgCanvas.$isDrawing, positions: $$svgCanvas.$positions },
	filter: ({ isDrawing, positions }, newPosition) => {
		if (!isDrawing) return false
		if (positions.length < 3) return false
		const center = getCenter()
		const isCircle = checkIsCircleEnd({ positions: [...positions, newPosition], center })
		return isCircle
	},
})

sample({
	clock: circleWillEnd,
	target: [$$svgCanvas.$isDrawing.reinit!],
})

const { tick: positionTimerTick } = interval({
	timeout: POSITION_TIMER_TIMEOUT,
	start: $$svgCanvas.positionChanged,
	stop: circleWillEnd,
})

$positionTimer.on(positionTimerTick, (timer) => timer + 1)

const positionsDetailsWillChange = sample({
	clock: $$svgCanvas.positionChanged,
	source: {
		isDrawing: $$svgCanvas.$isDrawing,
		positionsDetails: $positionsDetails,
		circleRadius: $circleRadius,
	},
	filter: ({ isDrawing }) => isDrawing,
	fn: ({ positionsDetails, circleRadius }, newPosition) => {
		const center = getCenter()
		const newPositionDetail = getPositionDetail({
			position: newPosition,
			center,
			radius: circleRadius,
		})

		const positions = positionsDetails.map((detail) => detail.position)
		const isCircle = checkIsCircle({ positions: [...positions, newPosition], center })
		if (!isCircle) return { error: 'Not a circle', newPositionDetail }

		const lastPositionDetail = positionsDetails[positionsDetails.length - 1]

		if (lastPositionDetail) {
			console.log(newPositionDetail.createAt - lastPositionDetail.createAt)
			if (newPositionDetail.createAt - lastPositionDetail.createAt > POSITION_CHANGE_DELAY)
				return { error: 'Too slow', newPositionDetail }
		}

		const newPositionRadius = calculateDistance({ position: newPosition, center })
		if (newPositionRadius < CIRCLE_MIN_RADIUS) return { error: 'Too small', newPositionDetail }

		return { error: '', newPositionDetail }
	},
})

$circleError.on(positionsDetailsWillChange, (_, { error }) => error)

sample({
	clock: positionsDetailsWillChange,
	filter: ({ error }) => error !== '',
	target: [$$svgCanvas.$isDrawing.reinit!],
})
$positionsDetails.on(positionsDetailsWillChange, (positionsDetails, { error, newPositionDetail }) => {
	if (error !== '') return positionsDetails
	return [...positionsDetails, newPositionDetail]
})

/////////////////////////////////////////////////////////////////////////////////////////////

function calculateCirclePerfect(args: { positions: Position[]; center: Position }): number {
	const { positions, center } = args

	const distances = positions.map((position) => calculateDistance({ position, center }))

	const avgDistance = distances.reduce((sum, distance) => sum + distance, 0) / distances.length
	const maxDeviation = Math.max(...distances) - avgDistance
	const deviationPercent = (maxDeviation / avgDistance) * 100

	return Math.max(0, 100 - deviationPercent)
}

function getPositionDetail(args: { position: Position; center: Position; radius: number }) {
	const { position, center, radius } = args

	const createAt = Date.now()
	const accuracy = calculatePositionAccuracy({ position, center, radius })
	const quarter = calculateQuarter({ position, center })

	return { position, accuracy, createAt, quarter } as PositionDetail
}

function checkIsCircle(args: { positions: Position[]; center: Position }): boolean {
	const { positions, center } = args

	const MIN_ANGLE_DIFF = Math.PI * 0.95
	const MAX_ANGLE_DIFF = Math.PI * 1.05

	if (positions.length < 3) {
		return true
	}

	const [pointA, pointB, pointC] = positions.slice(-3)
	const angle1 = Math.atan2(pointA!.y - pointB!.y, pointA!.x - pointB!.x)
	const angle2 = Math.atan2(pointB!.y - pointC!.y, pointB!.x - pointC!.x)

	function calculateAngleDiff() {
		return Math.abs(angle1 - angle2)
	}

	const angleDiff = calculateAngleDiff()
	const isCircle = angleDiff > MIN_ANGLE_DIFF && angleDiff < MAX_ANGLE_DIFF

	return !isCircle
}

function calculatePositionAccuracy(args: { position: Position; center: Position; radius: number }): number {
	const { position, center, radius } = args

	const distance = calculateDistance({ position, center })
	const errorDistance = Math.abs(distance - radius)
	const accuracy = Math.max(0, (1 - errorDistance / radius) * 100)

	return accuracy
}

function calculateDistance(args: { position: Position; center: Position }): number {
	const { position, center } = args

	const dx = position.x - center.x
	const dy = position.y - center.y

	return Math.sqrt(dx * dx + dy * dy)
}

function checkIsCircleEnd(args: { positions: Position[]; center: Position }): boolean {
	const { positions, center } = args

	if (positions.length < 3) return false

	const firstPosition = positions[0]
	const lastPosition = positions[positions.length - 1]

	const firstQuarter = calculateQuarter({ position: firstPosition!, center })
	const lastQuarter = calculateQuarter({ position: lastPosition!, center })

	const hasFirstQuarter = positions.some((position) => {
		const quarter = calculateQuarter({ position, center })
		return quarter === 1
	})
	const hasSecondQuarter = positions.some((position) => {
		const quarter = calculateQuarter({ position, center })
		return quarter === 2
	})
	const hasThirdQuarter = positions.some((position) => {
		const quarter = calculateQuarter({ position, center })
		return quarter === 3
	})
	const hasFourthQuarter = positions.some((position) => {
		const quarter = calculateQuarter({ position, center })
		return quarter === 4
	})

	return (
		hasFirstQuarter &&
		hasSecondQuarter &&
		hasThirdQuarter &&
		hasFourthQuarter &&
		firstQuarter === lastQuarter &&
		firstPosition!.x <= lastPosition!.x &&
		firstPosition!.y <= lastPosition!.y
	)
}

function calculateQuarter(args: { position: Position; center: Position }): number {
	const { position, center } = args

	const angle = calculateAngle({ position, center })
	// console.log(angle)
	if (angle > 0 && angle < 90) return 1
	if (angle > 90 && angle < 180) return 2
	if (angle > 180 || angle < 270) return 3
	if (angle > 270 && angle < 360) return 4

	return 0
}

function calculateAngle(args: { position: Position; center: Position }): number {
	const { position, center } = args

	const deltaX = position.x - center.x
	const deltaY = position.y - center.y
	const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI

	return angle
}

function getCenter(): Position {
	return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}
