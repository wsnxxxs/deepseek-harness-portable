# Learning 测试

日常检查在仓库根目录运行 `pnpm run learning:test`。
修改发布入口或依赖时再运行 `pnpm run learning:package:test`；修改插件装配时运行 `pnpm run official:test`。

本次整理将 657 项测试精简为 427 项，测试文件从 34 个减为 32 个。没有新增排除规则或跳过测试。

| 范围 | 覆盖入口 |
| --- | --- |
| 协议、工具注册和交互提交 | `protocol`、`broker`、`checkpoint-transport` |
| 学习意图、教学路由和状态变化 | `learn-intent`、`teaching-*`、`learner-*` |
| 材料导入、检索和来源证据 | `ingest`、`material-*`、`eval-material` |
| 图表类型及组件交互 | `components`、`toolview-state` |
| 图表布局、强调状态、空值和键盘操作 | `visual-crowding`、`visual-behavior`、`visual-empty-plot`、`visual-accessibility` |
| 会话持久化、压缩和官方预设隔离 | 三个 `*.integration.spec.ts` 文件 |
| 插件安装、发布边界 | `installer`、`package-purity` 及独立发布检查脚本 |

维护时按行为分支选择代表样例。中英文、肯定与否定、代码解释与代码编写等不同边界保留；同一路径的同义句不逐个扩充。图表交互由组件套件负责，不再另外遍历整个图表集合检查相同的渲染结果。

布局检查保留树、分组、密集图和反馈循环在窄、宽容器中的回归。同一次布局计算同时检查重叠与越界。删除 CSS 字符串、固定间距及源码写法断言；视觉样式变化仍需实际预览，单元测试不能代替视觉检查。

新增测试应说明它覆盖的新行为或实际缺陷，并优先放入已有套件。预设隔离通过真实实例比较工具定义和提示词，不再重复搜索源码字符串。
