import { createEffect, createStore, sample } from 'effector'
import { interval } from 'patronum'

import { createPageEvent } from '~src/entities/page_event'
import { createSvgCanvas, type Position } from '~src/entities/svg_canvas'

class CircleError extends Error {}

interface PositionAnalyze {
	createAt: number
	accuracy: number
	quarter: number
	radius: number
}

type PositionResult = Position & PositionAnalyze
// Consts
export const POSITION_TIMER_TIMEOUT = 1
export const POSITION_CHANGE_DELAY = 30

export const CIRCLE_MIN_RADIUS = 25

export const CENTER_CIRCLE_RADIUS = 8.5

// Events

// Effects
const circlePositionsAnalyzeFx = createEffect<
	{ positionsResults: Array<PositionResult>; newPositionResult: PositionResult; idealRadius: number },
	PositionResult
>()

// Factories
export const $$pageEvent = createPageEvent<void, void>()

export const $$svgCanvas = createSvgCanvas()

// Stores
export const $idealRadius = createStore<number>(0)
export const $circleError = createStore<string>('')

export const $positionsResults = createStore<Array<PositionResult>>([])
export const $positionTimer = createStore<number>(0)

export const $circleAccuracy = $positionsResults.map((positionsResults) => {
	if (positionsResults.length === 0) return 0
	const center = getCenter()
	return calculateCirclePerfect({ positions: positionsResults, center })
})

// Logics
sample({
	clock: $$svgCanvas.isDrawingChanged,
	filter: ({ value }) => value,
	fn: ({ position }) => {
		const center = getCenter()
		const idealRadius = calculateDistance({ position, center })
		return idealRadius
	},
	target: [$idealRadius, $circleError.reinit!, $positionsResults.reinit!, $positionTimer.reinit!],
})

const circleWillComplete = sample({
	clock: $$svgCanvas.positionChanged,
	source: { isDrawing: $$svgCanvas.$isDrawing, positions: $$svgCanvas.$positions },
	filter: ({ isDrawing, positions }, newPosition) => {
		if (!isDrawing) return false
		if (positions.length < 3) return false
		const center = getCenter()
		const isCircleComplete = checkIsCircleComplete({ positions: [...positions, newPosition], center })
		return isCircleComplete
	},
})

sample({
	clock: circleWillComplete,
	target: [$$svgCanvas.$isDrawing.reinit!],
})

const { tick: positionTimerTick } = interval({
	timeout: POSITION_TIMER_TIMEOUT,
	start: $$svgCanvas.positionChanged,
	stop: circleWillComplete,
})

$positionTimer.on(positionTimerTick, (timer) => timer + 1)

sample({
	clock: $$svgCanvas.positionChanged,
	source: { positionsResults: $positionsResults, idealRadius: $idealRadius },
	filter: $$svgCanvas.$isDrawing,
	fn: ({ positionsResults, idealRadius }, newPosition) => {
		const center = getCenter()
		const newPositionResult = getPositionResult({ position: newPosition, center, idealRadius })
		return { positionsResults, idealRadius, newPositionResult }
	},
	target: circlePositionsAnalyzeFx,
})

circlePositionsAnalyzeFx.use(({ positionsResults, idealRadius, newPositionResult }) => {
	const center = getCenter()

	if (newPositionResult.radius < CIRCLE_MIN_RADIUS) {
		throw new CircleError('Too small')
	}

	const isCircle = checkIsCircle({ positions: [...positionsResults, newPositionResult], center })
	if (!isCircle) {
		throw new CircleError('Not circle')
	}

	const lastPositionResult = positionsResults[positionsResults.length - 1]
	if (lastPositionResult && newPositionResult.createAt - lastPositionResult.createAt > POSITION_CHANGE_DELAY) {
		throw new CircleError('Too slow')
	}

	return newPositionResult
})

$circleError.on(circlePositionsAnalyzeFx.fail, (_, { error }) => {
	if (error instanceof CircleError) return error.message
	return undefined
})

sample({
	clock: circlePositionsAnalyzeFx.fail,
	target: [$$svgCanvas.$isDrawing.reinit!],
})
$positionsResults.on(circlePositionsAnalyzeFx.doneData, (positionsResults, newPositionResult) => {
	return [...positionsResults, newPositionResult]
})

/////////////////////////////////////////////////////////////////////////////////////////////

function calculateCirclePerfect<T extends Position>(args: { positions: T[]; center: T }): number {
	const { positions, center } = args

	const distances = positions.map((position) => calculateDistance({ position, center }))

	const avgDistance = distances.reduce((sum, distance) => sum + distance, 0) / distances.length
	const maxDeviation = Math.max(...distances) - avgDistance
	const deviationPercent = (maxDeviation / avgDistance) * 100

	return Math.max(0, 100 - deviationPercent)
}

function getPositionResult<T extends Position>(args: { position: T; center: T; idealRadius: number }): PositionResult {
	const { position, center, idealRadius } = args

	const createAt = Date.now()
	const accuracy = calculatePositionAccuracy({ position, center, idealRadius })
	const quarter = calculateQuarter({ position, center })
	const radius = calculateDistance({ position, center })
	console.log(quarter)

	return { ...position, accuracy, createAt, quarter, radius }
}

function checkIsCircle<T extends Position>(args: { positions: T[]; center: T }): boolean {
	const { positions } = args

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

function calculatePositionAccuracy<T extends Position>(args: { position: T; center: T; idealRadius: number }): number {
	const { position, center, idealRadius } = args

	const distance = calculateDistance({ position, center })
	const errorDistance = Math.abs(distance - idealRadius)
	const accuracy = Math.max(0, (1 - errorDistance / idealRadius) * 100)

	return accuracy
}

function calculateDistance<T extends Position>(args: { position: T; center: T }): number {
	const { position, center } = args

	const dx = position.x - center.x
	const dy = position.y - center.y

	return Math.sqrt(dx * dx + dy * dy)
}

function checkIsCircleComplete<T extends Position>(args: { positions: T[]; center: T }): boolean {
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

	return hasFirstQuarter && hasSecondQuarter && hasThirdQuarter && hasFourthQuarter && firstQuarter === lastQuarter
}

function calculateQuarter<T extends Position>(args: { position: T; center: T }): number {
	const { position, center } = args

	const angle = calculateAngle({ position, center })
	if (angle < 0 && angle > -90) return 1
	if (angle < -90 && angle > -180) return 2
	if (angle < 180 && angle > 90) return 3
	if (angle < 90 && angle > 0) return 4

	return 0
}

function calculateAngle<T extends Position>(args: { position: T; center: T }): number {
	const { position, center } = args

	const dx = position.x - center.x
	const dy = position.y - center.y

	const angle = Math.atan2(dy, dx) * (180 / Math.PI)
	return angle
}

function getCenter(): Position {
	return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}
