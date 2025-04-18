import { div, hide, show } from './util'

export function renderPopover() {
  const container = div('fcitx-keyboard-popover-container')
  const element = div('fcitx-keyboard-popover')
  container.appendChild(element)
  return container
}

export function showPopover(element: Element, text: string) {
  const popover = document.querySelector('.fcitx-keyboard-popover') as HTMLElement
  popover.innerHTML = text
  const container = popover.parentElement!
  const box = element.getBoundingClientRect()
  container.style.left = `${box.left}px`
  container.style.top = `${box.top - box.height}px`
  container.style.minWidth = `${box.width}px`
  container.style.height = `${box.height}px`
  show(container)
}

export function hidePopover() {
  hide(document.querySelector('.fcitx-keyboard-popover-container')!)
}
