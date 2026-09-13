# DeepSeek Harness Desktop v1.7.1

2026-09-13

## 更新内容

- 内置官方 DeepSeek Harness 更新至 0.1.5-rc.2。
- 整合 dsh-web 0.3.21 的插件管理与配置；管理入口常驻，功能插件默认关闭。
- 默认使用官方界面与预设，Portable 自有及内置扩展默认关闭。
- 桌面增强、DCode、Learning、Cluster 等功能按 DSH Bundle 规范显式启用，统一使用宿主 Cordis 依赖。
- 适配官方附件、反馈、RPC 与会话持久化接口。
- Learning 测试从 657 项精简至 427 项，保留核心行为与集成回归。

## 升级说明

- 启动时自动将旧 Portable / Learning 自定义事件历史转换为官方 v3 日志，原始文件保持不变，不删除历史对话。
