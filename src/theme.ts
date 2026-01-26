import { DARK, LIGHT, SYSTEM } from './constant'
import { getKeyboardContainer } from './selector'

let isSystemDark = false
let followSystemTheme = true

function setLightTheme() {
  const container = getKeyboardContainer()
  container.classList.remove('fcitx-dark')
  container.classList.add('fcitx-light')
}

function setDarkTheme() {
  const container = getKeyboardContainer()
  container.classList.remove('fcitx-light')
  container.classList.add('fcitx-dark')
}

function systemThemeHandler() {
  if (isSystemDark) {
    setDarkTheme()
  }
  else {
    setLightTheme()
  }
}

(() => {
  if (typeof window === 'undefined') { // worker
    return
  }

  const darkMQL = window.matchMedia('(prefers-color-scheme: dark)')
  isSystemDark = darkMQL.matches

  darkMQL.addEventListener('change', (event) => {
    isSystemDark = event.matches
    if (followSystemTheme) {
      systemThemeHandler()
    }
  })
})()

export function setTheme(theme: typeof SYSTEM | typeof LIGHT | typeof DARK) {
  switch (theme) {
    case SYSTEM:
      followSystemTheme = true
      systemThemeHandler()
      break
    case LIGHT:
      followSystemTheme = false
      setLightTheme()
      break
    case DARK:
      followSystemTheme = false
      setDarkTheme()
      break
  }
}
