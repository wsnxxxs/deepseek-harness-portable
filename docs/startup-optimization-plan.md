# DeepSeek Harness 桌面端启动速度优化方案

状态：**方案（未执行）** · 日期：2026-08-28
范围假设：以**用户可感知的桌面应用启动**（双击 → 主窗口可用）为主目标。开发链路（`desktop:dev`）与桌面壳共享 runtime 启动内核，方案同样生效；dev 特有部分单列在 P3。

---

## 一、现状启动链路（代码级事实）

```
Electron main (main.cjs)
 ├─ app.whenReady → probeShellAvailability(wsl.exe, 异步不阻塞) / locale / 窗口 + 托盘 + splash
 └─ restartHarness()
     └─ RuntimeSupervisor.start
         └─ spawn: electron.exe (ELECTRON_RUN_AS_NODE=1) apps/runtime/lib/packaged-bin.js --port 0
             ├─ hello
             ├─ materializeShippedPresetRoot()
             │    ├─ collectCapabilityReport()   ← 24h 磁盘缓存；miss 时【串行】跑 ~10 个探测子进程
             │    │                                (sandbox / PowerShell×3 / ConPTY / WSL×4 / dir-picker IPC)
             │    └─ preset 树 SHA-256 清单 (21+2 个文件，快)
             ├─ composeProfile()
             │    ├─ ensureWebAllProfile()  ← 注册内置聚合包，无启动时网络安装
             │    ├─ healProfilesModuleFallback()     ← 每次启动 BFS 读整个依赖闭包的全部 package.json
             │    └─ loadProfile() + Loader boot      ← 导入完整插件图 (dsh-base + web-app + marketplace
             │                                           + interactive-learning + vision-bridge 及闭包)
             └─ listening
     ├─ probeHarnessHealth()  (fetch ×2)
     ├─ window.loadURL(url)                       ← 端口每次随机(port 0) → renderer 的 HTTP 缓存
     │                                               与 V8 code cache 每次启动全部失效
     └─ renderer-ready + first paint → 显示主窗口
```

代码中已有的"慢"证据：
- `main.cjs`: `SLOW_STARTUP_MS = 20s`，`STARTUP_TIMEOUT_MS = 180s`；注释明确承认冷启动要重建 profile + reconcile marketplace。
- `capability-report-cache.ts`: 缓存 TTL 仅 **24h**，即每天第一次启动必付全套探测成本（探测串行、每个超时上限 8s）。
- `desktop-protocol`: 固定传 `--port 0`（随机端口）；vendor web-server 未见 Cache-Control/ETag。
- 全仓库无 `NODE_COMPILE_CACHE` / `module.enableCompileCache()` 使用。
- `healProfilesModuleFallback`（vendor app-boot）每次启动无缓存地做依赖闭包 BFS。

---

## 二、执行计划

📋 任务分解：
1. **P0 测量基线** — 复杂度：低
2. **P1 warm 启动快赢**（4 项，独立小改动）— 复杂度：低
3. **P2 冷启动专项**（4 项）— 复杂度：中
4. **P3 结构性/可选**（含 dev 链路）— 复杂度：中高

⚡ 执行策略：P0 先行拿到分阶段耗时基线 → P1 按项独立提交、逐项回归 → 基线数据决定 P2 取舍 → P3 默认不做。所有项不碰 vendor 行为语义，涉及 vendor 的改动走 `patches/` 通道（`patches/manifest.yml` 有 reviewed content guards）。

---

## 三、具体方案（按优先级）

### P0 · 测量基线（先做，半天）
| # | 事项 | 说明 |
|---|------|------|
| 0.1 | runtime 分阶段计时 | 在 `packaged-bin.js` 中按 `DSH_BOOT_TRACE=1` 输出 `diagnostic` 协议事件：presets（含 capability cache hit/miss）、compose（marketplace/heal/load）、loader、listening，各阶段 ms。桌面 `diagnosticsText()` 已能透出启动日志 |
| 0.2 | 冷/热双基线脚本 | 冷：清 `$DSH_HOME` 缓存后启动；热：常规启动。用现有 `--update-probe-file` 机制记录总时长，各跑 3 次取中位数 |

### P1 · warm 启动快赢（预期收益最大、风险最低）
| # | 事项 | 位置 | 预期 |
|---|------|------|------|
| 1.1 | 模块编译缓存 | `packaged-bin.js` 入口处 `module.enableCompileCache()`（落盘到 `$DSH_HOME/compile-cache`），并验证 `ELECTRON_RUN_AS_NODE` 下生效 | 消掉插件图每次启动的 parse/compile，通常可省 10–30% runtime 启动时间 |
| 1.2 | heal 结果缓存 | 在 `apps/runtime` 侧包一层 marker（key = 安装锚 hash + profile bundles 列表），命中跳过 `healProfilesModuleFallback`，锁内二次校验；不改 vendor | 省掉每次启动读数百个 package.json 的 BFS（Windows + 杀软下尤其明显） |
| 1.3 | 能力缓存 TTL 24h → 7d | `capability-report-cache.ts` `maxAgeMs` 默认值。identity 已绑定平台/ABI/Electron 版本/上游 commit/探测实现 hash，本身就是精确失效；保留 `DSH_REFRESH_RUNTIME_CAPABILITIES=1` 手动刷新 | 直接消掉"每天一遇"的 5–15s 串行探测 |
| 1.4 | 静态资源缓存头 | 先核实 vendor web-server 是否发 Last-Modified/ETag；缺则经 `patches/` 给 lib/client 资源加 `Cache-Control: immutable`（按内容版本） | 首帧后的 UI 资源加载提速（与 2.1 联动） |

### P2 · 冷启动专项
| # | 事项 | 位置 | 预期 |
|---|------|------|------|
| 2.1 | 端口稳定化 | `packages/desktop-protocol`（自有包）：supervisor 先 `listen(0)` 探一个空闲端口传给 runtime，`EADDRINUSE` 时自动换端口重试（替换现在的报错分支） | renderer HTTP 缓存 + V8 code cache 跨启动复用，首帧显著提速；不动 vendor |
| 2.2 | 能力探测并行化 | `capability-report.ts`：各 probe 相互独立（独立 PTY/进程），串行 `await` 改 `Promise.all` | 冷探测墙钟时间从 Σ 各探测 变为 ≈ max(单探测) |
| 2.3 | 已完成：内置 dsh-web-all | `web-all-profile.ts` 注册聚合包并链接内置文件，替换 marketplace 冷装 | 首次启动无需联网安装插件 |
| 2.4 | 探测与 Loader 并行 | 重排 `main()`：capability report promise 与 `composeProfile`/Loader boot 并行，写 preset manifest 前才 `await` | 冷启动再叠一层并行收益；改动启动结构，回归要求高 |

### P3 · 结构性 / 可选（默认不做）
| # | 事项 | 说明 |
|---|------|------|
| 3.1 | `listening` 提前 + `ready` 事件 | `listening` 提前到 HTTP bind 后，插件全激活后补发 `ready`；桌面壳等 `ready` 再 `loadURL`。视觉提前但要动 supervisor 协议版本 + `hasRequiredClientGraph` 门控，防止加载不完整 UI |
| 3.2 | dev 链路 | `desktop:dev` 每次先跑 `runtime:links:sync`（pnpm 启动 1–3s）；可加 `--skip-sync` 快速路径给频繁重启场景 |

### 验证门禁（每项提交都要过）
- `pnpm run packaging:test`（含 protocol / readiness smoke）全绿；
- 打包 smoke 的 ready 时间不回退；
- 冷/热启动对比表（P0 脚本产出）随每项更新；
- 桌面手测：托盘、重启引擎、切 workspace、更新探针（`--update-transaction`）路径不受 2.1 端口改动影响。

### 风险与边界
- **vendor 是 git submodule**：任何 vendor 行为变化（1.4 缓存头）必须走 `patches/` 声明通道，禁止直接改 vendor。
- 1.1 需验证 Electron-as-Node 下 compile cache 生效与磁盘占用（给缓存目录加上限清理即可）。
- 2.1 改变端口语义：健康监控、`startup.portInUse*` 文案、更新探针都要跟着改。
- 2.3 绕过 pnpm 偏离 upstream 安装语义，作为 portable 分发的私有快路径处理，并保留 pnpm 路径为 fallback。

### 预期收益（定性排序，P0 基线后量化）
1. warm 每日启动：1.1 + 1.2 + 1.3 合计（最大头）
2. 首帧：2.1 + 1.4
3. 冷启动/每日首次：2.2 + 2.3（+ 可选 2.4）
