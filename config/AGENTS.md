# config/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

开发与构建配置集中在这里；日常命令仍在项目根通过 npm scripts 执行。

成员清单
vite.config.ts: Web 开发、生产构建、Vitest 与 PWA 清单；root、别名、环境文件和输出均以项目根定位，保留 SHA-256 缓存版本和 archive 测试排除。
pdfjs-assets.ts: 开发和构建提供 PDF.js 同源 CMap、标准字体和图像解码资源。
source-distribution.ts: 构建对应源码归档、版本/内容摘要、运行依赖原始文件与许可收录，并提供公开/source/入口；源码白名单排除凭据、运行数据和历史私密资料，不执行发布。
source-distribution.test.ts: 合成Git/依赖的真实归档、隐私排除、源版本漂移、元信息冲突及无Git源码再构建回归。
eslint.js: ESLint 规则与忽略范围；根 eslint.config.js 转出，保留编辑器和 CLI 自动发现。
capacitor.config.ts: 应用标识、显示名、mobile/ 平台路径和 dist 来源；根 capacitor.config.ts 转出供 CLI 发现。
tsconfig.app.json: 浏览器应用和同目录测试的类型边界，覆盖 ../src。
tsconfig.tooling.json: Vite/Capacitor 等 Node 构建工具配置的类型边界。
tsconfig.cloudflare-functions.json: Cloudflare Pages Functions 的类型边界，覆盖 ../functions。
tsconfig.supabase-functions.json: Supabase Edge Functions 的本地类型检查，覆盖 ../supabase/functions，不改变线上 Deno 配置。

根入口
- tsconfig.json 保留项目引用和 @/ 别名，供编辑器与 shadcn 自动定位。
- npm scripts 显式选择本目录的 Vite/Vitest 配置；不要用没有 --config 的独立 vite/vitest 命令绕过它。
- components.json 和 wrangler.jsonc 保留工具默认发现位置；部署环境值、本机 .env.local/.dev.vars 不迁移到这里。
- 相对 include/baseUrl/缓存路径以各配置文件所在目录解释；迁移时核对有效源码范围，避免空检查假通过。

[PROTOCOL]: 配置职责或入口变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md。
