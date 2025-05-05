import { div, hide, press, release, show } from './util'

export function hideContextMenu() {
  hide(document.querySelector('.fcitx-keyboard-contextmenu-container')!)
}

export function renderContextmenu() {
  const container = div('fcitx-keyboard-contextmenu-container')
  const contextmenu = div('fcitx-keyboard-contextmenu')
  container.appendChild(contextmenu)
  container.addEventListener('touchstart', () => {
    hideContextMenu()
  })
  return container
}

function renderItem(text: string) {
  const element = div('fcitx-keyboard-contextmenu-item')
  element.innerHTML = text
  element.addEventListener('touchstart', (e) => {
    e.stopPropagation() // Stop mask's handler from hiding it.
    press(element)
  })
  element.addEventListener('touchend', () => release(element))
  element.addEventListener('touchcancel', () => release(element))
  return element
}

export function showContextmenu(element: Element, items: {
  text: string
  callback: () => void
}[]) {
  const contextmenu = document.querySelector('.fcitx-keyboard-contextmenu') as HTMLElement
  contextmenu.innerHTML = ''
  for (const item of items) {
    const element = renderItem(item.text)
    element.addEventListener('click', () => {
      item.callback()
      hideContextMenu()
    })
    contextmenu.appendChild(element)
  }
  show(contextmenu.parentElement!)
  const containerBox = contextmenu.parentElement!.getBoundingClientRect()
  const menuBox = contextmenu.getBoundingClientRect()
  const targetBox = element.getBoundingClientRect()
  const containerYBar = (containerBox.top + containerBox.bottom) / 2
  const targetYBar = (targetBox.top + targetBox.bottom) / 2
  let y: number
  if (targetYBar < containerYBar) {
    y = targetBox.bottom
  }
  else {
    y = targetBox.top - menuBox.height
  }
  const x = Math.min(targetBox.left, containerBox.right - menuBox.width)
  contextmenu.style.left = `${x}px`
  contextmenu.style.top = `${y}px`
}
