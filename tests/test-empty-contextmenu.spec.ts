import type { Page } from '@playwright/test'
import type { CandidateAction, StatusAreaAction } from '../src/api'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE } from '../src/api.d'
import { getSentEvents, getToolbarButton, init, sendSystemEvent, tap, touchDown, touchUp } from './util'

async function setCandidateActions(page: Page, actions: CandidateAction[]) {
  await sendSystemEvent(page, {
    type: 'CANDIDATE_ACTIONS',
    data: {
      inputContext: 'context',
      generation: 1,
      index: 0,
      actions,
    },
  })
}

async function setCandidates(page: Page) {
  await sendSystemEvent(page, {
    type: 'CANDIDATES',
    data: {
      inputContext: 'context',
      generation: 1,
      candidates: [
        { text: '候选', label: '', comment: '' },
      ],
      highlighted: -1,
      scrollState: SCROLL_NONE,
      scrollStart: false,
      scrollEnd: true,
      hasClientPreedit: true,
      tabActions: [],
    },
  })
}

test.beforeEach(async ({ page }) => {
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
})

for (const hasItems of [false, true]) {
  test(`Input-method menu only opens with items (has items: ${hasItems})`, async ({ page }) => {
    await sendSystemEvent(page, {
      type: 'INPUT_METHODS',
      data: {
        currentInputMethod: '',
        inputMethods: hasItems
          ? [
              { name: 'keyboard-us', displayName: 'English' },
            ]
          : [],
      },
    })
    const globe = page.locator('.fcitx-keyboard-globe')
    const id = await touchDown(globe)
    await page.clock.runFor(300)
    await touchUp(globe, id)
    const menu = page.locator('.fcitx-keyboard-contextmenu-container')
    if (hasItems) {
      await expect(menu).toBeVisible()
      await menu.getByText('English', { exact: true }).tap()
      expect(await getSentEvents(page)).toEqual([
        { type: 'SET_INPUT_METHOD', data: 'keyboard-us' },
      ])
    }
    else {
      await expect(menu).not.toBeVisible()
      await tap(page.getByText('k('))
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: { key: 'k', code: 'KeyK' },
        },
      ])
    }
  })

  test(`Candidate menu only opens with actions (has items: ${hasItems})`, async ({ page }) => {
    await setCandidates(page)
    await setCandidateActions(page, hasItems
      ? [
          { id: 1, text: '候选操作' },
        ]
      : [])
    const menu = page.locator('.fcitx-keyboard-contextmenu-container')
    if (hasItems) {
      await expect(menu).toBeVisible()
      await page.getByText('候选操作').tap()
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'CANDIDATE_ACTION',
          data: {
            inputContext: 'context',
            generation: 1,
            index: 0,
            id: 1,
          },
        },
      ])
    }
    else {
      await expect(menu).not.toBeVisible()
      await tap(page.getByText('k('))
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: { key: 'k', code: 'KeyK' },
        },
      ])
    }
  })
}

for (const contents of ['empty', 'separators', 'action'] as const) {
  test(`Status menu skips content with no rendered actions (${contents})`, async ({ page }) => {
    const separator: StatusAreaAction = {
      id: -1,
      desc: '',
      icon: '',
      separator: true,
    }
    const children = contents === 'empty'
      ? []
      : contents === 'separators'
        ? [separator, separator, separator]
        : [
            separator,
            { id: 2, desc: '状态操作', icon: '' },
            separator,
          ]
    await sendSystemEvent(page, {
      type: 'STATUS_AREA',
      data: {
        inputContext: 'context',
        generation: 1,
        actions: [
          {
            id: 1,
            desc: '状态',
            icon: '',
            children,
          },
        ],
      },
    })
    await getToolbarButton(page, 6).tap()
    await page.locator('.fcitx-keyboard-status-area-circle').tap()
    const menu = page.locator('.fcitx-keyboard-contextmenu-container')
    if (contents === 'action') {
      await expect(menu).toBeVisible()
      await expect(menu.locator('.fcitx-keyboard-contextmenu-item')).toHaveCount(1)
      await expect(menu.locator('hr')).toHaveCount(0)
      await page.getByText('状态操作').tap()
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'STATUS_AREA_ACTION',
          data: { inputContext: 'context', generation: 1, id: 2 },
        },
      ])
    }
    else {
      await expect(menu).not.toBeVisible()
      expect(await getSentEvents(page)).toEqual([])
    }
  })
}

test('An empty actions response closes the old menu and allows a later menu', async ({ page }) => {
  await setCandidates(page)
  await setCandidateActions(page, [
    { id: 1, text: '旧操作' },
  ])
  await expect(page.getByText('旧操作')).toBeVisible()
  await setCandidateActions(page, [])
  await expect(page.locator('.fcitx-keyboard-contextmenu-container')).not.toBeVisible()
  await setCandidateActions(page, [
    { id: 2, text: '新操作' },
  ])
  await page.getByText('新操作').tap()
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'CANDIDATE_ACTION',
      data: {
        inputContext: 'context',
        generation: 1,
        index: 0,
        id: 2,
      },
    },
  ])
})
