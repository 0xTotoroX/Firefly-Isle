# src/lib/labs/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

化验字典、复核、趋势计算与批次保存的前端边界。

成员清单
lab-dictionary.ts: 指标别名、稳定 itemCode、单位、参考范围与 OCR 候选归一化。
lab-report-ingestion.ts: OCR 复核行、严格日期/数值校验与确认读数；保留未知项目供人工确认。
lab-report-storage.ts: 单事务 RPC 保存或替换化验批次，复用 records/ 的读数映射。
lab-results.ts: 趋势、异常分类、CBC 派生值与肿瘤标志物连续上涨提示，均为非诊断输出。
*.test.ts: 与上述模块同名的回归测试，覆盖字典、人工复核、重复批次、异常与派生计算。

边界: 展示组件位于 components/analytics/；原始读数独立于治疗线，服务端事务仍在 supabase/。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md。
