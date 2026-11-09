import type { LocaleModule } from '../types'

export default {
  meta: { code: 'zh-CN', name: '简体中文', match: ['zh'], order: 1, defaults: { fontId: 'noto-sans-sc', align: 'justify' } },
  messages: {
    app: {
      title: '文字长图',
      tagline: '把长文本变成适合手机阅读的长图',
      docTitle: '文字长图 · 文本一键生成手机长图',
      description: '在浏览器本地把长文本排版成适合手机阅读的长图，支持多种开源字体、字号与间距调整、亮暗主题。',
    },
    header: {
      language: '界面语言',
      themeToLight: '切换到亮色主题',
      themeToDark: '切换到暗色主题',
      github: '在 GitHub 上查看源代码',
    },
    editor: {
      heading: '文本',
      titlePlaceholder: '标题（可选）',
      placeholder: '在这里粘贴或输入文字……\n\n支持轻量 Markdown：# 标题、> 引用、- 列表、**加粗**、---分隔线',
      chars: '{n} 字',
      sample: '示例',
      paste: '粘贴',
      import: '导入',
      clear: '清空',
      dropHint: '松开即可导入文本文件',
    },
    settings: {
      heading: '样式',
      reset: '恢复默认',
      sectionFont: '字体',
      sectionLayout: '排版',
      sectionLook: '外观',
      sectionProcess: '文本处理',
      font: '字体',
      fontSize: '字号',
      lineHeight: '行高',
      letterSpacing: '字间距',
      paragraphSpacing: '段间距',
      padding: '页边距',
      align: '对齐',
      alignLeft: '左对齐',
      alignJustify: '两端对齐',
      alignCenter: '居中',
      indent: '首行缩进',
      indentHint: '段落开头空两格',
      palette: '配色',
      footer: '页脚文字',
      footerPlaceholder: '例如：@你的名字',
      showDate: '显示日期',
      showDateHint: '有标题时显示在标题下，否则显示在页脚',
      pangu: '中英文间自动加空格',
      panguHint: '在汉字与字母、数字之间插入空格',
      collapseBlank: '合并多余空行',
      collapseBlankHint: '段落之间统一使用段间距',
      markdown: '轻量 Markdown',
      markdownHint: '识别标题、引用、列表、加粗与分隔线',
      resetDone: '已恢复默认样式',
    },
    palettes: {
      paper: '纸白',
      warm: '暖纸',
      sage: '护眼绿',
      mist: '雾蓝',
      night: '夜间',
      ink: '墨蓝',
    },
    fontCategory: {
      sans: '黑体',
      serif: '宋体',
      kai: '楷体',
      hand: '手写',
      display: '趣味',
    },
    fonts: {
      'noto-sans-sc': '思源黑体',
      'noto-serif-sc': '思源宋体',
      'lxgw-wenkai': '霞鹜文楷',
      'noto-sans-jp': '思源黑体 日文',
      'noto-serif-jp': '思源宋体 日文',
      'klee-one': 'Klee One 手写',
      'zen-maru-gothic': 'Zen 丸黑',
      'ma-shan-zheng': '马善政毛笔楷',
      'zcool-kuaile': '站酷快乐体',
      inter: 'Inter',
      lora: 'Lora',
    },
    fontScript: {
      zh: '中文',
      ja: '日文',
      latin: '西文',
    },
    preview: {
      heading: '预览',
      empty: '输入文字后，这里会实时显示长图预览',
      loadingFonts: '正在加载字体…',
      size: '{w} × {h} px',
      width: '导出宽度',
      download: '下载 PNG',
      copy: '复制图片',
      share: '分享',
      open: '预览',
      close: '关闭预览',
      exporting: '正在生成…',
      shortcut: '快捷键 Ctrl / ⌘ + S',
    },
    toast: {
      downloaded: '长图已保存',
      copied: '图片已复制到剪贴板',
      copyUnsupported: '当前浏览器不支持复制图片，请使用下载',
      pasteFailed: '无法读取剪贴板，请使用 Ctrl / ⌘ + V 粘贴',
      pasteEmpty: '剪贴板中没有文字',
      cleared: '已清空文本',
      undo: '撤销',
      imported: '已导入「{name}」',
      importFailed: '只能导入纯文本文件',
      exportFailed: '生成失败，请尝试减少文字或降低导出宽度',
      tooTall: '图片过长，当前浏览器无法生成，请减少文字',
      emptyText: '先输入一些文字吧',
      shareFailed: '分享未完成',
    },
    footer: {
      privacy: '所有处理均在本地浏览器完成，文字不会上传。',
      licenses: '字体与许可',
    },
    licenses: {
      title: '字体与许可',
      intro: '本站内嵌的全部字体均为开源字体，依据 SIL Open Font License 1.1 授权，可免费商用。生成的图片不受字体许可限制。',
      license: '许可证',
      source: '项目主页',
      viewLicense: '查看许可文本',
      close: '关闭',
    },
    sample: {
      title: '慢慢读，好好想',
      body: `我们每天都在屏幕上读很多字，却很少有时间认真读完一段话。

把一段想说的话排成一张干净的长图，就像把信装进信封——读的人会更愿意停下来。

## 这个工具能做什么

- 粘贴任意长度的文字，实时生成适合手机阅读的长图
- 选择开源字体，调整字号、行高、字间距与页边距
- 在手机上直接分享给朋友，或保存到相册

> 好的排版不会被注意到，它只是让阅读变得轻松。

所有处理都在你的浏览器里完成，**文字不会被上传到任何服务器**。

---

写下你想说的话，然后点「下载 PNG」。`,
    },
  },
} satisfies LocaleModule
