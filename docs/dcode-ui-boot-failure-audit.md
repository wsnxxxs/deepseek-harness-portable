# dcode-ui 启动失败全链路排查

报错：

```
Failed to load plugins
@dsh-portable/dcode-ui
failed to apply loader entry f80e0cf3 (@dsh-portable/dcode-ui):
  slot "settings.section" is already declared (by an entry in "sidebar.settings" (Vw))
```

日期：2026-08-29 · 分支 HEAD `5374bb3` · 子模块 `dc0f7bf` (dsh-v0.1.2-alpha.1-3)

---

## 一、根因（🔴 已修复）

### 结论

`apps/dcode-ui/src/client/index.ts` 在注册 `root` 时把 `settings.section` 声明为自己的子槽位，
而该槽位**已由官方设置外壳 `ui-settings-general` 声明**，一个槽位只允许一个声明者 →
`SlotCore.register()` 抛错 → 整个 dcode-ui 客户端插件 apply 失败 → 浏览器引导内核
`AppWebEntry.run()` 的 `Promise.all(loader.create(...))` 整体 reject → 应用永不挂载。

### 调用链（逐层可验证）

| 层 | 位置 | 行为 |
| --- | --- | --- |
| 1 | `vendor/.../client/ui-slots/src/index.ts:823-829` | `register()` 检查 `options.children`：`childRec?.spec` 已存在即 `throw new Error(\`slot "${key}" is already declared (by ${declaredBy})\`)` |
| 2 | 同上 `:874` | `declaredBy = \`an entry in "${options.name}"${registrant ? \` (${registrant})\` : ''}\`` → 正是报错里的 `an entry in "sidebar.settings" (Vw)` |
| 3 | `vendor/.../client/ui-settings-general/src/client/index.ts:142-153` | 官方外壳注册 `sidebar.settings`，并在 `children` 中声明 `settings.trigger/header/action/close/section/onboarding`。`Vw` 是该插件在产物中的 registrant 名 |
| 4 | `vendor/.../client/modules/src/client/system.ts:165-169` | `arriveGraphRow()`：**`row.inject` 里的包先于消费者到达**。dcode-ui 的 `package.json → dsh.client.inject` 含 `@deepseek-ai/dsh-client-ui-settings-general` 与 `.../ui-layout`，因此官方外壳必然先 apply |
| 5 | `apps/dcode-ui/src/client/index.ts:150` | `ctx.slots.inject('root', ...)`。`root` 是内置槽、构造时即声明 → `inject` 回调**同步执行**（`registry.ts:226`），`register` 抛错后经 `stop()` 原样重抛 |
| 6 | `vendor/.../vendor/loader/src/config/entry.ts:22-24` | `updateError('apply', ...)` 包装成 `failed to apply loader entry <id> (<name>): <detail>` |
| 7 | `vendor/.../client/web/src/boot.ts:119` | `await Promise.all(rows.map(...))` 任一 reject 即整页失败 → `boot-page.ts:92` 渲染 "Failed to load plugins" |

### 为什么以前是好的（git 证据）

`ecfd741 fix dcode preview slot registration` 曾**显式删掉**这个声明并留下说明：

```diff
-        // `settings.section` is already owned by the official `sidebar.settings`
-        // entry; the workbench keeps its own settings surface while active.
```

随后 `aafac89 align dcode settings with official ui` 把这段注释**替换回真实声明**，把已知冲突又引了回来：

```diff
+        children: { 'settings.section': { kind: 'list', scope: 'root' } },
```

这是一次明确的回归，不是上游升级导致的漂移。

### 关键约束（决定修复方向）

`ui-renderer/src/client/scoped-slots.tsx:49-51`：`renderSlot(key)` 只对本 entry 自己
`children` 里声明过的 key 授权，否则抛 `SlotOwnershipError`。
即：**即使去掉 `children` 声明，`renderSlot('settings.section', …)` 也照样会在渲染时崩**。
所以"借用官方设置分区"这条路在当前内核下不成立，必须整体回退。

### 已应用的修复

- `apps/dcode-ui/src/client/index.ts` — 移除 `children: { 'settings.section': … }`，恢复原因注释；`render()` 不再取 `renderSlot`；移除 `PropsRenderSlots` 导入。
- `apps/dcode-ui/src/client/shell/Workbench.tsx` — 移除 `renderSettingsSlot` 属性与 `PropsRenderSlots` 导入，不再向下透传。
- `apps/dcode-ui/src/client/settings/SettingsSurface.tsx` — 移除 `renderSection` 属性与 `official()` 包装，Models / Plugins / AgentPresets 改为直接使用 dcode 自带实现（这三个 fallback 本来就是完整实现，非占位）。
- 已用 `pnpm --filter @dsh-portable/dcode-ui run bundle` 重新出包，`apps/dcode-ui/lib/client.js` 中已不含该声明。

> 注：本次 diff 中另有 `useModalFocus`、`ariaExpanded`、`paletteOpen` 守卫等改动，属工作区并发编辑，非本次范围。

---

## 二、独立问题二：vendored 子模块被手改且未重新构建（🔴 阻断 build / 🟡 运行期降级）

`vendor/deepseek-harness` 工作区存在未提交修改：

```
M packages/api/session-controller/src/client/sessions/service.ts
M pnpm-lock.yaml
```

该补丁给 `SessionListState` 增加了 `state?: 'idle'|'loading'|'error'` 与 `error?: ClientFailure|null`，
并在 `projectList()` 里透传。但子模块的 `lib/` 是 gitignore 的构建产物，**没有跟着重建**：

- **类型面漂移**：消费方解析的是 `lib/types/**/*.d.ts`（仍是无 `state`/`error` 的旧声明）→ `tsc` 报 5 个错：
  ```
  src/client/settings/ModelUsageSection.tsx(34,12): TS2339 Property 'state' does not exist on type 'SessionListState'
  src/client/settings/ModelUsageSection.tsx(39,56): TS2339 Property 'error' does not exist on type 'SessionListState'
  src/client/settings/SettingsSurface.tsx(1139,12): TS2339 … 'state'
  src/client/settings/SettingsSurface.tsx(1143,50): TS2339 … 'error'
  src/client/state/hooks.ts(82,60): TS2353 'state' does not exist in type 'SessionListState'
  ```
  后果：`pnpm --filter @dsh-portable/dcode-ui build`（= `tsc -b && tsdown`）与 `dcode:test` 均失败。
- **运行期漂移**：已核对 `dist-desktop/node/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js`
  仍是未打补丁的旧产物（`phase, subagentsByParent`，无 `state: 'idle', error: null`）。
  因此 `list.state` / `list.error` 在真实运行时恒为 `undefined`
  → `UsageSection` / `ModelUsageSection` 的 `state === 'error'` 分支是死代码，用量面板永远只显示 loading / 空态，不会报错误。

补充事实：上游 `SessionListSnapshot`（manager 快照，`manager.ts:47-59`）**本来就有** `state`/`error`；
被补丁改的 `SessionListState` 是投影后的 store state。即这个补丁本质上是在补"投影层没有透传拉取状态"。

**二选一的处置（需你拍板）：**

- **A（推荐，符合本项目自身纪律）** — `git -C vendor/deepseek-harness checkout -- packages/api/session-controller/src/client/sessions/service.ts` 回滚子模块，并删除 dcode-ui 里 3 处 `list.state === 'error'` 分支。
  理由：`client-manifest-bridge.ts` 明确写了"the pinned kernel checkout stays effectively pristine"；子模块改动在下一次 `git submodule update` 会直接丢失。
- **B** — 保留补丁，在子模块内跑 `tsc -b tsconfig.client.json`（或完整 `pnpm build`）让 `lib/` 追上 `src/`，并把该补丁正式挪进 `patches/`（走 `patches/manifest.yml` 的构建期打补丁机制）以便跨 submodule 更新存活。

---

## 三、其它发现

### 🟡 P1 `apps/dcode-ui/README.md:40` 与实际实现不符

```
| Official settings → 界面设置 | a `settings.section` registration from this package |
```

实际入口是 `settings.general.item`（`id: 'dcode-interface'`，`index.ts:188`），不是 `settings.section`。

### ~~🟡 P1 死代码：`ModelUsageSection.tsx`~~（已处理）

`f10c160 release: refresh v1.6.0 workbench` 移除了它的 `settings.section` 注册，但组件本体留下了。
它现在无人引用，且是上面 5 个类型错误中的 2 个。要么重新注册进 `settings.section`（在官方设置里显示"模型用量"），要么删掉。

**结论**：已删除。官方设置里的"模型用量"改由 `ModelsUsageCard` 承担，注册在 Models 页自己声明的
`settings.models.footer` 扩展位上——那是官方 UI 为仓库外插件预留的座位，因此不必再争夺
`settings.section`（该槽由官方设置外壳独占声明）。

### 🟡 P2 `inject` 数组与注释自相矛盾

`apps/dcode-ui/src/client/index.ts:83-103`：注释写
`uiWorkspace, theme and connection are deliberately absent`，但第 92 行 `inject` 数组里**含** `'connection'`。
`connection` 服务确实存在（ui-settings-general 也注入它），所以只是注释过期，建议同步。

### 🟡 P1 CI 门禁缺口：客户端插件"是否成功 apply"无人验证

- `hasRequiredClientGraph()`（`packaged-bin.ts:504`）只检查 `window.__DSH_BOOT__` 里条目与其 inject 边是否存在，**不检查这些插件是否已激活**。
- `scripts/build/packaged-smoke.ts` 只做 host 侧 RPC 就绪探测，不拉浏览器页面。
- `apps/desktop/src/runtime-supervisor.cjs` 也没有抓取 boot page 的失败文案。

结果：一个 100% 必现、且会打死整个前端的 slot 冲突，可以完整通过打包冒烟并发布。
建议：在 `packaged-smoke` 里补一条"取 index.html 之外的真实页面 once，断言 DOM 中不出现 `data-dsh-boot` 的失败报告"，
或直接断言 `window.__DSH_BOOT_READY__` 无 rejection。

### 💭 P3 `patches/dsh-host-frontend-static-cache.js`（今日新增，未纳入 `manifest.yml`？）

`patches/manifest.yml` 已登记 `frontend-static-hashed-cache`，但脚本本身是未跟踪新文件。
它给 `/assets/xxx-<hash>.ext` 加 `immutable` 强缓存——对发布产物正确，
但在本机反复 rebuild 验证时会因强缓存看不到新包（排查时记得 disable cache）。另外该补丁文件尚未提交。

### 💭 P3 工作区处于并发编辑中

排查过程中 `apps/dcode-ui/src/client/locales.ts` 于 14:59 被外部改动（一次 build 前后状态不一致）。
结论以本报告复核时点为准；后续改动前建议先 `git status`。

---

## 四、已确认"没有问题"的环节

逐段核过，未发现缺陷，供排除：

- **安装链路** `install.ps1` / `install.sh` / `scripts/prepare-upstream-submodule.cjs`：下载校验（SHA256SUMS）、依赖存在性检查、子模块 worktree 配置迁移均正常，与本故障无关。
- **工作区与依赖闭包** `pnpm-workspace.yaml`、`.npmrc`、`runtime-deps.generated.json`（`@dsh-portable/dcode-ui` 已在闭包内）。
- **manifest 桥接** `scripts/build/client-manifest-bridge.ts` 正确镜像了 dcode-ui 的 `dsh.client`。
- **槽位声明唯一性**：全仓 portable apps 内仅此一处 `children:` 槽位声明，无其它重复声明风险。
- **dcode-ui `inject` 服务名** `settingsSchema` / `uiSession` / `commandUi` 在上游均确有 provider。
- **设置分区 fallback 完整性**：`ModelsSection`、`AgentPresetsSection`、`PluginSettingsSection` 均为完整实现，回退后功能不缺失。
- **`.dsh` portable home / profile 目录**：未发现残留的坏 profile。

---

## 五、建议的下一步

1. 重新打包并启动，确认 "Failed to load plugins" 消失（`pnpm run runtime:links:sync && pnpm run desktop:dev`）。
2. 对第二节做 A/B 决策，我一次性改完（含 `tsc -b` 验证通过）。
3. 修 `README.md:40`，处理 `ModelUsageSection` 死代码。
4. 补 `packaged-smoke` 的客户端 apply 断言，堵住门禁缺口。
