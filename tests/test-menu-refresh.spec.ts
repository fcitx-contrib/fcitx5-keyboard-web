import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getSentEvents, getToolbarButton, init, sendSystemEvent, tapReturn, touchDown, touchUp } from './util'

const errors = new WeakMap<Page, Error[]>()

function publishStatus(page: Page, inputContext = 'context', generation = 1, label = '旧状态选项', empty = false) {
  return sendSystemEvent(page, {
    type: 'STATUS_AREA',
    data: {
      inputContext,
      generation,
      actions: empty
        ? []
        : [
            {
              desc: '状态菜单',
              icon: '',
              id: -1,
              children: [
                { desc: label, icon: '', id: 11 },
              ],
            },
          ],
    },
  })
}

function publishInputMethods(page: Page, name = 'old', displayName = '旧输入法') {
  return sendSystemEvent(page, {
    type: 'INPUT_METHODS',
    data: {
      currentInputMethod: '',
      inputMethods: [
        { name, displayName },
      ],
    },
  })
}

async function openStatusMenu(page: Page) {
  await getToolbarButton(page, 6).tap()
  await page.locator('.fcitx-keyboard-status-area-circle').tap()
}

async function openInputMenu(page: Page) {
  const globe = page.locator('.fcitx-keyboard-globe')
  const id = await touchDown(globe)
  await page.clock.runFor(300)
  await touchUp(globe, id)
}

function menu(page: Page) {
  return page.locator('.fcitx-keyboard-contextmenu-container')
}

test.beforeEach(async ({ page }) => {
  const caught: Error[] = []
  errors.set(page, caught)
  page.on('pageerror', error => caught.push(error))
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
})

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})

for (const update of ['actions', 'empty', 'context'] as const) {
  test(`A status ${update} update dismisses its old menu and rejects a stale click`, async ({ page }) => {
    await publishStatus(page)
    await openStatusMenu(page)
    const old = await menu(page).getByText('旧状态选项', { exact: true }).elementHandle()
    const context = update === 'context'
      ? 'other-context'
      : 'context'
    await publishStatus(page, context, 2, '新状态选项', update === 'empty')
    const visibleAfterUpdate = await menu(page).isVisible()
    // A click may already be queued for the item that belonged to the old render.
    await old!.evaluate(element => (element as HTMLElement).click())
    expect({ visibleAfterUpdate, events: await getSentEvents(page) }).toEqual({ visibleAfterUpdate: false, events: [] })
    if (update !== 'empty') {
      await page.locator('.fcitx-keyboard-status-area-circle').tap()
      await menu(page).getByText('新状态选项', { exact: true }).tap()
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'STATUS_AREA_ACTION',
          data: { inputContext: context, generation: 2, id: 11 },
        },
      ])
    }
  })
}

for (const update of ['replace', 'empty', 'rename'] as const) {
  test(`An input-method ${update} update dismisses its old menu and rejects a stale click`, async ({ page }) => {
    await publishInputMethods(page)
    await openInputMenu(page)
    const old = await menu(page).getByText('旧输入法', { exact: true }).elementHandle()
    const name = update === 'rename'
      ? 'old'
      : 'new'
    await sendSystemEvent(page, {
      type: 'INPUT_METHODS',
      data: {
        currentInputMethod: '',
        inputMethods: update === 'empty'
          ? []
          : [
              { name, displayName: '新输入法' },
            ],
      },
    })
    const visibleAfterUpdate = await menu(page).isVisible()
    await old!.evaluate(element => (element as HTMLElement).click())
    expect({ visibleAfterUpdate, events: await getSentEvents(page) }).toEqual({ visibleAfterUpdate: false, events: [] })
    await openInputMenu(page)
    if (update === 'empty') {
      await expect(menu(page)).not.toBeVisible()
    }
    else {
      await menu(page).getByText('新输入法', { exact: true }).tap()
      expect(await getSentEvents(page)).toEqual([
        { type: 'SET_INPUT_METHOD', data: name },
      ])
    }
  })
}

test('Unchanged input-method options preserve an open menu when the selection updates', async ({ page }) => {
  await publishInputMethods(page)
  await openInputMenu(page)
  await sendSystemEvent(page, {
    type: 'INPUT_METHODS',
    data: {
      currentInputMethod: 'old',
      inputMethods: [
        { displayName: '旧输入法', name: 'old' },
      ],
    },
  })
  await expect(menu(page)).toBeVisible()
  await menu(page).getByText('旧输入法', { exact: true }).tap()
  expect(await getSentEvents(page)).toEqual([
    { type: 'SET_INPUT_METHOD', data: 'old' },
  ])
})

test('A status refresh preserves a later input-method menu', async ({ page }) => {
  await publishStatus(page)
  await openStatusMenu(page)
  await menu(page).dispatchEvent('touchstart', { touches: [], changedTouches: [] })
  await tapReturn(page)
  await publishInputMethods(page)
  await openInputMenu(page)
  await publishStatus(page, 'context', 2, '新状态选项')
  await expect(menu(page)).toBeVisible()
  await menu(page).getByText('旧输入法', { exact: true }).tap()
  expect(await getSentEvents(page)).toEqual([
    { type: 'SET_INPUT_METHOD', data: 'old' },
  ])
})

test('An input-method refresh preserves a later status menu', async ({ page }) => {
  await publishInputMethods(page)
  await openInputMenu(page)
  await menu(page).dispatchEvent('touchstart', { touches: [], changedTouches: [] })
  await publishStatus(page)
  await openStatusMenu(page)
  await publishInputMethods(page, 'new', '新输入法')
  await expect(menu(page)).toBeVisible()
  await menu(page).getByText('旧状态选项', { exact: true }).tap()
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'STATUS_AREA_ACTION',
      data: { inputContext: 'context', generation: 1, id: 11 },
    },
  ])
})
