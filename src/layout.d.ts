export interface Style { [key: string]: string | undefined }

export type Key = {
  type: 'key'
  label: string
  key: string
  flex?: string
} | {
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
