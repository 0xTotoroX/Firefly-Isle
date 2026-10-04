/**
 * [INPUT]: 依赖 react 的 effect/id/ref，依赖 threejs-components 的 liquid1 WebGL 背景，消费登录页背景图片 URL、材质参数与画布后处理滤镜。
 * [OUTPUT]: 对外提供 LiquidEffectAnimation 组件，在浏览器端把图片加载进液体扰动与色差折射画布。
 * [POS]: components/ui 的视觉基元，被登录背景层消费；只负责鼠标/触摸水波折射，不承载业务文案或认证交互。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { useEffect, useId, useRef } from 'react'
import type { LiquidBackgroundApp } from 'threejs-components/build/backgrounds/liquid1.min.js'

import { cn } from '@/lib/utils'

type LiquidEffectAnimationProps = {
  backgroundColor?: string
  className?: string
  displacementScale?: number
  enabled?: boolean
  imageSrc: string
  metalness?: number
  refraction?: boolean
  roughness?: number
  visualFilter?: string
}

const REFRACTION_BASE_INTENSITY = 1.5
const REFRACTION_SPEED_GAIN = 0.15
const REFRACTION_MAX_INTENSITY = 8
const REFRACTION_DECAY = 0.92

type LiquidConfig = {
  displacementScale: number
  imageSrc: string
  metalness: number
  roughness: number
}

type LiquidRuntime = {
  app: LiquidBackgroundApp
  configRevision: number
  disposed: boolean
  imageSrc: string | null
  syncQueue: Promise<void>
}

function syncLiquidRuntime(runtime: LiquidRuntime, config: LiquidConfig) {
  runtime.app.liquidPlane.material.metalness = config.metalness
  runtime.app.liquidPlane.material.roughness = config.roughness
  runtime.app.liquidPlane.uniforms.displacementScale.value = config.displacementScale

  const revision = ++runtime.configRevision
  runtime.syncQueue = runtime.syncQueue
    .catch(() => undefined)
    .then(async () => {
      if (runtime.disposed || revision !== runtime.configRevision || runtime.imageSrc === config.imageSrc) {
        return
      }

      await runtime.app.loadImage(config.imageSrc)
      if (!runtime.disposed) {
        runtime.imageSrc = config.imageSrc
      }
    })
    .catch(() => undefined)
}

export function LiquidEffectAnimation({
  backgroundColor = 'transparent',
  className,
  displacementScale = 2,
  enabled = true,
  imageSrc,
  metalness = 0.35,
  refraction = false,
  roughness = 0.45,
  visualFilter,
}: LiquidEffectAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const redOffsetRef = useRef<SVGFEOffsetElement>(null)
  const blueOffsetRef = useRef<SVGFEOffsetElement>(null)
  const liquidRuntimeRef = useRef<LiquidRuntime | null>(null)
  const latestConfigRef = useRef<LiquidConfig>({ displacementScale, imageSrc, metalness, roughness })
  const filterId = `liquid-refraction-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  useEffect(() => {
    const config = { displacementScale, imageSrc, metalness, roughness }
    latestConfigRef.current = config

    const runtime = liquidRuntimeRef.current
    if (enabled && runtime) {
      syncLiquidRuntime(runtime, config)
    }
  }, [displacementScale, enabled, imageSrc, metalness, roughness])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!enabled || !canvas) {
      return
    }
    const targetCanvas = canvas

    let cancelled = false
    let ownedRuntime: LiquidRuntime | null = null

    async function startLiquidBackground() {
      try {
        const { default: createLiquidBackground } = await import('threejs-components/build/backgrounds/liquid1.min.js')
        if (cancelled || canvasRef.current !== targetCanvas) {
          return
        }

        const app = createLiquidBackground(targetCanvas)
        const runtime: LiquidRuntime = {
          app,
          configRevision: 0,
          disposed: false,
          imageSrc: null,
          syncQueue: Promise.resolve(),
        }

        ownedRuntime = runtime
        liquidRuntimeRef.current = runtime
        app.setRain(false)
        syncLiquidRuntime(runtime, latestConfigRef.current)
      } catch {
        if (ownedRuntime) {
          ownedRuntime.disposed = true
          if (liquidRuntimeRef.current === ownedRuntime) {
            liquidRuntimeRef.current = null
          }
          ownedRuntime.app.dispose?.()
        }
      }
    }

    void startLiquidBackground()

    return () => {
      cancelled = true
      if (!ownedRuntime) {
        return
      }

      ownedRuntime.disposed = true
      ownedRuntime.configRevision += 1
      if (liquidRuntimeRef.current === ownedRuntime) {
        liquidRuntimeRef.current = null
      }
      ownedRuntime.app.dispose?.()
    }
  }, [enabled])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!enabled || !refraction || !canvas) {
      return
    }

    let frameId = 0
    let lastX: number | null = null
    let lastY: number | null = null
    let intensity = REFRACTION_BASE_INTENSITY

    function setOffset(nextIntensity: number) {
      redOffsetRef.current?.setAttribute('dx', String(-nextIntensity))
      blueOffsetRef.current?.setAttribute('dx', String(nextIntensity))
    }

    function handlePointerMove(event: PointerEvent) {
      if (lastX === null || lastY === null) {
        lastX = event.clientX
        lastY = event.clientY
        return
      }

      const speed = Math.hypot(event.clientX - lastX, event.clientY - lastY)
      intensity = Math.min(REFRACTION_BASE_INTENSITY + speed * REFRACTION_SPEED_GAIN, REFRACTION_MAX_INTENSITY)
      lastX = event.clientX
      lastY = event.clientY
    }

    function resetPointer() {
      lastX = null
      lastY = null
    }

    function tick() {
      intensity = intensity > REFRACTION_BASE_INTENSITY ? intensity * REFRACTION_DECAY : REFRACTION_BASE_INTENSITY
      setOffset(intensity)
      frameId = window.requestAnimationFrame(tick)
    }

    canvas.addEventListener('pointermove', handlePointerMove, { passive: true })
    canvas.addEventListener('pointerleave', resetPointer)
    canvas.addEventListener('pointercancel', resetPointer)
    tick()

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', resetPointer)
      canvas.removeEventListener('pointercancel', resetPointer)
      window.cancelAnimationFrame(frameId)
      setOffset(REFRACTION_BASE_INTENSITY)
    }
  }, [enabled, refraction])

  const refractionFilter = refraction ? `url(#${filterId})` : undefined
  const composedFilter = [refractionFilter, visualFilter].filter(Boolean).join(' ') || undefined
  const canvasStyle = composedFilter
    ? {
        backgroundColor,
        filter: composedFilter,
        WebkitFilter: composedFilter,
      }
    : { backgroundColor }

  return (
    <>
      {refraction ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 overflow-hidden"
          data-testid="login-liquid-refraction-filter"
          focusable="false"
        >
          <defs>
            <filter colorInterpolationFilters="sRGB" height="110%" id={filterId} width="110%" x="-5%" y="-5%">
              <feColorMatrix
                in="SourceGraphic"
                result="red"
                type="matrix"
                values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              />
              <feOffset dx={-REFRACTION_BASE_INTENSITY} dy="0" in="red" ref={redOffsetRef} result="red-out" />
              <feColorMatrix
                in="SourceGraphic"
                result="green"
                type="matrix"
                values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              />
              <feColorMatrix
                in="SourceGraphic"
                result="blue"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              />
              <feOffset dx={REFRACTION_BASE_INTENSITY} dy="0" in="blue" ref={blueOffsetRef} result="blue-out" />
              <feBlend in="red-out" in2="green" mode="screen" result="rg" />
              <feBlend in="rg" in2="blue-out" mode="screen" />
            </filter>
          </defs>
        </svg>
      ) : null}
      <canvas
        aria-hidden="true"
        className={cn('absolute inset-0 h-full w-full touch-none', className)}
        data-testid="login-liquid-ripple"
        ref={canvasRef}
        style={canvasStyle}
      />
    </>
  )
}
