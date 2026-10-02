/**
 * [INPUT]: 完全虚构的统一 Demo fixtures。
 * [OUTPUT]: 默认虚构演示病历。
 * [POS]: 保留展示组件的 fixture 导入接口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createDemoRecords, DEMO_DEFAULT_PATIENT_ID } from '@/lib/demo-fixtures'
export const demoPatientRecord = createDemoRecords().find((record) => record.id === DEMO_DEFAULT_PATIENT_ID)!
