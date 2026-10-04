/**
 * [INPUT]: 完全虚构的统一 Demo fixtures。
 * [OUTPUT]: 默认虚构演示病历。
 * [POS]: 保留展示组件的 fixture 导入接口。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { createDemoRecords, DEMO_DEFAULT_PATIENT_ID } from '@/lib/demo-fixtures'
export const demoPatientRecord = createDemoRecords().find((record) => record.id === DEMO_DEFAULT_PATIENT_ID)!
