/**
 * [INPUT]: 图表及表格 ref、可见点序列、日期选择回调和拖动阈值。
 * [OUTPUT]: useLabChartNavigation，封装键盘/指针拖动与图表/表格双向定位。
 * [POS]: components/analytics 的图表 DOM 交互层，拖动结束抑制误选点。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md。
 */
import { type KeyboardEvent, type PointerEvent, type RefObject, useRef, useState } from 'react'
import type { LabChartPoint } from '@/lib/labs/lab-results'
import { chartDragThreshold } from './lab-analytics-controls'

type NavigationOptions = {
  chartScrollRef: RefObject<HTMLDivElement>
  visibleSeriesPoints: LabChartPoint[]
  setSelectedPointDate: (date: string) => void
}

export function useLabChartNavigation({ chartScrollRef, visibleSeriesPoints, setSelectedPointDate }: NavigationOptions) {
  const chartTableRef = useRef<HTMLDivElement>(null)
  const chartDragRef = useRef({ hasMoved: false, pointerId: -1, startScroll: 0, startX: 0 })
  const suppressChartPointClickRef = useRef(false)
  const [isChartDragging, setIsChartDragging] = useState(false)

  function scrollChartToPoint(date: string) {
    if (typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      const chartScroller = chartScrollRef.current
      const pointIndex = visibleSeriesPoints.findIndex((point) => point.date === date)

      if (!chartScroller || pointIndex < 0) {
        return
      }

      const maxIndex = Math.max(visibleSeriesPoints.length - 1, 1)
      const maxScroll = Math.max(chartScroller.scrollWidth - chartScroller.clientWidth, 0)
      const targetLeft = (maxScroll * pointIndex) / maxIndex

      chartScroller.scrollTo({ behavior: 'smooth', left: targetLeft })
    })
  }

  function scrollTableToPoint(date: string) {
    if (typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      const tableScroller = chartTableRef.current
      const row = [...(tableScroller?.querySelectorAll<HTMLElement>('[data-chart-row-date]') ?? [])]
        .find((candidate) => candidate.dataset.chartRowDate === date)

      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      row?.focus({ preventScroll: true })
    })
  }

  function selectChartPoint(date: string, options: { scrollChart?: boolean; scrollTable?: boolean } = {}) {
    setSelectedPointDate(date)

    if (options.scrollChart) {
      scrollChartToPoint(date)
    }

    if (options.scrollTable) {
      scrollTableToPoint(date)
    }
  }

  function handleChartPointRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, date: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    selectChartPoint(date, { scrollChart: true })
  }

  function handleChartPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = chartScrollRef.current

    if (!target) {
      return
    }

    chartDragRef.current = {
      hasMoved: false,
      pointerId: event.pointerId,
      startScroll: target.scrollLeft,
      startX: event.clientX,
    }
  }

  function handleChartPointerMove(event: PointerEvent<HTMLDivElement>) {
    const target = chartScrollRef.current

    if (!target || chartDragRef.current.pointerId !== event.pointerId) {
      return
    }

    const dragDelta = event.clientX - chartDragRef.current.startX

    if (!chartDragRef.current.hasMoved && Math.abs(dragDelta) < chartDragThreshold) {
      return
    }

    if (!chartDragRef.current.hasMoved) {
      chartDragRef.current.hasMoved = true
      suppressChartPointClickRef.current = true
      setIsChartDragging(true)

      if (!target.hasPointerCapture(event.pointerId)) {
        target.setPointerCapture(event.pointerId)
      }
    }

    event.preventDefault()
    target.scrollLeft = chartDragRef.current.startScroll - dragDelta
  }

  function stopChartDragging(event: PointerEvent<HTMLDivElement>) {
    const target = chartScrollRef.current

    if (!target || chartDragRef.current.pointerId !== event.pointerId) {
      return
    }

    const hadMoved = chartDragRef.current.hasMoved

    setIsChartDragging(false)

    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }

    chartDragRef.current = { hasMoved: false, pointerId: -1, startScroll: 0, startX: 0 }

    if (hadMoved && typeof window !== 'undefined') {
      window.setTimeout(() => {
        suppressChartPointClickRef.current = false
      }, 0)
    }
  }

  function shouldSuppressChartPointSelect() {
    if (!suppressChartPointClickRef.current) {
      return false
    }

    suppressChartPointClickRef.current = false
    return true
  }

  function handleChartKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = chartScrollRef.current
    const moves: Record<string, number> = {
      ArrowLeft: -220,
      ArrowRight: 220,
      End: target?.scrollWidth ?? 0,
      Home: -(target?.scrollWidth ?? 0),
    }

    if (!target || !(event.key in moves)) {
      return
    }

    event.preventDefault()
    target.scrollBy({ behavior: 'smooth', left: moves[event.key] })
  }

  return {
    chartTableRef, isChartDragging, selectChartPoint, handleChartPointRowKeyDown,
    handleChartPointerDown, handleChartPointerMove, stopChartDragging,
    shouldSuppressChartPointSelect, handleChartKeyDown,
  }
}
