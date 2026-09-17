let locked = false

export function isSymbolLocked() {
  return locked
}

export function toggleSymbolLock() {
  locked = !locked
  return locked
}
