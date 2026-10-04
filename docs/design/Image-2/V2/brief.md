# Firefly-Isle Image2 Redesign v2 Brief

## Goal

重做 Firefly-Isle 七张设计参考图，使 dark/light 成对页面共享同一骨架、页面职责、组件位置与信息层级。

- Dark: 黑色临床控制室，橙色萤火强调，协议控制台节奏。
- Light: 白色法证医学档案，黑色油墨规则，纸面报告结构。

本目录只存设计参考 PNG，不替代 `src/`、设计 token 或产品规格。

## Inputs

Runtime screenshots:

`/Users/Totoro/Desktop/Firefly-Isle/docs/design/runtime-screenshots/2026-04-25/`

v1 style references:

`/Users/Totoro/Desktop/Firefly-Isle/docs/design/Image-2/V1/`

## Outputs

1. `01-login-dark.png`
2. `02-login-light.png`
3. `03-app-dark.png`
4. `04-app-light.png`
5. `05-record-dark.png`
6. `06-record-light.png`
7. `07-component-strip.png`

## Execution Boundary

本批次使用 Codex 内置图像工具逐张生成，再从 Codex generated-images store 复制到本目录。未使用 CLI/API fallback；工具层未暴露可验证的底层模型名。
