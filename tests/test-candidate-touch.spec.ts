import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { SCROLLING } from '../src/api.d'
import { getSentEvents, init, sendSystemEvent, tap, touchDown, touchMove, touchUp, touchUpTogether } from './util'

function publishCandidates(page: Page, append = false, generation = 1, inputContext = 'context') {
  return sendSystemEvent(page, {
    type: 'CANDIDATES',
    data: {
      inputContext,
      generation,
      candidates: (append
        ? ['三']
        : ['一', '二']).map(text => ({ text, label: '', comment: '' })),
      highlighted: -1,
      scrollState: SCROLLING,
      scrollStart: !append,
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
  await publishCandidates(page)
})

function publishActions(page: Page, generation = 1, inputContext = 'context', text = '旧候选菜单') {
  return sendSystemEvent(page, {
    type: 'CANDIDATE_ACTIONS',
    data: {
      inputContext,
      generation,
      index: 0,
      actions: [
        { id: 1, text },
      ],
    },
  })
}

async function holdCandidateMenu(page: Page) {
  const candidate = page.locator('.fcitx-keyboard-candidate').first()
  const id = await touchDown(candidate)
  await page.clock.runFor(300)
  await publishActions(page)
  await expect(page.getByText('旧候选菜单')).toBeVisible()
  return { candidate, id }
}

for (const refresh of [
  'replace',
  'generation',
  'context',
  'append',
] as const) {
  test(`Candidate ${refresh} refresh dismisses a menu while its touch is still held`, async ({ page }) => {
    const { candidate, id } = await holdCandidateMenu(page)
    const generation = refresh === 'generation'
      ? 2
      : 1
    const inputContext = refresh === 'context'
      ? 'other-context'
      : 'context'
    await publishCandidates(page, refresh === 'append', generation, inputContext)
    await expect(page.getByText('旧候选菜单')).not.toBeVisible()
    await touchUp(candidate, id)
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'ASK_CANDIDATE_ACTIONS',
        data: { inputContext: 'context', generation: 1, index: 0 },
      },
    ])
    if (refresh === 'generation' || refresh === 'context') {
      await publishActions(page)
      await expect(page.getByText('旧候选菜单')).not.toBeVisible()
    }
    const newId = await touchDown(candidate)
    await page.clock.runFor(300)
    await publishActions(page, generation, inputContext, '新候选菜单')
    await touchUp(candidate, newId)
    await page.getByText('新候选菜单').tap()
    expect((await getSentEvents(page)).at(-1)).toEqual({
      type: 'CANDIDATE_ACTION',
      data: {
        inputContext,
        generation,
        index: 0,
        id: 1,
      },
    })
    await expect(page.getByText('新候选菜单')).not.toBeVisible()
  })
}

test('A stale candidate menu item cannot execute after candidates refresh', async ({ page }) => {
  const { candidate, id } = await holdCandidateMenu(page)
  const oldItem = (await page.getByText('旧候选菜单').elementHandle())!
  await touchUp(candidate, id)
  await publishCandidates(page)
  await publishActions(page, 1, 'context', '新候选菜单')
  await oldItem.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const touch = new Touch({
      identifier: 99,
      target: element,
      clientX: box.left,
      clientY: box.top,
    })
    element.dispatchEvent(new TouchEvent('touchstart', {
      touches: [touch],
      changedTouches: [touch],
      bubbles: true,
    }))
    element.dispatchEvent(new TouchEvent('touchend', {
      touches: [],
      changedTouches: [touch],
      bubbles: true,
    }))
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect((await getSentEvents(page)).filter(event => event.type === 'CANDIDATE_ACTION')).toEqual([])
  await expect(page.getByText('新候选菜单')).toBeVisible()
  await page.getByText('新候选菜单').tap()
  expect((await getSentEvents(page)).filter(event => event.type === 'CANDIDATE_ACTION')).toHaveLength(1)
})

test('Candidate refresh keeps a later input-method menu open', async ({ page }) => {
  const { candidate, id } = await holdCandidateMenu(page)
  await touchUp(candidate, id)
  await page.locator('.fcitx-keyboard-contextmenu-container').dispatchEvent('touchstart')
  await sendSystemEvent(page, {
    type: 'INPUT_METHODS',
    data: {
      currentInputMethod: 'first',
      inputMethods: [
        { name: 'second', displayName: '切换输入法' },
      ],
    },
  })
  const globe = page.locator('.fcitx-keyboard-globe')
  const globeId = await touchDown(globe)
  await page.clock.runFor(300)
  await expect(page.getByText('切换输入法')).toBeVisible()
  await publishCandidates(page, false, 2)
  await expect(page.getByText('切换输入法')).toBeVisible()
  await touchUp(globe, globeId)
  await page.getByText('切换输入法').tap()
  expect((await getSentEvents(page)).at(-1)).toEqual({ type: 'SET_INPUT_METHOD', data: 'second' })
})

test('Candidate touchcancel clears the press and pending long press', async ({ page }) => {
  const candidate = page.locator('.fcitx-keyboard-candidate').first()
  const id = await touchDown(candidate)
  await page.clock.runFor(299)
  await touchUp(candidate, id, true)
  await expect(candidate).not.toContainClass('fcitx-keyboard-pressed')
  await page.clock.runFor(1000)
  expect(await getSentEvents(page)).toEqual([])
  await tap(candidate)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'SELECT_CANDIDATE',
      data: { inputContext: 'context', generation: 1, index: 0 },
    },
  ])
})

for (const type of ['CLEAR', 'HIDE'] as const) {
  test(`Candidate ${type} clears only its own pending press`, async ({ page }) => {
    const candidate = page.locator('.fcitx-keyboard-candidate').first()
    const id = await touchDown(candidate)
    await page.clock.runFor(299)
    await sendSystemEvent(page, { type })
    await expect(candidate).not.toContainClass('fcitx-keyboard-pressed')
    await page.clock.runFor(1000)
    await touchUp(candidate, id)
    expect(await getSentEvents(page)).toEqual([])
    await publishCandidates(page, false, 2)
    await tap(candidate)
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'SELECT_CANDIDATE',
        data: { inputContext: 'context', generation: 2, index: 0 },
      },
    ])
  })
}

test('Appending candidates releases an existing candidate press', async ({ page }) => {
  const candidate = page.locator('.fcitx-keyboard-candidate').first()
  const id = await touchDown(candidate)
  await page.clock.runFor(150)
  await publishCandidates(page, true)
  await expect(page.locator('.fcitx-keyboard-candidate')).toHaveCount(3)
  await expect(candidate).not.toContainClass('fcitx-keyboard-pressed')
  await page.clock.runFor(300)
  await touchUp(candidate, id)
  expect(await getSentEvents(page)).toEqual([])
  await tap(candidate)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'SELECT_CANDIDATE',
      data: { inputContext: 'context', generation: 1, index: 0 },
    },
  ])
})

test('Canceling an older candidate touch leaves the current press active', async ({ page }) => {
  const candidates = page.locator('.fcitx-keyboard-candidate')
  const first = candidates.nth(0)
  const second = candidates.nth(1)
  const oldId = await touchDown(first)
  const currentId = await touchDown(second)
  await expect(first).not.toContainClass('fcitx-keyboard-pressed')
  await touchUp(first, oldId, true)
  await expect(second).toContainClass('fcitx-keyboard-pressed')
  await page.clock.runFor(300)
  await touchUp(second, currentId)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'ASK_CANDIDATE_ACTIONS',
      data: { inputContext: 'context', generation: 1, index: 1 },
    },
  ])
  await expect(second).not.toContainClass('fcitx-keyboard-pressed')
})

for (const ownerFirst of [false, true]) {
  test(`Candidate batched endings find the active touch (owner first: ${ownerFirst})`, async ({ page }) => {
    const candidate = page.locator('.fcitx-keyboard-candidate').first()
    const oldId = await touchDown(candidate)
    const currentId = await touchDown(candidate)
    await touchUpTogether(candidate, ownerFirst
      ? [currentId, oldId]
      : [oldId, currentId])
    await page.clock.runFor(300)
    await expect(candidate).not.toContainClass('fcitx-keyboard-pressed')
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'SELECT_CANDIDATE',
        data: { inputContext: 'context', generation: 1, index: 0 },
      },
    ])
  })
}

for (const dx of [3, 4]) {
  test(`Candidate movement ${dx}px preserves the existing drag threshold`, async ({ page }) => {
    const candidate = page.locator('.fcitx-keyboard-candidate').first()
    const id = await touchDown(candidate)
    await touchMove(candidate, id, dx, 0)
    if (dx === 3) {
      await expect(candidate).toContainClass('fcitx-keyboard-pressed')
    }
    else {
      await expect(candidate).not.toContainClass('fcitx-keyboard-pressed')
    }
    await page.clock.runFor(300)
    await touchUp(candidate, id)
    expect(await getSentEvents(page)).toEqual(dx === 3
      ? [
          {
            type: 'ASK_CANDIDATE_ACTIONS',
            data: { inputContext: 'context', generation: 1, index: 0 },
          },
        ]
      : [])
  })
}

test('Candidate long press still requests actions once at 300ms without selecting', async ({ page }) => {
  const candidate = page.locator('.fcitx-keyboard-candidate').first()
  const id = await touchDown(candidate)
  await page.clock.runFor(299)
  expect(await getSentEvents(page)).toEqual([])
  await page.clock.runFor(1)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'ASK_CANDIDATE_ACTIONS',
      data: { inputContext: 'context', generation: 1, index: 0 },
    },
  ])
  await page.clock.runFor(1000)
  await touchUp(candidate, id)
  await expect(candidate).not.toContainClass('fcitx-keyboard-pressed')
  expect(await getSentEvents(page)).toHaveLength(1)
})

test('Candidate CLEAR leaves active keyboard backspace repeat running', async ({ page }) => {
  const backspace = page.locator('.fcitx-keyboard .fcitx-keyboard-backspace')
  const id = await touchDown(backspace)
  await page.clock.runFor(380)
  await sendSystemEvent(page, { type: 'CLEAR' })
  await page.clock.runFor(80)
  await touchUp(backspace, id)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'Backspace' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'Backspace' },
    },
  ])
})
