import FullWidth from 'bundle-text:../svg/full-width.svg'
import HalfWidth from 'bundle-text:../svg/half-width.svg'
import arrow from '../fcitx5-keyboard-layouts/symbol/arrow.json'
import bopomofo from '../fcitx5-keyboard-layouts/symbol/bopomofo.json'
import chinesePunctuation from '../fcitx5-keyboard-layouts/symbol/chinese_punctuation.json'
import common from '../fcitx5-keyboard-layouts/symbol/common.json'
import currency from '../fcitx5-keyboard-layouts/symbol/currency.json'
import cyrillic from '../fcitx5-keyboard-layouts/symbol/cyrillic.json'
import englishPunctuation from '../fcitx5-keyboard-layouts/symbol/english_punctuation.json'
import greek from '../fcitx5-keyboard-layouts/symbol/greek.json'
import hiragana from '../fcitx5-keyboard-layouts/symbol/hiragana.json'
import katakana from '../fcitx5-keyboard-layouts/symbol/katakana.json'
import latin from '../fcitx5-keyboard-layouts/symbol/latin.json'
import math from '../fcitx5-keyboard-layouts/symbol/math.json'
import phonetic from '../fcitx5-keyboard-layouts/symbol/phonetic.json'
import pinyin from '../fcitx5-keyboard-layouts/symbol/pinyin.json'
import radical from '../fcitx5-keyboard-layouts/symbol/radical.json'
import sequence from '../fcitx5-keyboard-layouts/symbol/sequence.json'
import shape from '../fcitx5-keyboard-layouts/symbol/shape.json'
import special from '../fcitx5-keyboard-layouts/symbol/special.json'
import superscriptSubscript from '../fcitx5-keyboard-layouts/symbol/superscript_subscript.json'
import unit from '../fcitx5-keyboard-layouts/symbol/unit.json'
import { popDisplayMode } from './display'
import { isSymbolLocked } from './symbolState'
import { div, enableScroll, handleClick, press, release } from './util'
import { sendEvent } from './ux'

interface SymbolCategory {
  key: string
  name: Record<string, string>
  symbols: string[]
  halfWidth?: string[]
  fullWidth?: string[]
}

const builtinCategories: SymbolCategory[] = [
  { key: 'chinese_punctuation', ...chinesePunctuation },
  { key: 'english_punctuation', ...englishPunctuation },
  { key: 'common', ...common },
  { key: 'math', ...math },
  { key: 'unit', ...unit },
  { key: 'currency', ...currency },
  { key: 'sequence', ...sequence },
  { key: 'superscript_subscript', ...superscriptSubscript },
  { key: 'arrow', ...arrow },
  { key: 'shape', ...shape },
  { key: 'special', ...special },
  { key: 'radical', ...radical },
  { key: 'pinyin', ...pinyin },
  { key: 'bopomofo', ...bopomofo },
  { key: 'phonetic', ...phonetic },
  { key: 'greek', ...greek },
  { key: 'latin', ...latin },
  { key: 'cyrillic', ...cyrillic },
  { key: 'hiragana', ...hiragana },
  { key: 'katakana', ...katakana },
]

function getCategoryName(category: SymbolCategory) {
  const locale = navigator.language.replaceAll('-', '_')
  const language = locale.split('_')[0]
  const locales = [locale]
  if (language === 'zh') {
    locales.push(/(?:^|_)(?:TW|HK|MO|Hant)(?:_|$)/i.test(locale) ? 'zh_TW' : 'zh_CN')
  }
  locales.push(language, 'en')
  for (const candidate of locales) {
    if (category.name[candidate]) {
      return category.name[candidate]
    }
  }
  return category.key
}

function getSymbolWidth(category: SymbolCategory, symbol: string) {
  if (category.halfWidth?.includes(symbol)) {
    return 'half'
  }
  if (category.fullWidth?.includes(symbol)) {
    return 'full'
  }
  return null
}

export function selectCategory(index: number) {
  const panel = document.querySelector('.fcitx-keyboard-symbol-panel') as HTMLElement
  panel.innerHTML = ''
  panel.scroll({ top: 0 })
  const symbolCategories = document.querySelectorAll('.fcitx-keyboard-symbol-category')
  builtinCategories.forEach((category, i) => {
    if (i === index) {
      for (const symbol of category.symbols) {
        const symbolItem = div('fcitx-keyboard-symbol-item')
        symbolItem.textContent = symbol
        const width = getSymbolWidth(category, symbol)
        if (width) {
          const badge = div('fcitx-keyboard-symbol-width')
          badge.classList.add(`fcitx-keyboard-symbol-${width}-width`)
          badge.innerHTML = width === 'half' ? HalfWidth : FullWidth
          badge.setAttribute('aria-hidden', 'true')
          symbolItem.appendChild(badge)
        }
        handleClick(symbolItem, () => {
          if (!isSymbolLocked()) {
            popDisplayMode()
          }
          sendEvent({ type: 'COMMIT', data: symbol })
        })
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
  enableScroll(symbolCategories)
  builtinCategories.forEach((category, i) => {
    const symbolCategory = div('fcitx-keyboard-symbol-category')
    symbolCategory.textContent = getCategoryName(category)
    symbolCategory.dataset.category = category.key
    handleClick(symbolCategory, () => {
      selectCategory(i)
    })
    symbolCategories.appendChild(symbolCategory)
  })

  symbolSelector.appendChild(symbolCategories)
  symbolSelector.appendChild(panel)
  return symbolSelector
}
