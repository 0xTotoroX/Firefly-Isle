/**
 * [INPUT]: 依赖 LiquidEffectAnimation、@/lib/theme 的 Theme 类型、父级传入的动效许可、public/login 双主题背景资产与 motion.css 的 .t-login-backdrop 慢呼吸动效合同。
 * [OUTPUT]: 对外提供 LoginTraceMap 组件，渲染登录页双主题海岸背景；允许动效时维持单一液体实例，并由底层可见性观察暂停离屏渲染。
 * [POS]: components/login 的登录页全屏视觉模块，作为 login-entry-view 的明暗主题背景，只承载视觉反馈，不接管前景认证操作。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { LiquidEffectAnimation } from '@/components/ui/liquid-effect-animation'
import type { Theme } from '@/lib/theme'

type Locale = 'zh' | 'en'

type TraceMapSkin = {
  atmosphereTone: string
  backdropOpacity: string
  backgroundTone: string
  displacementScale: number
  liquidOpacity: string
  metalness: number
  roughness: number
  visualFilter: string
}

const traceBackgroundByTheme: Record<Theme, string> = {
  dark: '/login/blue-tears-background-dark.png',
  light: '/login/wind-field-background-light.png',
}

const traceMapSkins: Record<Theme, TraceMapSkin> = {
  dark: {
    atmosphereTone: 'bg-[linear-gradient(180deg,rgba(3,9,11,0)_0%,rgba(3,9,11,0)_62%,rgba(3,9,11,0.12)_100%)]',
    backdropOpacity: 'opacity-5',
    backgroundTone: 'bg-[linear-gradient(90deg,rgba(3,9,11,0.72)_0%,rgba(3,9,11,0.5)_24%,rgba(3,9,11,0.16)_42%,rgba(3,9,11,0)_62%,rgba(3,9,11,0)_100%)]',
    displacementScale: 1.8,
    liquidOpacity: 'opacity-100',
    metalness: 0.06,
    roughness: 0.82,
    visualFilter: 'brightness(0.72) contrast(1.34) saturate(1.14)',
  },
  light: {
    atmosphereTone: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0.12)_48%,rgba(238,247,248,0.46)_100%)]',
    backdropOpacity: 'opacity-100',
    backgroundTone: 'bg-[linear-gradient(90deg,rgba(248,251,250,0.94)_0%,rgba(248,251,250,0.76)_34%,rgba(248,251,250,0.22)_67%,rgba(248,251,250,0.05)_100%)]',
    displacementScale: 2,
    liquidOpacity: 'opacity-95',
    metalness: 0.35,
    roughness: 0.45,
    visualFilter: '',
  },
}

export function LoginTraceMap({ enabled, locale, theme }: { enabled: boolean; locale: Locale; theme: Theme }) {
  const skin = traceMapSkins[theme]
  const backgroundImage = traceBackgroundByTheme[theme]

  return (
    <div
      aria-label={locale === 'zh' ? '登录页主题海岸背景' : 'Themed login coast backdrop'}
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      data-testid="login-trace-map"
    >
      <img
        alt=""
        className={`t-login-backdrop absolute inset-0 h-full w-full object-cover object-center ${skin.backdropOpacity}`}
        draggable={false}
        src={backgroundImage}
      />
      <LiquidEffectAnimation
        backgroundColor="transparent"
        className={`pointer-events-auto ${skin.liquidOpacity}`}
        displacementScale={skin.displacementScale}
        enabled={enabled}
        imageSrc={backgroundImage}
        metalness={skin.metalness}
        refraction
        roughness={skin.roughness}
        visualFilter={skin.visualFilter}
      />
      <div className={`absolute inset-0 ${skin.backgroundTone}`} />
      <div className={`absolute inset-0 ${skin.atmosphereTone}`} />
    </div>
  )
}
