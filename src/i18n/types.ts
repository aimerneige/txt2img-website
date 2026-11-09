export type Dict = { [k: string]: string | Dict }

export interface LocaleMeta {
  /** BCP 47 tag, also written to <html lang>. */
  code: string
  /** Name in the language itself, shown in the language menu. */
  name: string
  /** Browser language prefixes that should pick this locale (e.g. "zh" matches zh-CN, zh-SG). */
  match: string[]
  /** Position in the language menu. */
  order: number
  dir?: 'ltr' | 'rtl'
  /** Style defaults that suit the language (used on first visit and on reset). */
  defaults?: { fontId?: string; align?: 'left' | 'justify' | 'center' }
}

export interface LocaleModule<M extends Dict = Dict> {
  meta: LocaleMeta
  messages: M
}

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> }

/** Simplified Chinese is the reference locale: every other locale must provide the same keys. */
export type BaseMessages = DeepString<(typeof import('./locales/zh-CN'))['default']['messages']>

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]

export type MessageKey = Paths<BaseMessages>
