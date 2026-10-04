/**
 * [INPUT]: 统一虚构 Demo fixture 和临床分析类型。
 * [OUTPUT]: 兼容的默认化验、病历和固定 AI 预览。
 * [POS]: 演示展示数据；全部为编写的示例，不来自真实报告。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { demoPatientRecord } from '@/components/record/demo-record'
import type { ClinicalAnalysisResult } from '@/lib/clinical-analysis'
export const demoLabAnalyticsRecord = demoPatientRecord
export const demoLabResults = demoPatientRecord.labResults ?? []
export const demoClinicalAnalysisResult: ClinicalAnalysisResult = {
  attentionPoints: ['固定演示：核对每次治疗的日期与资料来源。'],
  disclaimer: '固定 AI 示例，未调用模型，也未分析当前病历。所有资料完全虚构，不构成诊断或治疗建议。',
  followUpQuestions: ['固定演示：下次复诊需要补充哪些资料？'],
  labTrendSummary: ['固定演示：指标趋势请结合原始报告核对；此处不作疾病判断。'],
  treatmentSummary: ['固定演示：按日期整理初始治疗与后续治疗记录。'],
}
