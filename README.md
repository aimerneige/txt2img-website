# 文字长图 · txt2img-website

把一大段文字排版成适合手机阅读的长图。纯静态网页，所有处理都在浏览器本地完成，文字不会上传。

## 功能

- 实时预览，导出 PNG（750 / 1080 / 1242 / 1440 px 宽），支持复制到剪贴板、移动端系统分享
- 超长文本也能导出为**单张** PNG：超过浏览器画布上限时自动切换为流式 PNG 编码（`src/core/png.ts`）
- 中日文排版：避头尾（标点不出现在行首/行尾）、两端对齐、中英文自动加空格
- 轻量 Markdown：`#` 标题、`>` 引用、`-` / `1.` 列表、`**加粗**`、`---` 分隔线
- 字体、字号、行高、字间距、段间距、页边距、对齐、首行缩进、6 种配色、标题 / 日期 / 页脚
- 自定义字体：可引用本机已安装的**系统字体**（输入名称，或在支持 Local Font Access API 的浏览器中读取已安装字体列表），也可**上传本地字体文件**（TTF / OTF / WOFF / WOFF2，也可直接拖到文本框）。上传的字体保存在浏览器 IndexedDB 中，不会离开本机（`src/core/custom-fonts.ts`）
- 亮色 / 暗色主题（默认跟随系统，切换时有圆形扩散过渡）
- 中 / 日 / 英三语界面，可扩展
- 全部控件自定义实现（下拉框、滑块、开关、分段控件、提示、对话框），无原生弹窗或下拉框；支持键盘操作与读屏

## 开发与构建

```bash
npm install
npm run dev      # 本地开发
npm run build    # 输出静态网页到 dist/
npm run preview  # 预览构建结果
```

`dist/` 使用相对路径，可直接部署到 GitHub Pages、任意静态托管或子目录。

## 字体与许可

所有内嵌字体均为 **SIL Open Font License 1.1** 开源字体，构建时会把每个字体的许可文本复制到 `dist/licenses/`，页面底部「字体与许可」可查看。

| 字体 | npm 包 | 许可 |
| --- | --- | --- |
| 思源黑体 Noto Sans SC / JP | `@fontsource/noto-sans-sc`, `@fontsource/noto-sans-jp` | OFL-1.1 |
| 思源宋体 Noto Serif SC / JP | `@fontsource/noto-serif-sc`, `@fontsource/noto-serif-jp` | OFL-1.1 |
| 霞鹜文楷 LXGW WenKai | `lxgw-wenkai-webfont`（字体 OFL-1.1，打包脚本 MIT） | OFL-1.1 |
| Klee One | `@fontsource/klee-one` | OFL-1.1 |
| Zen Maru Gothic | `@fontsource/zen-maru-gothic` | OFL-1.1 |
| 马善政毛笔楷 Ma Shan Zheng | `@fontsource/ma-shan-zheng` | OFL-1.1 |
| 站酷快乐体 ZCOOL KuaiLe | `@fontsource/zcool-kuaile` | OFL-1.1 |
| Inter | `@fontsource/inter` | OFL-1.1 |
| Lora | `@fontsource/lora` | OFL-1.1 |

字体按 `unicode-range` 切分成子集，浏览器只下载实际用到的字符所在的分片。新增字体时：在 `src/core/font-faces.ts` 引入 CSS，在 `src/core/fonts.ts` 的 `FONTS` 中登记，在 `src/core/font-licenses.ts` 中登记许可文件，并在各语言文件的 `fonts` 下添加名称。

## 新增界面语言

在 `src/i18n/locales/` 新建一个文件（例如 `ko.ts`），默认导出 `{ meta, messages }`，键与 `zh-CN.ts` 一致即可，会被自动注册（`import.meta.glob`）。`meta.match` 决定匹配哪些浏览器语言，`meta.defaults` 可指定该语言默认的字体与对齐方式。缺失的键会回退到英文。

## 目录

```
src/
  core/      排版（layout）、绘制（render）、流式 PNG 编码、文本预处理、字体与设置
  i18n/      国际化运行时与语言包
  ui/        自定义控件：select / slider / switch / segmented / modal / toast / ripple / theme
  styles/    全局样式与设计变量（亮/暗主题）
  main.ts    页面装配
```
