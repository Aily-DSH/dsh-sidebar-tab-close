# dsh-sidebar-tab-close

> 让 DeepSeek Harness 的 Ctrl+W 优先关掉右侧栏当前标签页（而不是整个窗口），并支持双击标签直接关闭。

[English](#english) · [安装](#安装) · [行为细节](#行为细节) · [卸载](#卸载)

---

## 它解决什么

DSH 桌面客户端里 `Ctrl+W` 的默认语义是「关窗口优先级最高」：

- 焦点在右侧栏面板内 → 关掉那个标签页
- 焦点在会话区（绝大多数时候）→ **直接关整个窗口**，标签页一个不动

于是「只想关掉正在看的那个标签页」这件事反直觉，还容易误关窗口。本插件把优先级倒过来：**只要右侧栏展开且有可关的标签页，Ctrl+W 就关标签页；没有可关的标签页时才退回关窗口**。同时补上鼠标侧的对应操作：**双击标签页即关闭**。

## 功能

- ⌨️ `Ctrl+W`（macOS `⌘W`）优先关闭右侧栏的当前标签页
- 🖱️ 双击右侧栏标签页直接关闭
- 🛡️ 不改动 `app.asar`、不写任何文件：全部通过官方 `ctx.sidebarRight` 服务在运行时打补丁，插件禁用即还原
- 🧯 失败自愈：标签 DOM 变化、目标不可关等任何异常都被吞掉，最差情况下退回 DSH 原生行为
- 🚫 与原生关闭规则一致：`canCloseTarget` 判定的不可关标签（例如唯一的引导页）仍不可关

## 环境要求

- DeepSeek Harness **>= 0.2.1-rc.5**（需要带 dockkit 右侧标签栏的 Web GUI）
- 只有在 **桌面客户端** 里 Ctrl+W 的含义才有意义（web 页面里浏览器自己处理 `Ctrl+W`）
- 本插件是**纯客户端插件**，没有宿主逻辑、没有配置文件、不占端口

## 安装

```bash
cd "/d/Program Files/DeepSeek Harness/resources/runtime/cli/bin"
./dsh.cmd plugin --profile desktop add "git+https://github.com/Aily-DSH/dsh-sidebar-tab-close.git"
```

或本地开发：

```bash
dsh plugin --profile desktop add "file:/D:/path/to/dsh-sidebar-tab-close"
```

**装完必须重启一次 DeepSeek Harness 客户端**：客户端插件的注入清单（injections）在宿主启动时计算一次，不重启不会加载。

重启后验证：

1. 打开会话，让右侧栏出现至少两个标签页
2. 把焦点点回会话区（中间）→ 按 `Ctrl+W` → 当前标签页关闭，窗口还在
3. 关到只剩一个不可关的标签 → 再按 `Ctrl+W` → 恢复原生行为（关窗口）
4. 双击任意标签页 → 直接关闭

## 行为细节

| 场景 | 行为 |
| --- | --- |
| 侧栏展开、有可关标签、焦点在会话区 | 关闭当前活动标签页 |
| 侧栏展开、焦点就在面板内 | 关闭当前活动标签页（原生行为，不变） |
| 侧栏展开、唯一标签不可关 | 退回关窗口（原生行为） |
| 侧栏收起 | 退回关窗口（原生行为） |
| 双击标签页本体 | 关闭该标签页；双击标签内的关闭按钮等控件不触发 |

顺带的影响：`page.close` 之外的 `page.*` 命令在焦点于会话区时也会解析到当前标签页目标；`Ctrl+R`（`page.refresh`）同理——原本它在焦点外是被忽略的，现在最多变成刷新当前标签页，不会造成新的破坏。

## 实现要点

- 不复制标签栏、不监听 DOM 事件做「猜」；直接包装 `ctx.sidebarRight.focusedTarget`：
  - 有原生结果 → 原样返回
  - 焦点在面板外且侧栏已展开 → 回退到 `commandTarget()` 给出的当前会话活动面板目标
  - 用重入保护避免 `commandTarget()` 内部再次调用 `focusedTarget` 造成递归
- 双击：从事件目标向上找到标签元素，排除内部 `button/[role=button]`，再用 `focusedTarget(tab)` + `canCloseTarget` + `closeTarget` 走原生关闭路径
- 所有钩子挂在插件的 effect scope 上，插件卸载/禁用时立即还原

## 卸载

```bash
dsh plugin --profile desktop remove dsh-sidebar-tab-close
```

重启客户端后恢复 DSH 原生 Ctrl+W 行为。

## 已知限制

- 只对右侧栏（dockkit 标签条）生效；左侧工作区、底部面板不在范围内
- 依赖标签元素的 `data-dockkit-tab` / `data-sidebar-right-tab` 属性；DSH 若改标记，双击关闭会静默失效（Ctrl+W 仍走服务层，不受影响）
- 与其它同样包装 `focusedTarget` 的插件叠加时，后加载者生效

## 目录结构

```
lib/index.js      宿主半：空实现，仅让客户端 bundle 被发现
lib/client.js     客户端半：包装 focusedTarget + 双击关闭
cordis.patch.yml  插入插件行
```

## English

**dsh-sidebar-tab-close** flips the `Ctrl+W` priority in the DeepSeek Harness desktop client: when the right sidebar is open with a closable tab, `Ctrl+W` now closes that tab instead of the window. Double-clicking a sidebar tab closes it too. Pure client-side plugin — it wraps the public `ctx.sidebarRight` controller at runtime, never touches `app.asar`, and restores the stock behavior when disabled.

```bash
dsh plugin --profile desktop add "git+https://github.com/Aily-DSH/dsh-sidebar-tab-close.git"
# restart the client once
```

## License

[MIT](./LICENSE)
