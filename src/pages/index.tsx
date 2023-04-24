import { Route, Switch } from 'wouter'

import { HomePage } from './home'

export function Pages() {
	return (
		<Switch>
			<Route path={mapRoutes.home} component={HomePage} />
		</Switch>
	)
}

const mapRoutes = {
	home: '/',
}
