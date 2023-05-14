import { createEvent, createStore, sample } from 'effector'

export interface Position {
	x: number
	y: number
}

// export function () {
// 	const isDrawingChanged = createEvent<{ value: boolean; position: Position }>()
// 	const positionChanged = createEvent<Position>()

// 	const $isDrawing = createStore<boolean>(false)

// 	const $positions = createStore<Array<Position>>([])

// 	$isDrawing.on(isDrawingChanged, (_, { value }) => value)

// 	sample({
// 		clock: isDrawingChanged,
// 		filter: $isDrawing,
// 		target: $positions.reinit!,
// 	})

// 	sample({
// 		clock: positionChanged,
// 		source: $positions,
// 		filter: $isDrawing,
// 		fn: (positions, newPosition) => [...positions, newPosition],
// 		target: $positions,
// 	})

// 	return {
// 		isDrawingChanged,
// 		positionChanged,
// 		$isDrawing,
// 		$positions,
// 	}
// }
