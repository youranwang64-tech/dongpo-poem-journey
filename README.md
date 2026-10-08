# 东坡行记

以苏轼的诗文与人生行旅为线索的三维交互游戏。玩家随戴着斗笠的行旅者走过湖州、乌台、黄州、赤壁、庐山与岭南，用毛笔、行走和视点变化改变建筑空间，在交互之后阅读诗文。

[在线试玩](https://dongpo-poem-journey.haochuangyiai.chatgpt.site)

## 体验顺序

点击“入画”先保留开场大标题，再从第一章“湖州书声”开始。十个主篇章依次为：

1. 湖州书声
2. 乌台霜重
3. 心牢
4. 东坡初筑
5. 沙湖烟雨
6. 赤壁月夜
7. 庐山两面
8. 诏命再起
9. 食荔枝
10. 平生功业（衔接“此心安处”尾声）

主线结束后，可体验外篇“承天夜游”和最后的“活字聚诗”小彩蛋。活字场景不属于第一章；部分内部源码仍保留 `prologue` 名称。

## 本地运行

这是原生 JavaScript / Three.js 静态项目，不需要安装 npm 依赖或构建。请在本仓库根目录启动静态服务器，勿直接双击 HTML：

```sh
python -m http.server 8000 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8000/>。若 Windows 通过 Python Launcher 安装 Python，可将 `python` 换成 `py`。浏览器需支持 WebGL；首次加载需等待字体、模型与音乐资源读取完成。

操作提示会随章节变化：WASD 或点击地面行走，在目标处按住或挥动鼠标落笔；E 查看提示，H 隐藏界面。首次点击或按键后启声，右上角可切换音乐，篇章菜单可选择已列出的场景。

## 源码结构

- `index.html`、`style.css`、`main.js`：入口、界面与章节调度。
- 根目录其他 `.js`：建筑、镜头、毛笔、诗文、环境及章节交互。
- `prison/`：心牢章节的场景与视点交互。
- `assets/`：模型、纹理、字体、声音及素材来源说明。
- `vendor/`：随项目保留的 Three.js 运行库与加载工具。

此仓库整理自当前正式游戏版本，未包含录制工具、展示视频、设计说明交付文件、旧独立样张或托管平台凭据。

## 素材来源与许可

第三方素材遵循各自附带许可，原说明文件保留于：

| 内容 | 原许可或来源说明 |
| --- | --- |
| Three.js | [`vendor/LICENSE.txt`](vendor/LICENSE.txt) |
| 霞鹜文楷字体 | [`assets/LICENSE-OFL.txt`](assets/LICENSE-OFL.txt) |
| ChillKai 字体 | [`assets/ChillKai-OFL.txt`](assets/ChillKai-OFL.txt) |
| 植物模型 | [`assets/plants/LICENSE.txt`](assets/plants/LICENSE.txt) |
| Quaternius 动作素材 | [`assets/动作授权.txt`](assets/动作授权.txt) |
| 赤壁箫声录音 | [`assets/music/red-cliff-xiao-credit.txt`](assets/music/red-cliff-xiao-credit.txt) |
| 配乐来源与安排 | [`配乐安排.txt`](配乐安排.txt) |
| 生成纹理与剪影的制作记录 | `assets/textures/` 下的说明文件、`assets/wall-ink-silhouette-v2.txt` |

背景配乐来自创作期间提供的音乐包，当前目录只附来源与使用安排，未另附其再分发许可，请勿据此推定它们具有开源或自由再分发授权。

本仓库未为原创程序、美术或整部游戏新增开源许可证。原创内容的使用授权需由相应权利人另行确认；第三方许可只适用于其对应素材。
