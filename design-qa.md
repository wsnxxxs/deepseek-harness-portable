# Design QA: 已归档的聊天

## 对照素材

- 参考截图：`C:\Users\Ryan\AppData\Local\Temp\codex-clipboard-65d70353-7be0-4ba3-8904-8332912ffb53.png`
- 实现截图：`vendor/deepseek-harness/output/playwright/archived-chats-empty.png`
- 实现页面：设置 → 已归档的聊天

## 检查结果

- 已归档页面在现有设置导航中可见，并使用归档图标和选中态。
- 标题、空状态文案、圆角边框卡片和留白与参考素材保持一致；实现按当前项目的设置弹窗容器适配。
- 本次截图未发现 P0、P1 或 P2 视觉问题。

最终结果：通过。

---

# Design QA: 模型用量设置

## 对照素材

- 浅色参考：`C:\Users\Ryan\AppData\Local\Temp\codex-clipboard-a06d78c0-2dbc-4db9-bc30-436f85b5d40f.jpg`（1440 × 1192）
- 深色参考：`C:\Users\Ryan\AppData\Local\Temp\codex-clipboard-e6da448d-da0b-4b16-9901-e0ff4a1649f3.png`（934 × 318）
- 浅色实现：`output/playwright/token-usage-models.png`（800 × 672）
- 深色实现：`output/playwright/token-usage-models-dark.png`（800 × 672）
- 组合对照输入：`output/playwright/token-usage-comparison-light.png`、`output/playwright/token-usage-comparison-dark.png`

## 状态与尺寸

- 页面：设置 → 模型（内嵌模型用量）；默认中文、近 6 个月、每日活动、跟随系统外观。
- 浏览器视口：800 × 801 CSS px；截图为设置弹窗元素，device scale factor 1。
- 参考素材与实现截图按 800 px 宽度归一化后进行组合对照；深色参考主要用于活动热力图和色彩层级对照。

## 检查结果

- 全局构图：设置左侧导航、五项 Token 概览、活动热力图、用量明细、缓存进度和模型明细层级一致；模型明细现在显示 `deepseek-v4-flash`、`deepseek-v4-pro` 等独立模型聚合行。
- 聚焦区域：明细首行实际显示提供方、总 Token、调用、输入、输出、推理五列；没有再使用会话标题作为模型名。
- 交互：每日/每周/累计、近 7 天/30 天/6 个月/全部时间、刷新和 5 秒自动刷新均已在本地页面验证；浅色/深色外观均已检查，验证后恢复跟随系统。
- 字体与排版：沿用项目现有设置字体和层级，数值、标签、导航和按钮密度与参考一致。
- 间距与布局：卡片间距、圆角、边框、热力图网格和明细列间距保持统一；较长明细通过弹窗滚动承载。
- 颜色与视觉 Token：浅色使用现有中性背景和蓝/绿状态色，深色使用现有深色面板与低对比网格，活动高亮清晰。
- 图片与图标：未新增图片资产；图标使用项目现有图标库。
- 文案与内容：新增中文/英文用量文案，模型行使用真实 provider/model 路由数据。

## 比较历史

- 初始实现曾按会话生成明细行；根据需求改为 token-meter 的 `provider + model` 投影聚合。
- 对历史冷会话增加首次模型投影回填并写入缓存；重新加载后全局明细显示独立模型行，随后复测浅色、深色和筛选交互。
- 复测未发现 P0、P1 或 P2 视觉问题。

## Findings

- 无可执行的 P0/P1/P2 问题。

## Implementation Checklist

- [x] 设置导航接入“模型”，并在模型页内嵌模型用量。
- [x] 独立模型聚合 Token、调用、输入、输出和推理用量。
- [x] 活动热力图、筛选、刷新、自动刷新和主题状态可用。
- [x] 本地运行时、浅色和深色截图已复核。

final result: passed
