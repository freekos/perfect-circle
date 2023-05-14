import { createEvent } from 'effector'

export function createElementEvent<T = void, K = void>() {
	const mounted = createEvent<T>()
	const unMounted = createEvent<K>()

	return { mounted, unMounted }
}
