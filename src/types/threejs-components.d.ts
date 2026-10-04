/**
 * [INPUT]: 依赖 threejs-components 的 liquid1.min.js 运行时模块形状。
 * [OUTPUT]: 对外声明 liquid1 WebGL 背景工厂的最小 TypeScript 类型。
 * [POS]: types 的第三方无类型模块契约，供 LiquidEffectAnimation 动态导入消费。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
declare module 'threejs-components/build/backgrounds/liquid1.min.js' {
  export type LiquidBackgroundApp = {
    dispose?: () => void
    liquidPlane: {
      material: {
        metalness: number
        roughness: number
      }
      uniforms: {
        displacementScale: {
          value: number
        }
      }
    }
    loadImage: (imageUrl: string) => Promise<void>
    setRain: (enabled: boolean) => void
  }

  const createLiquidBackground: (canvas: HTMLCanvasElement) => LiquidBackgroundApp

  export default createLiquidBackground
}
