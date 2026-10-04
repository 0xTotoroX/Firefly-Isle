-- [INPUT]: 依赖 public.patients 的 PatientRecord 主记录表与现有 updated_at trigger。
-- [OUTPUT]: 对外提供 public.patients.clinical_notes 字段，用于持久化临床备注/其他信息。
-- [POS]: supabase/migrations 的患者备注扩展迁移，让 /app 与 /record 共用同一个临床备注数据库事实。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-- 将原本悬空的“其他信息”收敛为病历主记录上的临床备注。

alter table public.patients
  add column if not exists clinical_notes text;
