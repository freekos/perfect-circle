import { createEvent, createStore } from 'effector'
import { persist } from 'effector-storage/local'

export enum Theme {
	light = 'light',
	dark = 'dark',
	system = 'system',
}

const THEME_KEY = 'theme'

export const themeToggled = createEvent<void>()

export const $theme = createStore<Theme>(Theme.system)

persist({
	store: $theme,
	key: THEME_KEY,
})

$theme.on(themeToggled, (theme) => (theme === Theme.light ? Theme.dark : Theme.light))

export function getTheme(theme: Theme): Theme {
	if (theme !== Theme.system) return theme

	if (!window) return Theme.light
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.dark : Theme.light
}
