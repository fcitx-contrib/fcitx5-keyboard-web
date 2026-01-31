import { div, enableScroll, handleClick, hide, press, release, show } from './util'

export function hideContextMenu() {
  hide(document.querySelector('.fcitx-keyboard-contextmenu-container')!)
}

export function renderContextmenu() {
  const container = div('fcitx-keyboard-contextmenu-container')
  const contextmenu = div('fcitx-keyboard-contextmenu')
  enableScroll(contextmenu)
  container.appendChild(contextmenu)
  container.addEventListener('touchstart', (event) => {
    // Don't hide if touching menu instead of outside.
    if (event.target && document.querySelector('.fcitx-keyboard-contextmenu')?.contains(event.target as Element)) {
      return
    }
    hideContextMenu()
  })
  return container
}

function renderItem(text: string) {
  const element = div('fcitx-keyboard-contextmenu-item')
  element.textContent = text
  element.addEventListener('touchstart', () => press(element))
  element.addEventListener('touchend', () => release(element))
  element.addEventListener('touchcancel', () => release(element))
  return element
}

export function showContextmenu(element: Element, items: {
  text: string
  separator?: boolean
  callback: () => void
}[]) {
  const contextmenu = document.querySelector('.fcitx-keyboard-contextmenu') as HTMLElement
  contextmenu.innerHTML = ''
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.separator) {
      if (i === 0 || i === items.length - 1 || items[i - 1].separator) {
        continue
      }
      contextmenu.appendChild(document.createElement('hr'))
    }
    else {
      const element = renderItem(item.text)
      handleClick(element, () => {
        item.callback()
        hideContextMenu()
      })
      contextmenu.appendChild(element)
    }
  }
  show(contextmenu.parentElement!)
  const containerBox = contextmenu.parentElement!.getBoundingClientRect()
  const menuBox = contextmenu.getBoundingClientRect()
  const targetBox = element.getBoundingClientRect()
  const containerYBar = (containerBox.top + containerBox.bottom) / 2
  const targetYBar = (targetBox.top + targetBox.bottom) / 2
  let y: number
  // First step: place it above or below the target element.
  if (targetYBar < containerYBar) {
    y = targetBox.bottom
  }
  else {
    y = targetBox.top - menuBox.height
  }
  // Next step: adjust the bottom position if it exceeds the container.
  if (y + menuBox.height > containerBox.bottom) {
    y = containerBox.bottom - menuBox.height
  }
  // Final step: adjust the top position if it exceeds the container.
  if (y < containerBox.top) {
    y = containerBox.top
  }
  const x = Math.min(targetBox.left, containerBox.right - menuBox.width)
  contextmenu.style.left = `${x}px`
  contextmenu.style.top = `${y}px`
}
