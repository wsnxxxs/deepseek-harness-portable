# Composer Attach

`@dsh-portable/composer-attach` 是独立的 Cordis 文件选择插件，通过现有 `@` 引用接口将工作区文件和文件夹添加到输入框。

- 点击输入框工具栏的文件按钮，打开原生 `@` 引用菜单，支持进入目录继续选择。
- 在 `+` 菜单选择「文件和文件夹」，或输入 `/files`，打开文件选择列表。
- 选择结果以文件或文件夹引用插入草稿，发送时复用 `ui-reference` 的序列化逻辑。

桌面运行时默认加载此插件，插件条目 ID 为 `composer-attach`，可在插件管理中独立启用或禁用。禁用后，插件添加的按钮和 `/files` 入口移除，原有手动输入 `@` 的功能仍由上游 `ui-reference` 提供。

插件通过 `dsh.client` 声明浏览器入口，使用 `conversation.input.left` 插槽和 `commandUi` 注册接口，不依赖 Dcode UI 或 Session Manager。宿主入口仅供插件加载器管理生命周期；文件列表由 `remote.fileReferences` 提供。

在仓库根目录执行：

```sh
pnpm --filter @dsh-portable/composer-attach build
pnpm --filter @dsh-portable/composer-attach test
```
