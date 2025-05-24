import { div, enableScroll, handleClick, press, release } from './util'
import { sendEvent } from './ux'

/* eslint-disable antfu/consistent-list-newline */
const builtinCategories = [
  { key: 'pinyin', symbols: [
    'ā', 'á', 'ǎ', 'à',
    'ō', 'ó', 'ǒ', 'ò',
    'ē', 'é', 'ě', 'è',
    'ī', 'í', 'ǐ', 'ì',
    'ū', 'ú', 'ǔ', 'ù',
    'ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ',
    'ń', 'ň',
  ] },
  { key: 'greek', symbols: [
    'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ',
    'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
    'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ',
    'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω',
  ] },
]
/* eslint-enable antfu/consistent-list-newline */

export function selectCategory(index: number) {
  const panel = document.querySelector('.fcitx-keyboard-symbol-panel') as HTMLElement
  panel.innerHTML = ''
  panel.scroll({ top: 0 })
  const symbolCategories = document.querySelectorAll('.fcitx-keyboard-symbol-category')
  builtinCategories.forEach((category, i) => {
    if (i === index) {
      for (const symbol of category.symbols) {
        const symbolItem = div('fcitx-keyboard-symbol-item')
        symbolItem.innerHTML = symbol
        handleClick(symbolItem, () => sendEvent({ type: 'COMMIT', data: symbol }))
        panel.appendChild(symbolItem)
      }
      press(symbolCategories[i])
    }
    else {
      release(symbolCategories[i])
    }
  })
}

export function renderSymbolSelector() {
  const symbolSelector = div('fcitx-keyboard-symbol-selector')
  const panel = div('fcitx-keyboard-symbol-panel')
  enableScroll(panel)

  const symbolCategories = div('fcitx-keyboard-symbol-categories')
  builtinCategories.forEach((category, i) => {
    const symbolCategory = div('fcitx-keyboard-symbol-category')
    symbolCategory.innerHTML = category.key
    handleClick(symbolCategory, () => {
      selectCategory(i)
    })
    symbolCategories.appendChild(symbolCategory)
  })

  symbolSelector.appendChild(symbolCategories)
  symbolSelector.appendChild(panel)
  return symbolSelector
}
