import type { LongPress, LongPressCell } from './layout'
import QuickPhrase from 'bundle-text:../svg/quickphrase.svg'
import Unicode from 'bundle-text:../svg/unicode.svg'
import { keyBottomPath, keyBounds, keyRadius, restoreKeyBackground, roundedKeyPath } from './keyBackground'
import { div, hide, show } from './util'

// See fcitx5-ios/uipanel/Bubble.swift
const SIDE_RATIO = 0.4
const SHADOW_RADIUS = 2
const CELL_WIDTH = 30

type BubblePosition = 'left' | 'middle' | 'right'

interface BubbleGeometry {
  columnGap: number
  height: number
  keyHeight: number
  keyLeft: number
  keyWidth: number
  keyTop: number
  left: number
  position: BubblePosition
  radius: number
  top: number
  width: number
}

let popoverSource: Element | null = null
let largeLabelGeometry: BubbleGeometry | null = null

function setPopoverSource(element: Element) {
  if (popoverSource === element) {
    return
  }
  if (popoverSource && popoverSource !== element) {
    restoreKeyBackground(popoverSource.querySelector('.fcitx-keyboard-key-background')!)
  }
  popoverSource?.classList.remove('fcitx-keyboard-popover-source')
  popoverSource = element
  element.classList.add('fcitx-keyboard-popover-source')
}

export function renderPopover() {
  return div('fcitx-keyboard-popover-container')
}

function getGeometry(element: Element, itemCount: number, index: number, singleTextItem: boolean): BubbleGeometry {
  const keyElement = element.querySelector('.fcitx-keyboard-key')!
  const keyBox = keyBounds(element.querySelector('.fcitx-keyboard-key-background')!)
  const cellBox = element.getBoundingClientRect()
  const keyboardBox = element.closest('.fcitx-keyboard-frame')!.getBoundingClientRect()
  const radius = keyRadius(keyElement)
  const rowGap = Math.max(0, cellBox.height - keyBox.height)
  const columnGap = Math.max(0, cellBox.width - keyBox.width)
  const height = 2 * keyBox.height + 1.5 * rowGap - SHADOW_RADIUS
  const side = SIDE_RATIO * keyBox.width
  const position: BubblePosition
    = keyBox.left - side < keyboardBox.left
      ? 'left'
      : keyBox.right + side > keyboardBox.right
        ? 'right'
        : 'middle'

  if (singleTextItem) {
    return {
      columnGap,
      height,
      keyHeight: keyBox.height,
      keyLeft: keyBox.left,
      keyWidth: keyBox.width,
      left: keyBox.left,
      position,
      radius,
      keyTop: keyBox.top,
      top: keyBox.bottom - height,
      width: keyBox.width,
    }
  }

  const width = (1 + 2 * SIDE_RATIO) * keyBox.width + (itemCount - 1) * CELL_WIDTH
  const itemOffset = ((itemCount - 1) / 2 - index) * CELL_WIDTH
  const edgeOffset = position === 'left' ? side : position === 'right' ? -side : 0

  return {
    columnGap,
    height,
    keyHeight: keyBox.height,
    keyLeft: keyBox.left,
    keyWidth: keyBox.width,
    left: keyBox.left + keyBox.width / 2 + itemOffset + edgeOffset - width / 2,
    position,
    radius,
    keyTop: keyBox.top,
    top: keyBox.bottom - height,
    width,
  }
}

function bubblePath(geometry: BubbleGeometry, itemCount: number, index: number) {
  const {
    columnGap: gap,
    height: h,
    keyHeight,
    position,
    radius: r,
    width: w,
  } = geometry
  const c = 2 * r
  // Draw in the resting key's SVG without moving its origin or scaling it.
  const left = 0
  const right = geometry.keyWidth
  const x = geometry.left - geometry.keyLeft
  const y = geometry.top - geometry.keyTop
  const bottom = keyHeight
  const leftArc = position !== 'left' && index > 0
  const rightArc = position !== 'right' && index < itemCount - 1
  const middle = h - keyHeight - gap
  const innerRadius = gap + r

  const commands = [
    `M ${x} ${y + c}`,
    `A ${c} ${c} 0 0 1 ${x + c} ${y}`,
    `L ${x + w - c} ${y}`,
    `A ${c} ${c} 0 0 1 ${x + w} ${y + c}`,
  ]

  if (rightArc) {
    commands.push(
      `L ${x + w} ${y + middle - c}`,
      `A ${c} ${c} 0 0 1 ${x + w - c} ${y + middle}`,
      `L ${right + innerRadius} ${y + middle}`,
      `A ${innerRadius} ${innerRadius} 0 0 0 ${right} ${y + middle + innerRadius}`,
    )
  }
  else {
    commands.push(
      `L ${x + w} ${y + h * 0.4}`,
      `C ${x + w} ${y + h * 0.55} ${right} ${y + h * 0.5} ${right} ${y + h * 0.65}`,
    )
  }

  commands.push(...keyBottomPath(left, right, bottom, r))

  if (leftArc) {
    commands.push(
      `L ${left} ${y + middle + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 0 0 ${left - innerRadius} ${y + middle}`,
      `L ${x + c} ${y + middle}`,
      `A ${c} ${c} 0 0 1 ${x} ${y + middle - c}`,
    )
  }
  else {
    commands.push(
      `L ${left} ${y + h * 0.65}`,
      `C ${left} ${y + h * 0.5} ${x} ${y + h * 0.55} ${x} ${y + h * 0.4}`,
    )
  }

  commands.push('Z')
  return commands.join(' ')
}

function updateBackground(element: Element, geometry: BubbleGeometry, itemCount: number, index: number, roundedRectangle: boolean) {
  setPopoverSource(element)
  const svg = element.querySelector('.fcitx-keyboard-key-background')!
  svg.classList.add('fcitx-keyboard-popover-background')
  const path = roundedRectangle
    ? roundedKeyPath(0, geometry.keyHeight - geometry.height, geometry.keyWidth, geometry.height, geometry.radius)
    : bubblePath(geometry, itemCount, index)
  svg.querySelector('path')!.setAttribute('d', path)
}

function renderContent(cell: LongPressCell, popover: HTMLElement) {
  if (cell.type === 'unicode') {
    popover.innerHTML = Unicode
  }
  else if (cell.type === 'quickphrase') {
    popover.innerHTML = QuickPhrase
  }
  else {
    popover.textContent = cell.label ?? ''
  }
}

function positionContainer(container: HTMLElement, geometry: BubbleGeometry) {
  const bottom = geometry.top + geometry.height
  container.style.left = `${geometry.left}px`
  container.style.top = `${geometry.top}px`
  container.style.width = `${geometry.width}px`
  container.style.height = `${geometry.height}px`
  container.dataset.position = geometry.position
  show(container)
  const box = container.getBoundingClientRect()
  geometry.left = box.left
  geometry.top = box.top
  geometry.width = box.width
  geometry.height = bottom - box.top
}

function addLargeLabel(container: HTMLElement, label: string, geometry: BubbleGeometry) {
  const cell = div('fcitx-keyboard-popover-cell')
  const popover = div('fcitx-keyboard-popover')
  cell.classList.add('fcitx-keyboard-popover-large-label')
  popover.textContent = label
  popover.style.fontSize = `${geometry.height * 0.4}px`
  cell.appendChild(popover)
  container.appendChild(cell)
}

function showLargeLabel(element: Element, label: string) {
  const container = document.querySelector('.fcitx-keyboard-popover-container') as HTMLElement
  const geometry = getGeometry(element, 1, 0, false)
  if (popoverSource === element && largeLabelGeometry
    && Object.entries(geometry).every(([key, value]) => largeLabelGeometry![key as keyof BubbleGeometry] === value)) {
    // Click preview and swipe-up share a silhouette. Keep the SVG, source class,
    // and label element in place; repeated move events need no DOM changes.
    const popover = container.querySelector('.fcitx-keyboard-popover')!
    if (popover.textContent !== label) {
      popover.textContent = label
    }
    return
  }
  largeLabelGeometry = { ...geometry }
  positionContainer(container, geometry)
  container.replaceChildren()
  updateBackground(element, geometry, 1, 0, false)
  container.classList.remove('fcitx-keyboard-popover-items')
  container.classList.add('fcitx-keyboard-popover-label')
  addLargeLabel(container, label, geometry)
}

export function showKeyPreview(element: Element, label: string) {
  if (element.closest('.fcitx-keyboard-numpad')) {
    return
  }
  showLargeLabel(element, label)
}

export function showPopover(element: Element, display: string | LongPress) {
  if (element.closest('.fcitx-keyboard-numpad')) {
    return
  }
  if (typeof display === 'string') {
    showLargeLabel(element, display)
    return
  }

  const container = document.querySelector('.fcitx-keyboard-popover-container') as HTMLElement
  largeLabelGeometry = null
  const { cells, index } = display
  const singleTextItem = cells.length === 1 && cells[0].type === undefined
  const geometry = getGeometry(element, cells.length, index, singleTextItem)
  positionContainer(container, geometry)
  container.replaceChildren()
  updateBackground(element, geometry, cells.length, index, singleTextItem)
  container.classList.remove('fcitx-keyboard-popover-label')
  container.classList.add('fcitx-keyboard-popover-items')

  const rowWidth = singleTextItem ? geometry.width : cells.length * CELL_WIDTH
  const rowLeft = (geometry.width - rowWidth) / 2
  for (let i = 0; i < cells.length; ++i) {
    const cell = div('fcitx-keyboard-popover-cell')
    const popover = div('fcitx-keyboard-popover')
    if (!singleTextItem && i === index) {
      cell.classList.add('fcitx-keyboard-highlighted')
    }
    renderContent(cells[i], popover)
    popover.style.fontSize = `${geometry.height * 0.25}px`
    cell.style.left = `${rowLeft + (singleTextItem ? 0 : i * CELL_WIDTH)}px`
    cell.style.width = `${singleTextItem ? geometry.width : CELL_WIDTH}px`
    cell.appendChild(popover)
    container.appendChild(cell)
  }
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
  largeLabelGeometry = null
  if (popoverSource) {
    restoreKeyBackground(popoverSource.querySelector('.fcitx-keyboard-key-background')!)
  }
  popoverSource?.classList.remove('fcitx-keyboard-popover-source')
  popoverSource = null
  hide(document.querySelector('.fcitx-keyboard-popover-container')!)
}
