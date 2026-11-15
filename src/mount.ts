let mountedContainer: HTMLElement | null = null
let cleanup: (() => void) | null = null
let observer: MutationObserver | null = null

export function unmountKeyboard() {
  const cancel = cleanup
  cleanup = null
  mountedContainer = null
  observer?.disconnect()
  observer = null
  cancel?.()
}

export function isKeyboardMounted(container?: HTMLElement) {
  if (container && container !== mountedContainer) {
    return false
  }
  if (!mountedContainer?.isConnected) {
    unmountKeyboard()
    return false
  }
  return true
}

export function mountKeyboard(container: HTMLElement, onUnmount: () => void) {
  mountedContainer = container
  cleanup = onUnmount
  observer = new MutationObserver(() => {
    isKeyboardMounted(container)
  })
  observer.observe(document, { childList: true, subtree: true })
  // A removed tree may still receive its final events, or be reinserted later.
  // Its old handlers must never operate on a newly initialized keyboard.
  for (const type of [
    'touchstart',
    'touchmove',
    'touchend',
    'touchcancel',
    'click',
    'scroll',
  ]) {
    container.addEventListener(type, (event) => {
      if (!isKeyboardMounted(container)) {
        event.stopImmediatePropagation()
      }
    }, { capture: true })
  }
}
