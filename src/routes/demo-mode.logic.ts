/**
 * [INPUT]: 统一虚构 Demo fixture。
 * [OUTPUT]: 默认演示病历读取兼容入口。
 * [POS]: 演示禁止通过公开分享码或远程服务读取病历。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { demoLabAnalyticsRecord } from '@/components/analytics/demo-lab-analytics'
export async function loadDemoPatientRecord() {
  return { record: structuredClone(demoLabAnalyticsRecord), source: 'fixture' as const, status: 'active' as const }
}
