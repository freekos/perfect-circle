import cn from 'classnames'
import { useUnit } from 'effector-react'
import { Fragment, useEffect, useRef } from 'react'

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
	const gameStatus = useUnit(model.$gameStatus)
	const onGameStart = useUnit(model.gameStarted)

	return (
		<section className={cn(styles.section)}>
			{gameStatus !== model.GameStatus.Idle && (
				<div className={cn(styles.section__info)}>
					<CircleDrawText />
				</div>
			)}
			<CircleDrawSvg />
			{gameStatus === model.GameStatus.Idle && <WelcomeScreen />}
			<div
				className={cn(
					styles.section__center,
					gameStatus !== model.GameStatus.Idle && styles['section__center--started'],
				)}
			>
				{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
				<div
					className={cn(
						styles.section__center__circle,
						gameStatus !== model.GameStatus.Idle && styles['section__center__circle--started'],
					)}
					onClick={onGameStart}
				/>
			</div>
		</section>
	)
}

function WelcomeScreen() {
	return (
		<div className={cn(styles.section__welcome)}>
			<h1 className={cn(styles.section__welcome__title)}>Welcome to Perfect Circle Game</h1>
		</div>
	)
}

function CircleDrawText() {
	const circleAccuracy = useUnit(model.$circleAccuracy)
	const circleError = useUnit(model.$circleError)

	return (
		<>
			<div className={cn(styles.section__info__title)} style={{ color: getTextColor(circleAccuracy) }}>
				<span className={cn(styles['section__info__title--large'])}>
					{circleError !== '' ? 'x' : circleAccuracy !== 0 ? circleAccuracy.toString()[0] : ''}
				</span>
				<span className={cn(styles['section__info__title--large'])}>
					{circleError !== '' ? 'x' : circleAccuracy !== 0 ? circleAccuracy.toString()[1] : ''}
				</span>

				<span className={cn(styles['section__info__title--medium'])}>
					{circleError !== '' ? 'x' : circleAccuracy !== 0 ? circleAccuracy.toString()[3] : ''}
				</span>

				<span className={cn(styles['section__info__title--medium'])}>
					{circleError !== '' || circleAccuracy !== 0 ? '%' : ''}
				</span>
			</div>
			<div className={cn(styles.section__info__subtitle)}>{circleError && <p>{circleError}</p>}</div>
		</>
	)
}

function CircleDrawSvg() {
	const [onDrawingStart, onDrawingEnd] = useUnit([model.drawingStarted, model.drawingEnded])
	const [positionsResults, onPositionsChange] = useUnit([model.$positionsResults, model.positionChanged])
	const [onSvgMount, onSvgUnMount] = useUnit([model.$$svgEvent.mounted, model.$$svgEvent.unMounted])
	const svgRef = useRef<SVGSVGElement | null>(null)

	useEffect(() => {
		if (svgRef.current) onSvgMount(svgRef.current)
		return () => {
			onSvgUnMount()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [svgRef.current])

	function handleDrawingStart({ event, isTouch = false }: { event: any; isTouch?: boolean }) {
		const svg = svgRef.current
		if (!svg) return

		const point = svg.createSVGPoint()
		if (isTouch) {
			const touch = event.touches[0]!
			point.x = touch.clientX
			point.y = touch.clientY
		} else {
			point.x = event.clientX
			point.y = event.clientY
		}

		const { x, y } = point.matrixTransform(svg.getScreenCTM()!.inverse())

		onDrawingStart({ position: { x, y } })

		// if (isTouch) {
		// 	const touch = event.touches[0]!
		// 	onDrawingStart({ position: { x: touch.clientX, y: touch.clientY } })
		// 	return
		// }
		// onDrawingStart({ position: { x: event.clientX, y: event.clientY } })
	}

	function handleDrawingEnd({ event, isTouch = false }: { event: any; isTouch?: boolean }) {
		try {
			const svg = svgRef.current
			if (!svg) return

			const point = svg.createSVGPoint()
			if (isTouch) {
				const touch = event.touches[0] ?? { x: 0, y: 0 }
				point.x = touch.clientX
				point.y = touch.clientY
			} else {
				point.x = event.clientX
				point.y = event.clientY
			}

			const { x, y } = point.matrixTransform(svg.getScreenCTM()!.inverse())

			onDrawingEnd({
				position: {
					x,
					y,
				},
			})
		} catch (err) {}

		// if (isTouch) {
		// 	const touch = event.changedTouches[0]!
		// 	onDrawingEnd({ position: { x: touch.clientX, y: touch.clientY } })
		// 	return
		// }
		// onDrawingEnd({ position: { x: event.clientX, y: event.clientY } })
	}

	function handlePositionChange({ event, isTouch = false }: { event: any; isTouch?: boolean }) {
		const svg = svgRef.current
		if (!svg) return

		const point = svg.createSVGPoint()
		const rect = svg.getBoundingClientRect()

		if (isTouch) {
			const touch = event.touches[0]!
			point.x = touch.clientX
			point.y = touch.clientY
		} else {
			point.x = event.clientX
			point.y = event.clientY
		}

		const { x, y } = point.matrixTransform(svg.getScreenCTM()!.inverse())
		// console.log(point.w)

		onPositionsChange({ x, y })

		// if (isTouch) {
		// 	const touch = event.touches[0]!
		// 	onPositionsChange({ x: touch.clientX, y: touch.clientY })
		// 	return
		// }
		// onPositionsChange({ x: event.clientX, y: event.clientY })
	}

	return (
		<svg
			ref={svgRef}
			viewBox='0 0 1000 1000'
			className={cn(styles.section__canvas)}
			onTouchStart={(event) => handleDrawingStart({ event, isTouch: true })}
			onTouchMove={(event) => handlePositionChange({ event, isTouch: true })}
			onTouchEnd={(event) => handleDrawingEnd({ event, isTouch: true })}
			onTouchCancel={(event) => handleDrawingEnd({ event, isTouch: true })}
			onMouseDown={(event) => handleDrawingStart({ event })}
			onMouseMove={(event) => handlePositionChange({ event })}
			onMouseUp={(event) => handleDrawingEnd({ event })}
			onMouseLeave={(event) => handleDrawingEnd({ event })}
		>
			<g>
				{positionsResults.map((_, index) => {
					const prevPositionResult = positionsResults[index - 1]
					const positionResult = positionsResults[index]
					const nextPositionResult = positionsResults[index + 1]

					if (!prevPositionResult || !positionResult || !nextPositionResult) return null

					return (
						<Fragment key={index}>
							<path
								style={{
									transition: 'stroke-dashoffset 0.5s ease-in-out',
								}}
								d={positionsToPathWithCubicCurveControlPoints([
									{ x: prevPositionResult.x, y: prevPositionResult.y },
									{ x: positionResult.x, y: positionResult.y },
									{ x: nextPositionResult.x, y: nextPositionResult.y },
								])}
								fill='none'
								stroke={getLineColor(positionResult.accuracy)}
								strokeWidth='7px'
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
	)
}

function positionsToPathWithCubicCurveControlPoints(positions: { x: number; y: number }[]) {
	if (positions.length < 3) return ''
	let d = `M${positions[0]!.x} ${positions[0]!.y}`

	for (let i = 1; i < positions.length; i++) {
		const p = positions[i]!
		const p0 = positions[i - 1]!
		const midPoint = midPointBtw(p0, p)

		d += ` Q ${p0.x} ${p0.y} ${midPoint.x} ${midPoint.y}`
	}

	return d
}

function midPointBtw(p1: { x: number; y: number }, p2: { x: number; y: number }) {
	return {
		x: p1.x + (p2.x - p1.x) / 2,
		y: p1.y + (p2.y - p1.y) / 2,
	}
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
