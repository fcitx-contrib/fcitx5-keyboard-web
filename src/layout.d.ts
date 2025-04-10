export interface Style { [key: string]: string | undefined }

export interface NormalKey {
  type: 'key'
  label: string
  key?: string
  code?: string
}

export interface ShiftKey {
  type: 'shift'
}

export interface BackspaceKey {
  type: 'backspace'
}

export interface SpaceKey {
  type: 'space'
}

export interface EnterKey {
  type: 'enter'
}

export interface SymbolKey {
  type: 'symbol'
}

export interface GlobeKey {
  type: 'globe'
}

export type Key = {
  flex?: string
} & (NormalKey |
  EnterKey |
  BackspaceKey |
  ShiftKey |
  SpaceKey |
  GlobeKey |
  SymbolKey | {
    type: 'placeholder'
  })

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

export interface Context {
  layer: string
  locked: boolean
}
