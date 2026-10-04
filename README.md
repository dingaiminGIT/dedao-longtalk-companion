# 得到长谈速览 0.3.1

给得到长谈文字稿生成便于筛选的速览：内容概览、观点启发 / 具体案例 / 行动指导三个维度、通常 5～8 个、最多 12 个重点详解与原文入口。默认偏好是“有新观点、有具体案例，能指导行动”，可修改。

独立项目，非得到官方产品。与知识红包插件、Android 项目分别维护。

## 分享与安装

把 `dedao-longtalk-0.3.1.zip` 发给对方即可，不包含你的登录信息、API Key、文章或私人摘要。解压后保留目录，在桌面 Chrome 的 `chrome://extensions/` 开启开发者模式，点击“加载已解压的扩展程序”，选择 **extension** 文件夹。需要 Chrome 116 或更新版本。

扩展本身不限定 macOS。Windows、macOS、Linux 使用同一份扩展。首次使用默认 API 模式；从旧版升级会保留本机 Codex 模式。

打开得到长谈文章，点击浮条展开，再点底部 **模型设置**。也可以在 Chrome 扩展管理页打开本扩展的“扩展程序选项”。每个用户使用自己的得到账号和模型账号 / 额度。

## 选择模型

| 方式 | 需要什么 | 系统与验证情况 |
| --- | --- | --- |
| API | 服务商 Base URL、模型 ID、自己的 API Key | DeepSeek 已实测；桌面 Chrome 跨平台，不需要 Python 或本机连接程序 |
| 本机 Codex | Codex CLI、CLI 登录、Python 3、本机连接程序 | macOS 已实测；提供 Windows / Linux 安装脚本，尚未实机验证 |
| 本机 CodeBuddy CLI | 独立安装的 CodeBuddy CLI、其登录、Node.js、Python 3、本机连接程序 | macOS 已实测 CodeBuddy CLI 2.161.2；Windows / Linux 尚未实机验证 |

### API 模式

1. 选择 OpenAI、DeepSeek 或“自定义 OpenAI 兼容服务”。
2. 填写 Base URL（如 `https://api.example.com/v1`），不要附加 `/chat/completions`；填写该服务商的模型 ID 和 API Key。
3. 保存，并允许扩展访问所选 API 网站。可点击“测试 API 与模型”，发送一条极短测试消息，可能产生少量费用。
4. 回到文章页，点击“生成速览”。

当前协议为 **Chat Completions**，支持流式输出及 JSON 模式，不代表所有厂商原生协议都兼容。Claude / Gemini 原生接口需要另做适配，或使用自行选择的兼容接口。自定义地址须为 HTTPS；本机 `localhost` / `127.0.0.1` 可用 HTTP。不会自动向其他服务商转发或回退。

Key 仅保存于扩展的会话存储，不同步、不交给得到网页。退出浏览器、禁用或重新加载扩展后需要重新填写。更改 Base URL 后不会沿用另一个地址的 Key。服务地址和模型等非敏感配置保存在本机。

长稿默认每约 1.6 万字符分段整理，再合并为详细速览；长文会产生多次模型调用。默认输出上限为 16384 tokens，避免详细中文速览被截断；设置页可调整单段大小、输出上限和 JSON 模式。分段摘记会保留额外的真实引用；格式不合格时自动修正一次，不接受不存在的引用。合并结果超过 12 个主题时，会根据偏好精选 5～8 个完整主题，再逐条校验；不会直接截断正文。模型须有足够上下文及中文输出能力；只保证结构与引用合法，不保证每个服务商输出质量相同。API 任务最多运行 10 分钟，可随时取消。

### 本机 Codex / CodeBuddy CLI

本机模式指通过本机命令行调用模型，**不等于离线模型**。不需要在扩展中填写 API Key，使用所选 CLI 的登录和额度。模型名称可留空使用工具默认值。

先安装 Python 3 和所选工具，再执行对应安装器：

- macOS：双击 `install-macos.command`，或 `python3 scripts/install.py`。
- Windows：双击 `install-windows.cmd`，或 `py -3 scripts/install.py`。
- Linux：运行 `sh install-linux.sh`。

安装器只注册当前用户，不下载依赖、不读取或复制认证文件。安装器优先检测 PATH 中的完整 `codebuddy` / `cbc`。WorkBuddy 桌面端可能只附带缺少交互登录的精简 CLI，不能当作完整安装使用。完整 CLI 可按[官方安装文档](https://www.codebuddy.cn/docs/cli/installation)运行 `npm install -g @tencent-ai/codebuddy-code`；找不到时可指定实际路径：

```sh
python3 scripts/install.py --workbuddy /path/to/codebuddy --node /path/to/node
python3 scripts/install.py --codex /path/to/codex
```

Windows 的 npm `.cmd` shim 会尝试解析为实际 JS 入口；无法解析时请指定实际 `.exe` / `.js`，不经 shell 执行生成命令。Linux 的本机模式需要安装对应平台可用的 CLI，不依赖 WorkBuddy 桌面产品。

Codex 登录运行 `codex login`。CodeBuddy CLI 登录运行 `codebuddy` 并按登录提示操作，后续可用 `/login`。它是独立的命令行产品，不假定自动继承 WorkBuddy 桌面端的登录或额度。设置中内部保留 `workbuddy` 标识以兼容旧配置；实际接入名称会明确显示 CodeBuddy CLI。

“检测本机程序”只验证连接程序和可执行文件存在；登录、额度、模型是否可用以实际生成为准。本机任务最多 5 分钟。CodeBuddy CLI 已验证模型 `deepseek-v4.1-flash`（在模型名称里填写）；CLI 默认的 Hy4 在本次长稿测试中超时，较慢模型可改用该模型。插件不会静默切换模型。

安装位置：macOS 为 `~/Library/Application Support/DedaoLongtalk/host`，Linux 为 `~/.local/share/dedao-longtalk/host`，Windows 为 `%LOCALAPPDATA%\DedaoLongtalk\host`。Chrome 的注册方式遵循 [Native Messaging 文档](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)。其他 Chromium 浏览器需另注册对应目录，可用 `--registry-dir` 指定。

## 阅读与交互

- 箭头展开 / 收起；拖动六点手柄或标题栏移动，位置会保存。手柄支持方向键微调，双击或按 Home 恢复默认位置。
- 仅在有全文稿的文章页显示，电子书、首页和普通文章页自动隐藏。
- 先看概览与建议，再读论证；展开重点可看案例、行动与适用边界，也可“全部展开”。长稿目标约 3000～4500 字，材料不足时不凑字数。
- 点击“原文”定位并高亮正文；不提供未经验证的视频时间戳。嘉宾意见归属于发言者，由模型延伸的行动会明确标注。
- 只有点击生成才发送正文。收起面板不取消任务；取消按钮、关闭文章标签页或保存模型设置会停止任务。
- 每次生成重新提取正文。读取失败时才显示“重试读取”。
- 缓存按账号、正文、偏好和模型配置隔离，最多 30 条、7 天，不缓存原稿。可“清除此篇摘要”；不会更改得到学习记录。

## 更新与卸载

扩展更新后在管理页点重新加载，并刷新已打开的文章页。使用本机模式时还应重跑安装器更新连接程序。

在 Chrome 扩展管理页移除扩展会清除本机扩展数据。要卸载本机连接程序，删除上述 `DedaoLongtalk/host` 目录，以及 Chrome 的 `NativeMessagingHosts/com.baiyalab.dedao_longtalk.json`；Windows 还需删除当前用户注册表 `Software\Google\Chrome\NativeMessagingHosts\com.baiyalab.dedao_longtalk`。不会删除 Codex、CodeBuddy CLI 或其登录信息。

## 限制与验证

需要用户自己有文章全文访问权限；缺少全文稿、超过 18 万字符或页面结构不匹配时不生成。2026-10-04 在 macOS 上使用 969 段、约 6.4 万字的真实长谈稿验证：DeepSeek API（`deepseek-flash`）从插件按钮到结果展示通过，55.1 秒生成 11 个重点；CodeBuddy CLI 2.161.2（`deepseek-v4.1-flash`）完整稿生成与结构、引用校验通过，76.1 秒生成 10 个重点；再从插件按钮实际调用本机连接程序，114.3 秒生成 9 个重点并正常展示。耗时和内容会随模型及服务负载变化。Codex 本机模式也已实测。

WorkBuddy 桌面精简 CLI 不能独立完成此接入，当前提供的是独立 CodeBuddy CLI 模式，需要自己的 CLI 登录。Windows / Linux 安装路径和 Windows npm shim 经过单元测试，未在对应系统实机运行。

未上架应用商店。分享包不自动更新；换版本需替换扩展目录并重新加载。不要把自己的浏览器数据或 CLI 认证文件一起发给别人。

## 开发

无 npm 依赖；本机连接程序使用 Python 标准库。

```sh
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/package.py
```

`extension/analysis-spec.json` 是三种模式共用的提示词和输出结构。`providers.js` 实现 API 请求与分段，`background.js` 管理设置、任务和缓存；`native/host.py` 固定调用本机 CLI。内容以 textContent 渲染，不执行模型返回代码。打包使用固定文件清单，不包含 artifacts、原稿、密钥或运行日志。
