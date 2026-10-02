/**
 * [INPUT]: 统一虚构 Demo fixture。
 * [OUTPUT]: 默认演示病历读取兼容入口。
 * [POS]: 演示禁止通过公开分享码或远程服务读取病历。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { demoLabAnalyticsRecord } from '@/components/analytics/demo-lab-analytics'
export async function loadDemoPatientRecord() {
  return { record: structuredClone(demoLabAnalyticsRecord), source: 'fixture' as const, status: 'active' as const }
}
