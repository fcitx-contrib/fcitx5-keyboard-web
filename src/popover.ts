import type { LongPress } from './layout'
import { div, hide, show } from './util'

export function renderPopover() {
  return div('fcitx-keyboard-popover-container')
}

export function showPopover(element: Element, display: string | LongPress) {
  const container = document.querySelector('.fcitx-keyboard-popover-container') as HTMLElement
  const box = element.getBoundingClientRect()
  container.innerHTML = ''
  let index = -1
  let labels: string[]
  if (typeof display === 'string') {
    labels = [display]
  }
  else {
    labels = display.cells.map(cell => cell.label)
    index = display.index
  }
  for (let i = 0; i < labels.length; ++i) {
    const cell = div('fcitx-keyboard-popover-cell')
    const popover = div('fcitx-keyboard-popover')
    if (i === index) {
      cell.classList.add('fcitx-keyboard-highlighted')
    }
    popover.innerHTML = labels[i]
    cell.appendChild(popover)
    cell.style.width = `${box.width}px`
    cell.style.height = `${box.height}px`
    container.appendChild(cell)
  }
  show(container)
  let offset = 0
  if (index !== -1) {
    const containerBox = container.getBoundingClientRect()
    const highlightedBox = container.querySelector('.fcitx-keyboard-highlighted')!.getBoundingClientRect()
    offset = containerBox.left - highlightedBox.left
  }
  container.style.left = `${box.left + offset}px`
  container.style.top = `${box.top - box.height}px`
  container.style.borderRadius = `${box.height * 0.07}px`
}

export function updateHighlight(index: number, direction: 'LEFT' | 'RIGHT') {
  const cells = document.querySelectorAll('.fcitx-keyboard-popover-cell')
  const newIndex = direction === 'LEFT' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= cells.length) {
    return index
  }
  cells[index].classList.remove('fcitx-keyboard-highlighted')
  cells[newIndex].classList.add('fcitx-keyboard-highlighted')
  return newIndex
}

export function hidePopover() {
  hide(document.querySelector('.fcitx-keyboard-popover-container')!)
}
