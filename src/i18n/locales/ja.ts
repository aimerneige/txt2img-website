import type { BaseMessages, LocaleModule } from '../types'

export default {
  meta: { code: 'ja', name: '日本語', match: ['ja'], order: 2, defaults: { fontId: 'noto-sans-jp', align: 'justify' } },
  messages: {
    app: {
      title: 'テキスト画像化',
      tagline: '長文をスマホで読みやすい縦長画像に',
      docTitle: 'テキスト画像化 · 長文をスマホ向け縦長画像に',
      description: '長文をブラウザ上でスマホ向けの縦長画像に組版します。オープンソースフォント、文字サイズや間隔の調整、ライト/ダークテーマに対応。',
    },
    header: {
      language: '表示言語',
      themeToLight: 'ライトテーマに切り替え',
      themeToDark: 'ダークテーマに切り替え',
      github: 'GitHub でソースコードを見る',
    },
    editor: {
      heading: 'テキスト',
      titlePlaceholder: 'タイトル（任意）',
      placeholder: 'ここにテキストを貼り付けるか入力してください…\n\n簡易 Markdown 対応：# 見出し、> 引用、- リスト、**太字**、--- 区切り線',
      chars: '{n} 文字',
      sample: 'サンプル',
      paste: '貼り付け',
      import: '読み込む',
      clear: 'クリア',
      dropHint: 'ドロップしてテキストファイルを読み込む',
    },
    settings: {
      heading: 'スタイル',
      reset: '初期設定に戻す',
      sectionFont: 'フォント',
      sectionLayout: 'レイアウト',
      sectionLook: '外観',
      sectionProcess: 'テキスト処理',
      font: 'フォント',
      fontSize: '文字サイズ',
      lineHeight: '行間',
      letterSpacing: '字間',
      paragraphSpacing: '段落間隔',
      padding: '余白',
      align: '揃え',
      alignLeft: '左揃え',
      alignJustify: '両端揃え',
      alignCenter: '中央揃え',
      indent: '字下げ',
      indentHint: '段落の先頭を二文字分下げる',
      palette: '配色',
      footer: 'フッター',
      footerPlaceholder: '例：@あなたの名前',
      showDate: '日付を表示',
      showDateHint: 'タイトルがあればその下に、なければフッターに表示',
      pangu: '和欧間にスペースを入れる',
      panguHint: '漢字・かなと英数字の間にスペースを挿入',
      collapseBlank: '余分な空行をまとめる',
      collapseBlankHint: '段落の間は段落間隔で統一',
      markdown: '簡易 Markdown',
      markdownHint: '見出し・引用・リスト・太字・区切り線を認識',
      resetDone: 'スタイルを初期設定に戻しました',
    },
    palettes: {
      paper: 'ホワイト',
      warm: '生成り',
      sage: 'セージ',
      mist: 'ミスト',
      night: 'ナイト',
      ink: '藍墨',
    },
    fontCategory: {
      sans: 'ゴシック',
      serif: '明朝',
      kai: '楷書',
      hand: '手書き',
      display: 'デザイン',
    },
    fonts: {
      'noto-sans-sc': 'Noto Sans SC',
      'noto-serif-sc': 'Noto Serif SC',
      'lxgw-wenkai': '霞鹜文楷',
      'noto-sans-jp': 'Noto Sans JP',
      'noto-serif-jp': 'Noto Serif JP',
      'klee-one': 'クレー One',
      'zen-maru-gothic': 'Zen 丸ゴシック',
      'ma-shan-zheng': 'Ma Shan Zheng',
      'zcool-kuaile': 'ZCOOL KuaiLe',
      inter: 'Inter',
      lora: 'Lora',
    },
    fontScript: {
      zh: '中国語',
      ja: '日本語',
      latin: '欧文',
    },
    preview: {
      heading: 'プレビュー',
      empty: 'テキストを入力すると、ここにプレビューが表示されます',
      loadingFonts: 'フォントを読み込み中…',
      size: '{w} × {h} px',
      width: '書き出し幅',
      download: 'PNG を保存',
      copy: '画像をコピー',
      share: '共有',
      open: 'プレビュー',
      close: 'プレビューを閉じる',
      exporting: '生成中…',
      shortcut: 'ショートカット Ctrl / ⌘ + S',
    },
    toast: {
      downloaded: '画像を保存しました',
      copied: '画像をクリップボードにコピーしました',
      copyUnsupported: 'このブラウザは画像のコピーに対応していません。保存をご利用ください',
      pasteFailed: 'クリップボードを読み取れません。Ctrl / ⌘ + V で貼り付けてください',
      pasteEmpty: 'クリップボードにテキストがありません',
      cleared: 'テキストをクリアしました',
      undo: '元に戻す',
      imported: '「{name}」を読み込みました',
      importFailed: 'テキストファイルのみ読み込めます',
      exportFailed: '生成に失敗しました。文字数か書き出し幅を減らしてください',
      tooTall: '画像が長すぎてこのブラウザでは生成できません',
      emptyText: 'まずテキストを入力してください',
      shareFailed: '共有が完了しませんでした',
    },
    footer: {
      privacy: 'すべての処理はブラウザ内で完結し、テキストは送信されません。',
      licenses: 'フォントとライセンス',
    },
    licenses: {
      title: 'フォントとライセンス',
      intro: '埋め込まれているフォントはすべて SIL Open Font License 1.1 のオープンソースフォントで、商用でも無料で使えます。作成した画像はフォントライセンスの制約を受けません。',
      license: 'ライセンス',
      source: 'プロジェクト',
      viewLicense: 'ライセンス全文',
      close: '閉じる',
    },
    sample: {
      title: 'ゆっくり読む、よく考える',
      body: `私たちは毎日たくさんの文字を画面で読んでいますが、ひとつの段落をじっくり読み終えることはあまりありません。

伝えたい言葉をすっきりした縦長の画像にするのは、手紙を封筒に入れるようなもの。読む人はきっと手を止めてくれます。

## このツールでできること

- どんな長さのテキストでも、スマホで読みやすい画像にすぐ変換
- オープンソースフォントを選び、文字サイズ・行間・字間・余白を調整
- スマホから友だちに共有したり、写真に保存したり

> よい組版は目立たない。ただ、読むことを楽にしてくれる。

処理はすべてブラウザの中で行われ、**テキストがサーバーに送信されることはありません**。

---

伝えたいことを書いたら「PNG を保存」を押してください。`,
    },
  },
} satisfies LocaleModule<BaseMessages>
