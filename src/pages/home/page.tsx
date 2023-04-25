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
	}, [])

	return (
		<main className={cn(styles.page)}>
			<Section />
		</main>
	)
}

function Section() {
	const [onIsDrawingChange] = useUnit([model.$$svgCanvas.isDrawingChanged])
	const [positionsDetailed, onPositionsChange] = useUnit([model.$positionsDetails, model.$$svgCanvas.positionChanged])
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
					{/* <path
						d={positions
							.map((position, index) => {
								if (index === 0) return `M${position.x}, ${position.y}`
								return `L${position.x}, ${position.y}`
							})
							.join(' ')}
						fill='none'
						stroke={getColor(circleAccuracy)}
						strokeWidth='8.005082969716458px'
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeDashoffset='0'
						strokeMiterlimit='4'
					/> */}

					{positionsDetailed.map((positionDetailed, index) => {
						if (!positionDetailed || !positionsDetailed[index - 1] || !positionsDetailed[index + 1]) return null

						return (
							<Fragment key={index}>
								<path
									d={positionsToPathWithCubicCurveControlPoints([
										positionsDetailed[index - 1]!.position,
										positionsDetailed[index]!.position,
										positionsDetailed[index + 1]!.position,
									])}
									fill='none'
									stroke={getLineColor(positionDetailed.accuracy)}
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
