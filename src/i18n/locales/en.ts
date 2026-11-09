import type { BaseMessages, LocaleModule } from '../types'

export default {
  meta: { code: 'en', name: 'English', match: ['en'], order: 0, defaults: { fontId: 'inter', align: 'left' } },
  messages: {
    app: {
      title: 'Text to Image',
      tagline: 'Turn long text into a phone-friendly long image',
      docTitle: 'Text to Image · Long text to a phone-friendly image',
      description: 'Lay out long text as a tall image for mobile reading, right in your browser. Open-source fonts, adjustable size and spacing, light and dark themes.',
    },
    header: {
      language: 'Language',
      themeToLight: 'Switch to light theme',
      themeToDark: 'Switch to dark theme',
      github: 'View source on GitHub',
    },
    editor: {
      heading: 'Text',
      titlePlaceholder: 'Title (optional)',
      placeholder: 'Paste or type your text here…\n\nLight Markdown works: # heading, > quote, - list, **bold**, --- divider',
      chars: '{n} chars',
      sample: 'Sample',
      paste: 'Paste',
      import: 'Import',
      clear: 'Clear',
      dropHint: 'Drop to import the text file',
    },
    settings: {
      heading: 'Style',
      reset: 'Reset',
      sectionFont: 'Font',
      sectionLayout: 'Layout',
      sectionLook: 'Appearance',
      sectionProcess: 'Text processing',
      font: 'Font',
      fontSize: 'Font size',
      lineHeight: 'Line height',
      letterSpacing: 'Letter spacing',
      paragraphSpacing: 'Paragraph spacing',
      padding: 'Margins',
      align: 'Alignment',
      alignLeft: 'Left',
      alignJustify: 'Justify',
      alignCenter: 'Center',
      indent: 'First-line indent',
      indentHint: 'Indent each paragraph by two characters',
      palette: 'Colors',
      footer: 'Footer text',
      footerPlaceholder: 'e.g. @yourname',
      showDate: 'Show date',
      showDateHint: 'Under the title if there is one, otherwise in the footer',
      pangu: 'Space between CJK and Latin',
      panguHint: 'Insert a space between Chinese/Japanese and letters or digits',
      collapseBlank: 'Merge blank lines',
      collapseBlankHint: 'Use paragraph spacing between all paragraphs',
      markdown: 'Light Markdown',
      markdownHint: 'Headings, quotes, lists, bold and dividers',
      resetDone: 'Style reset to defaults',
    },
    palettes: {
      paper: 'Paper',
      warm: 'Warm',
      sage: 'Sage',
      mist: 'Mist',
      night: 'Night',
      ink: 'Ink',
    },
    fontCategory: {
      sans: 'Sans',
      serif: 'Serif',
      kai: 'Kai',
      hand: 'Handwriting',
      display: 'Display',
    },
    fonts: {
      'noto-sans-sc': 'Noto Sans SC',
      'noto-serif-sc': 'Noto Serif SC',
      'lxgw-wenkai': 'LXGW WenKai',
      'noto-sans-jp': 'Noto Sans JP',
      'noto-serif-jp': 'Noto Serif JP',
      'klee-one': 'Klee One',
      'zen-maru-gothic': 'Zen Maru Gothic',
      'ma-shan-zheng': 'Ma Shan Zheng',
      'zcool-kuaile': 'ZCOOL KuaiLe',
      inter: 'Inter',
      lora: 'Lora',
    },
    fontScript: {
      zh: 'Chinese',
      ja: 'Japanese',
      latin: 'Latin',
    },
    preview: {
      heading: 'Preview',
      empty: 'Start typing and the live preview appears here',
      loadingFonts: 'Loading fonts…',
      size: '{w} × {h} px',
      width: 'Export width',
      download: 'Download PNG',
      copy: 'Copy image',
      share: 'Share',
      open: 'Preview',
      close: 'Close preview',
      exporting: 'Rendering…',
      shortcut: 'Shortcut: Ctrl / ⌘ + S',
    },
    toast: {
      downloaded: 'Image saved',
      copied: 'Image copied to clipboard',
      copyUnsupported: 'This browser can’t copy images — use Download instead',
      pasteFailed: 'Can’t read the clipboard — press Ctrl / ⌘ + V instead',
      pasteEmpty: 'There’s no text on the clipboard',
      cleared: 'Text cleared',
      undo: 'Undo',
      imported: 'Imported “{name}”',
      importFailed: 'Only plain-text files can be imported',
      exportFailed: 'Rendering failed — try less text or a smaller export width',
      tooTall: 'The image is too tall for this browser — try less text',
      emptyText: 'Type some text first',
      shareFailed: 'Sharing didn’t finish',
    },
    footer: {
      privacy: 'Everything runs locally in your browser. Your text is never uploaded.',
      licenses: 'Fonts & licenses',
    },
    licenses: {
      title: 'Fonts & licenses',
      intro: 'Every embedded font is open source under the SIL Open Font License 1.1 and free for commercial use. Images you create are not restricted by the font licenses.',
      license: 'License',
      source: 'Project',
      viewLicense: 'License text',
      close: 'Close',
    },
    sample: {
      title: 'Read slowly, think clearly',
      body: `We read thousands of words on screens every day, yet rarely finish a single paragraph with care.

Setting your words in a clean, tall image is like putting a letter in an envelope — people are more willing to stop and read.

## What this tool does

- Paste text of any length and get a phone-friendly image instantly
- Pick an open-source font and tune size, line height, spacing and margins
- Share it from your phone or save it to your photos

> Good typography goes unnoticed. It simply makes reading easy.

Everything happens in your browser — **your text is never uploaded to any server**.

---

Write what you want to say, then tap “Download PNG”.`,
    },
  },
} satisfies LocaleModule<BaseMessages>
