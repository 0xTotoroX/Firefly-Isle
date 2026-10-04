/**
 * [INPUT]: 依赖 components/login 的 V3LoginView 与登录展示层类型定义。
 * [OUTPUT]: 对外提供 LoginPageView 组件，并稳定转出 AuthMode、AuthMethod、AuthFeedback、LoginPageViewProps 类型。
 * [POS]: components 的登录页 facade，保持 @/components/login-page-view 公共入口不变，内部实现下沉到 components/login。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { V3LoginView } from './login/login-entry-view'
import type { LoginPageViewProps } from './login/types'

export type { AuthFeedback, AuthMethod, AuthMode, FeedbackTone, LoginPageViewProps } from './login/types'

export function LoginPageView(props: LoginPageViewProps) {
  return <V3LoginView {...props} />
}
