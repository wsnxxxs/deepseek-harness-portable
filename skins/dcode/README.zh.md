# DCode 石墨工作台

[English](README.md) | 中文

## 能力

基于 DCode 工作台提取的皮肤中心 v2 资产包：纸白与石墨配色、分层面板、圆角控件和原创建筑光影矢量背景。两张背景均为本地静态 SVG。

![亮色预览](preview/light.jpg)
![暗色预览](preview/dark.jpg)

## 安装

需要 DSH Web，并启用 `@linxin666/dsh-client-ui-skin-center`。把本目录完整复制到 `$DSH_HOME/skins/dcode/`（通常为 `~/.dsh/skins/dcode/`），刷新界面，在“设置 → 皮肤中心”选择“DCode 石墨工作台”。

也可以在已构建的 dsh-web 仓库中运行：

```sh
node scripts/dsh-skin validate /absolute/path/to/skins/dcode
node scripts/dsh-skin install /absolute/path/to/skins/dcode
```

## 配置

使用宿主的外观设置选择亮色或暗色。皮肤中心负责皮肤选择、背景显示和卸载清理；选择官方皮肤即可恢复默认外观。安装此资产不会切换当前界面或启用功能插件。


玻璃材质使用 16px 模糊与 140% 饱和度。亮色画布／面板／卡片／对话框透明层的着色不透明度依次为 68/74/80/86%，暗色为 76/82/88/94%。面板高光、分层阴影、22px 圆角输入区、聚焦反馈、引用标签、排队卡片和细会话滚动条沿用工作台风格。具有标准语义属性的任务看板、用量卡片、插件设置卡、Git 对话框、会话 ID 面板和技能中心获得对应的卡片或对话框样式。

桌面 Acrylic/Mica、自定义工作台布局、拖放效果、流式状态指示和组件专属动画需要宿主或功能组件支持，不由此资产提供。毛玻璃模糊的是页面内背景，不会开启桌面原生透明。全屏遮罩与会话主区不加滤镜，避免全屏模糊层影响固定定位控件和滚动。

## 已知限制

这是外观资产包，不是完整的 Portable 工作台。Git、学习、用量统计和插件管理仍由独立功能提供；使用此皮肤不需要 `@dsh-portable/dcode-ui`。皮肤没有 npm 依赖、Cordis 接线、可执行 hooks 或网络资源。

`skin.css` 使用 L1 token 和 L2 语义属性；`patches.css` 通过稳定的 `data-pane`、`data-phase`、`data-dsh-frame`、`data-composer-card` 和 ARIA 菜单／列表框属性提供少量 L3 兼容样式。未输出语义属性的插件只获得 token 层配色覆盖。宿主布局和控件保留原有行为。预览展示上游静态 official-facade 试穿壳层，不是运行中的智能体会话。

## 许可

MIT。背景和样式由 deepseek-harness-portable 项目贡献者原创，见 [LICENSE](LICENSE)。预览壳层中的品牌标识归各自权利人所有。
