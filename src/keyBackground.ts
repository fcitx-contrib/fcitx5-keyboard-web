const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
export const BUBBLE_SHADOW_RADIUS = 2
let nextBackgroundId = 0

export function keyRadius(key: Element) {
  const scale = window.devicePixelRatio
  return Math.round(Number.parseFloat(getComputedStyle(key).borderTopLeftRadius) * scale) / scale
}

export function keyBounds(svg: SVGSVGElement) {
  const box = svg.getBoundingClientRect()
  const scale = window.devicePixelRatio
  const width = Math.round(box.width * scale) / scale
  const height = Math.round(box.height * scale) / scale
  return { left: box.left, top: box.top, width, height, right: box.left + width, bottom: box.top + height }
}

// Shared by the resting key and the bubble, in the key's local coordinates.
export function keyBottomPath(left: number, right: number, bottom: number, radius: number) {
  return [
    `L ${right} ${bottom - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
    `L ${left + radius} ${bottom}`,
    `A ${radius} ${radius} 0 0 1 ${left} ${bottom - radius}`,
  ]
}

export function roundedKeyPath(left: number, top: number, width: number, height: number, radius: number) {
  const right = left + width
  return [
    `M ${left} ${top + radius}`,
    `A ${radius} ${radius} 0 0 1 ${left + radius} ${top}`,
    `L ${right - radius} ${top}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${top + radius}`,
    ...keyBottomPath(left, right, top + height, radius),
    'Z',
  ].join(' ')
}

export function restoreKeyBackground(svg: SVGSVGElement) {
  // Align both states to device pixels to keep the lower outline stable when
  // the upper contour changes.
  svg.style.translate = 'none'
  const box = svg.getBoundingClientRect()
  const scale = window.devicePixelRatio
  svg.style.translate = `${Math.round(box.x * scale) / scale - box.x}px ${Math.round(box.y * scale) / scale - box.y}px`
  const key = svg.parentElement!.querySelector('.fcitx-keyboard-key')!
  const radius = keyRadius(key)
  const { width, height } = keyBounds(svg)
  const shadowOffset = Math.round(svg.parentElement!.getBoundingClientRect().height * 0.02 * scale) / scale // 2cqh
  const shadow = svg.querySelector('use')!
  shadow.setAttribute('y', shadowOffset.toString())
  shadow.removeAttribute('filter')
  svg.classList.remove('fcitx-keyboard-popover-background')
  svg.querySelector('path')!.setAttribute('d', width && height ? roundedKeyPath(0, 0, width, height, radius) : '')
}

export function renderKeyBackground(functionKey: boolean) {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
  svg.classList.add('fcitx-keyboard-key-background')
  if (functionKey) {
    svg.classList.add('fcitx-keyboard-function-key-background')
  }
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(SVG_NAMESPACE, 'path')
  path.id = `fcitx-keyboard-key-background-${nextBackgroundId++}`
  const defs = document.createElementNS(SVG_NAMESPACE, 'defs')
  const filter = document.createElementNS(SVG_NAMESPACE, 'filter')
  filter.id = `${path.id}-shadow`
  filter.setAttribute('filterUnits', 'userSpaceOnUse')
  filter.setAttribute('color-interpolation-filters', 'sRGB')
  const blur = document.createElementNS(SVG_NAMESPACE, 'feGaussianBlur')
  blur.setAttribute('stdDeviation', BUBBLE_SHADOW_RADIUS.toString())
  filter.appendChild(blur)
  defs.appendChild(filter)
  // Reuse the silhouette; only bubbles enable the soft-shadow filter.
  const shadow = document.createElementNS(SVG_NAMESPACE, 'use')
  shadow.classList.add('fcitx-keyboard-key-shadow')
  shadow.setAttribute('href', `#${path.id}`)
  svg.append(defs, shadow, path)
  return svg
}

let resizeObserver: ResizeObserver | undefined

export function observeKeyBackgrounds(container: Element) {
  // Layers replace their keys. Release the old targets rather than retaining
  // detached SVGs, and observe the numpad as well as the current layout.
  resizeObserver ??= new ResizeObserver((entries) => {
    for (const { target } of entries) {
      if (!target.classList.contains('fcitx-keyboard-popover-background')) {
        restoreKeyBackground(target as SVGSVGElement)
      }
    }
  })
  resizeObserver.disconnect()
  for (const svg of container.querySelectorAll<SVGSVGElement>('.fcitx-keyboard-key-background')) {
    restoreKeyBackground(svg)
    resizeObserver.observe(svg)
  }
}
