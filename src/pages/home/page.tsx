import cn from 'classnames'
import { useUnit } from 'effector-react'
import { Fragment, useEffect } from 'react'

import * as model from './model'
import styles from './styles.module.scss'

export function HomePage() {
	const [onMount, onUnmount] = useUnit([model.$$pageEvent.mounted, model.$$pageEvent.unMounted])

	useEffect(() => {
		onMount()
		return () => {
			onUnmount()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<>
			<header />
			<main className={cn(styles.page)}>
				<Section />
			</main>
			<footer />
		</>
	)
}

function Section() {
	const [onIsDrawingChange] = useUnit([model.$$svgCanvas.isDrawingChanged])
	const [positionsResults, onPositionsChange] = useUnit([model.$positionsResults, model.$$svgCanvas.positionChanged])
	const [circleAccuracy, circleError] = useUnit([model.$circleAccuracy, model.$circleError])

	return (
		<section className={cn(styles.section)}>
			<div className={cn(styles.section__info)}>
				<p className={cn(styles.section__info__content)} style={{ color: getTextColor(circleAccuracy) }}>
					<span />
					<span className={cn(styles['section__info__content--large'])}>{circleAccuracy.toString()[0] ?? '0'}</span>
					<span className={cn(styles['section__info__content--large'])}>{circleAccuracy.toString()[1] ?? '0'}</span>
					<span />
					<span className={cn(styles['section__info__content--medium'])}>{circleAccuracy.toString()[3] ?? '0'}</span>
					<span className={cn(styles['section__info__content--medium'])}>%</span>
				</p>
				<div>
					{circleError && (
						<p className={cn(styles.section__info__content)} style={{ color: '#FF0000' }}>
							{circleError}
						</p>
					)}
				</div>
			</div>
			<svg
				className={cn(styles.section__canvas)}
				onPointerDown={(event) => onIsDrawingChange({ value: true, position: { x: event.clientX, y: event.clientY } })}
				onPointerMove={(event) => onPositionsChange({ x: event.clientX, y: event.clientY })}
				onPointerUp={(event) => onIsDrawingChange({ value: false, position: { x: event.clientX, y: event.clientY } })}
				onPointerLeave={(event) =>
					onIsDrawingChange({ value: false, position: { x: event.clientX, y: event.clientY } })
				}
			>
				<g>
					<circle className={styles.section__canvas__circle} cx='50%' cy='50%' r={model.CENTER_CIRCLE_RADIUS} />
				</g>
				<g>
					{positionsResults.map((_, index) => {
						const prevPositionResult = positionsResults[index - 1]
						const positionResult = positionsResults[index]
						const nextPositionResult = positionsResults[index + 1]

						if (!prevPositionResult || !positionResult || !nextPositionResult) return null

						return (
							<Fragment key={index}>
								<path
									d={positionsToPathWithCubicCurveControlPoints([
										{ x: prevPositionResult.x, y: prevPositionResult.y },
										{ x: positionResult.x, y: positionResult.y },
										{ x: nextPositionResult.x, y: nextPositionResult.y },
									])}
									fill='none'
									stroke={getLineColor(positionResult.accuracy)}
									strokeWidth='8.005082969716458px'
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeDashoffset='0'
									strokeMiterlimit='4'
								/>
							</Fragment>
						)
					})}
				</g>
			</svg>
		</section>
	)
}

function positionsToPathWithCubicCurveControlPoints(positions: { x: number; y: number }[]) {
	if (positions.length < 3) return positions.map((position) => `${position.x} ${position.y}`).join(' ')

	let d = `M ${positions[0]!.x} ${positions[0]!.y} `

	for (let i = 1; i < positions.length - 2; i++) {
		const xc = positions[i]!.x + positions[i + 1]!.x
		const yc = (positions[i]!.y + positions[i + 1]!.y) / 2
		d += `C ${positions[i]!.x} ${positions[i]!.y} ${xc} ${yc} ${xc} ${yc} `
	}

	// curve through the last two points
	d += `C ${positions[positions.length - 2]!.x} ${positions[positions.length - 2]!.y} ${
		positions[positions.length - 1]!.x
	} ${positions[positions.length - 1]!.y} ${positions[positions.length - 1]!.x} ${positions[positions.length - 1]!.y}`

	return d
}

function getTextColor(accuracy: number) {
	if (accuracy < 75) return '#FF0000'
	if (accuracy < 85) return '#FFA500'
	if (accuracy < 95) return '#FFFF00'
	return '#00FF00'
}

function getLineColor(accuracy: number) {
	if (accuracy < 65) return '#FF0000'
	if (accuracy < 85) return '#FFA500'
	if (accuracy < 90) return '#FFFF00'
	return '#00FF00'
}
