import { combine, createEffect, createEvent, createStore, sample } from 'effector'
import { interval, not } from 'patronum'

import { createElementEvent } from '~src/entities/element_event'

interface Position {
	x: number
	y: number
}

interface PositionAnalyze {
	createAt: number
	accuracy: number
	quarter: number
	radius: number
}

type PositionResult = Position & PositionAnalyze

export enum GameStatus {
	Idle,
	Started,
	Finished,
}

class CircleError extends Error {}

// Consts
export const POSITION_TIMER_TIMEOUT = 5
export const POSITION_CHANGE_DELAY = 40

export const CIRCLE_MIN_RADIUS = 25

export const CENTER_CIRCLE_RADIUS = 8.5

// Events
export const gameStarted = createEvent<void>()

export const drawingStarted = createEvent<{ position: Position }>()
export const drawingEnded = createEvent<{ position: Position }>()

export const positionChanged = createEvent<Position>()

// Effects
const circlePositionsAnalyzeFx = createEffect<
	{
		positionsResults: Array<PositionResult>
		newPositionResult: PositionResult
		circleRadius: number
		center: Position
	},
	PositionResult
>()

// Factories
export const $$pageEvent = createElementEvent<void, void>()
export const $$svgEvent = createElementEvent<SVGSVGElement, void>()

// Stores
export const $gameStatus = createStore<GameStatus>(GameStatus.Idle)
export const $svgCenter = createStore<Position | null>(null)

export const $isDrawing = createStore<boolean>(false)
export const $positions = createStore<Array<Position>>([])

export const $circleRadius = createStore<number>(0)
export const $circleError = createStore<string>('')

export const $positionsResults = createStore<Array<PositionResult>>([])
export const $positionChangeTimer = createStore<number>(0)

export const $circleAccuracy = combine($positionsResults, $svgCenter, (positionsResults, center) => {
	if (positionsResults.length === 0 || !center) return 0
	return calculateCirclePerfect({ positions: positionsResults, center })
})

// Logics
$svgCenter.on($$svgEvent.mounted, (_, svg) => {
	return getSvgCenter(svg)
})

$gameStatus.on(gameStarted, () => GameStatus.Started)
$isDrawing.on(drawingStarted, () => true)

sample({
	clock: drawingStarted,
	target: [
		$circleError.reinit!,
		$positions.reinit!,
		$positionsResults.reinit!,
		$positionChangeTimer.reinit!,
		$circleRadius.reinit!,
	],
})

sample({
	clock: drawingStarted,
	source: $svgCenter,
	filter: (center: Position | null): center is Position => center !== null,
	fn: (center, { position }) => {
		const circleRadius = calculateDistance({ position, center })

		return circleRadius
	},
	target: $circleRadius,
})

sample({
	clock: positionChanged,
	filter: $isDrawing,
	source: $positions,
	fn: (positions, newPosition) => [...positions, newPosition],
	target: $positions,
})

sample({
	clock: positionChanged,
	source: {
		positionsResults: $positionsResults,
		circleRadius: $circleRadius,
		isDrawing: $isDrawing,
		center: $svgCenter,
	},
	filter: (source: {
		positionsResults: Array<PositionResult>
		circleRadius: number
		isDrawing: boolean
		center: Position | null
	}): source is {
		positionsResults: Array<PositionResult>
		circleRadius: number
		isDrawing: boolean
		center: Position
	} => source.isDrawing && source.center !== null,
	fn: ({ positionsResults, circleRadius, center }, newPosition) => {
		const newPositionResult = getPositionResult({ position: newPosition, center, circleRadius })
		return { positionsResults, newPositionResult, circleRadius, center }
	},
	target: circlePositionsAnalyzeFx,
})

circlePositionsAnalyzeFx.use(({ positionsResults, newPositionResult, center }) => {
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
	if (error instanceof Error) return error.message
	return undefined
})

sample({
	clock: circlePositionsAnalyzeFx.fail,
	target: $isDrawing.reinit!,
})

$positionsResults.on(circlePositionsAnalyzeFx.doneData, (positionsResults, newPositionResult) => {
	return [...positionsResults, newPositionResult]
})

const circleWillComplete = sample({
	clock: positionChanged,
	source: { isDrawing: $isDrawing, positions: $positions, center: $svgCenter },
	filter: ({ isDrawing, positions, center }, newPosition) => {
		if (!isDrawing) return false
		if (!center) return false
		if (positions.length < 3) return false
		const isCircleComplete = checkIsCircleComplete({ positions: [...positions, newPosition], center })

		return isCircleComplete
	},
})

sample({
	clock: circleWillComplete,
	target: $isDrawing.reinit!,
})

const { tick: positionChangeTimerTick } = interval({
	timeout: POSITION_TIMER_TIMEOUT,
	start: positionChanged,
	stop: circleWillComplete,
})

$positionChangeTimer.on(positionChangeTimerTick, (timer) => timer + 1)

sample({
	clock: drawingEnded,
	source: { positionsResults: $positionsResults, center: $svgCenter },
	filter: ({ positionsResults, center }) => {
		if (!center) return false
		const isCircleComplete = checkIsCircleComplete({ positions: positionsResults, center })

		return !isCircleComplete
	},
	fn: () => 'Circle is not completed',
	target: $circleError,
})

$isDrawing.on(drawingEnded, () => false)
sample({
	clock: $isDrawing,
	filter: not($isDrawing),
	fn: () => GameStatus.Finished,
	target: $gameStatus,
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

function getPositionResult<T extends Position>(args: { position: T; center: T; circleRadius: number }): PositionResult {
	const { position, center, circleRadius } = args

	const createAt = Date.now()
	const accuracy = calculatePositionAccuracy({ position, center, circleRadius })
	const quarter = calculateQuarter({ position, center })
	const radius = calculateDistance({ position, center })

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

function calculatePositionAccuracy<T extends Position>(args: { position: T; center: T; circleRadius: number }): number {
	const { position, center, circleRadius } = args

	const distance = calculateDistance({ position, center })
	const errorDistance = Math.abs(distance - circleRadius)
	const accuracy = Math.max(0, (1 - errorDistance / circleRadius) * 100)

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
	// console.log(positions)

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

function getSvgCenter(svg: SVGSVGElement): Position {
	const point = svg.createSVGPoint()
	point.x = window.innerWidth / 2
	point.y = window.innerHeight / 2
	const { x, y } = point.matrixTransform(svg.getScreenCTM()?.inverse())
	return { x, y }
}
