# DeepSeek Harness Desktop v1.7.2

2026-09-13

## 修复内容

- 旧 dsh-plugin-marketplace 改由内置 dsh-web 创意工坊替代（npm 最新版 0.3.21）。原先启用旧市场的配置会迁移为启用创意工坊，新安装仍按需开启。升级保留配置备份，并修复此前插件开关生成的混合 YAML。
- 内置功能与 dsh-web 插件管理共同编辑同一份 YAML 文档，保留 Cordis 表达式、注释和其他配置。
