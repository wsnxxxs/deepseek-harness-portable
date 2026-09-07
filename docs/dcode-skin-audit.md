# DCode 皮肤视觉迁移核对

核对来源：`apps/dcode-ui/src/client/tokens.module.css` 及 shell、chat、settings、git、learning 的 CSS Modules。目标：`skins/dcode` 独立 v2 资产包。核对日期：2026-09-07。

| 原工作台视觉 | 皮肤落点／处理 |
| --- | --- |
| 亮暗配色、文字层级、状态色、代码块、链接 | L1 官方主题变量，两套配色 |
| 玻璃透明度层级 | 亮色 68/74/80/86%，暗色 76/82/88/94%，按画布／面板／卡片／浮层分层 |
| 16px blur、140% saturation | 侧栏、详情、头栏、输入框、设置、语义对话框和 ARIA 菜单；不对整个应用根加滤镜 |
| 卡片阴影、浮层阴影、对话框阴影 | 分别映射材质变量，主机阴影 token 同步 |
| 内侧顶部高光、细边框 | 输入区、头栏、卡片、弹窗和菜单 |
| 输入框 22px 圆角、聚焦边框与光圈 | composer 语义表面；静态壳使用 data-composer-card 兼容 |
| 12px 卡片、14px 队列、18px 菜单、20px 对话框 | 对应语义卡片和 ARIA 菜单，不改宿主几何布局 |
| 胶囊引用标签、排队卡片 | composer-chip、queue-dock |
| 新会话按钮悬停、键盘焦点、禁用透明度 | new-session；主按钮填色与文字使用成对 token |
| 细滚动条 | 会话 scrollport |
| 快速过渡、减少动态效果偏好 | 输入区与新会话按钮 120ms；reduced-motion 关闭皮肤新增过渡 |
| 功能区域的共用卡片／浮层材质 | 标准 task-board、usage、web-ui-settings、git-graph、session-id、skill-explorer 属性；无需安装这些插件即可使用皮肤 |
| 页面环境光、背景视觉层次 | 本地亮暗 SVG 背景；保留现有静态背景资产，不引入运行时依赖 |
| 原生桌面 Acrylic/Mica、桌面透视 | 需要桌面壳提供窗口材质，纯 CSS 不能开启；未移入 |
| 可调整列宽、折叠／拖拽布局、导航轨、组件尺寸体系 | 由界面插件负责；皮肤沿用宿主布局，避免强行覆盖 |
| 拖放高光、流式脉冲、展开动画、计划卡和学习卡专属状态 | 依赖对应组件 DOM／状态；保留在 dcode-ui，不伪造上游语义属性或加入 JS hooks |
| ANSI 16 色、diff 专属色、组件图标、字体尺寸和行高体系 | 组件专属渲染保留；公共文字／代码／状态色通过 L1 token 传递，不强改终端调色板或用户字体大小 |

## 验证范围

本次检查独立资产校验、市场生成一致性、Skin Center 收录校验和双语文档；通过上游 official-facade 静态试穿检查亮暗外观、透明度和实际计算出的 backdrop-filter，并更新预览。静态试穿不含真实运行中的插件弹窗和长会话，不能替代真实 DSH 换肤、滚动性能及恢复默认验证。完整仓库测试的既有未完成项见 `dist-skins/REVIEW.md`。
