import { useUnit } from 'effector-react'

import { Pages } from '~src/pages'

import { $$theme } from '~src/entities/settings'

import './index.scss'

function App() {
	const theme = useUnit($$theme.$theme)

	return (
		<div className='app' data-theme={$$theme.getTheme(theme)}>
			<Pages />
		</div>
	)
}

export default App
