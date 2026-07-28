# UI 自动化三种执行方式整合 Design QA

## 参考来源

- 用户会话附件图 1：场景列表行内“执行”入口。
- 用户会话附件图 2：场景列表“更多”菜单中的执行记录、日志、报告、录屏入口。
- 用户会话附件图 3：场景详情页 Chrome 录制与三种执行方式入口。
- 既有 Arco Design、`GiTable`、`a-dropdown`、`a-drawer` 和 `a-modal` 组件规范。

## 实现检查

- [x] Chrome 录制保持独立主按钮。
- [x] 列表单行“执行”使用下拉菜单，包含 Jenkins、扩展 CDP、Playwright Runner。
- [x] 批量执行和执行全部保持原 Jenkins 链路。
- [x] 多用例场景打开统一用例选择弹窗，不默认选择第一个用例。
- [x] “更多”菜单的四类结果入口均按三种执行方式展示二级菜单。
- [x] 统一结果抽屉使用现有 Arco 视觉语言，并按记录、日志、报告、录屏切换内容。
- [x] 详情页收敛为独立 Chrome 录制按钮和一个“执行”下拉按钮。
- [x] `npm run typecheck` 与生产构建通过。

## 浏览器视觉对比

状态：阻塞。

已尝试连接当前 Chrome 完成相同视口截图与交互检查，但当前选中的 Chrome 配置中 ChatGPT Chrome Extension 已安装但处于禁用状态，因此无法获取实现页面截图，也无法把会话附件与实现截图组合进行最终像素级对比。

恢复方式：在 Chrome 扩展管理页启用 ChatGPT Chrome Extension 后，按图 1 至图 3 的相同页面状态依次检查：

1. 行内执行下拉菜单是否完整显示且不被固定操作列裁切。
2. “更多”四个二级菜单在表格右侧是否有正确的展开方向和可视区域。
3. 用例选择弹窗在 720px 宽度下是否没有文本截断。
4. 结果抽屉在桌面宽度下为 1000px，在窄屏下是否自动占满宽度。
5. 详情页 Chrome 录制与执行按钮的间距、基线和卡片高度是否与参考图一致。

---

# 实时画面聚焦放大 Design QA

- source visual truth path: `D:\腾讯电脑管家截图文件\录屏_20260719_030814.mp4`
- source capture path: `C:\Users\liuzhi\AppData\Local\Temp\sakura-focus-video-preview\transition-sheet.png`
- implementation screenshot path: unavailable（当前应用内浏览器没有可用实例）
- viewport: 参考录屏 `1236×750`
- state: 登录页第一个输入框聚焦、橙色鼠标、一次点击波纹、约 `1.75×` 放大

## Full-view comparison evidence

参考录屏已按每秒 6 帧抽取并检查：画面由全景在约 560ms 内平滑放大，目标靠近右侧时不会强制居中到产生黑边，点击波纹只短暂出现一次。由于当前没有可用的应用内浏览器，无法取得同视口、同状态的实现截图，不能完成并排视觉比较。

## Focused region comparison evidence

已检查参考录屏中的登录卡片、输入框高亮、鼠标箭头和波纹区域。实现侧已完成对应代码与类型检查，但缺少浏览器渲染截图，因此字体、缩放插值、最终目标位置和波纹视觉尺寸仍不能判定为视觉通过。

## Findings

- [P1] 缺少浏览器渲染证据
  - Location: `AutomationExecutionLiveView.vue` 实时画面区域。
  - Evidence: 参考录屏可用；实现截图不可用。
  - Impact: 无法确认放大终点、边缘覆盖和波纹时序与参考录屏完全一致。
  - Fix: 本地启动一次 Runner 任务，在第一个输入框动作期间以相同视口截图或录屏，再进行同状态对比。

## Required fidelity surfaces

- Fonts and typography: 动作提示沿用现有系统字体；缺少浏览器截图，待验证。
- Spacing and layout rhythm: 目标位置和边缘约束已按参考计算；缺少浏览器截图，待验证。
- Colors and visual tokens: 鼠标和波纹使用参考橙色 `#ff6b00`；缺少浏览器截图，待验证。
- Image quality and asset fidelity: 保留完整 JPEG 原始分辨率，透明鼠标资源来自参考录屏；静态资源尺寸和 Alpha 已检查。
- Copy and content: 动作提示继续使用真实步骤序号和 admin 步骤名称。

## Comparison history

- 第 1 次：源录屏已打开并检查；实现浏览器截图因没有可用浏览器实例而阻塞，未进入视觉修正循环。

## Implementation checklist

- [x] Runner `npm run check`、`npm run test:unit`（15 项）通过。
- [x] admin-ui `pnpm typecheck`、`pnpm build` 通过。
- 启动本地 admin-ui、admin 和一次 Playwright Runner 登录用例。
- 捕获全景、放大过渡中间帧、放大完成帧和波纹消失帧。
- 对齐 `1236×750` 视口比较目标位置、缩放倍率、黑边和动画时长。
- 修正 P1 后重新生成本报告。

final result: blocked
