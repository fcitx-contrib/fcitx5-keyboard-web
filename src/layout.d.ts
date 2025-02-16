export interface Style { [key: string]: string | undefined }

export interface NormalKey {
  type: 'key'
  label: string
  key?: string
  code?: string
  flex?: string
}

export type Key = NormalKey | {
  type: 'placeholder'
  flex: string
}

export interface Row {
  keys: Key[]
}

export interface Layer {
  id: string
  rows: Row[]
}

export interface Layout {
  layers: Layer[]
}

export type BUILTIN_LAYOUT = 'qwerty'
