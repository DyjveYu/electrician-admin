import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, h, nextTick } from 'vue'
import { useElectricianProfileDetail } from '../src/composables/useElectricianProfileDetail.js'
import { profileTime } from '../src/utils/electricianProfileNotice.js'

const renderer = createRenderer({
  createElement: type => ({ type, children: [] }), createText: text => ({ text }), createComment: () => ({}),
  insert: (node, parent) => { parent.children ||= []; if (!parent.children.includes(node)) parent.children.push(node) },
  remove: () => {}, setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text },
  parentNode: () => null, nextSibling: () => null, patchProp: () => {}
})
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const fixture = (id, version = 2, pending = true) => ({ code: 200, data: { id, profileNoticePending: pending,
  profileNoticeVersion: version, profileChangeType: 'information_changed' } })
function mount(overrides = {}, onViewed) {
  let auth = 'admin-a', model
  globalThis.localStorage = { getItem: () => auth }
  globalThis.window = new EventTarget()
  const reads = [], root = { children: [] }
  const api = { getElectricianDetail: async id => fixture(id), markElectricianProfileViewed: async (id, version) => {
    reads.push({ id, version, displayed: root.children[0]?.text }); return { code: 200 }
  }, ...overrides }
  const app = renderer.createApp({ setup() { model = useElectricianProfileDetail(api, onViewed); return () => h('div', String(model.detail.value?.id || '')) } })
  app.mount(root)
  return { model, api, reads, root, unmount: () => app.unmount(), changeAuth: value => { auth = value } }
}

test('a successful detail confirms only after its snapshot has rendered', async () => {
  let refreshes = 0
  const view = mount({}, () => { refreshes++ })
  try {
    await view.model.load(5)
    assert.deepEqual(view.reads, [{ id: 5, version: 2, displayed: '5' }])
    assert.equal(view.model.detail.value.profileNoticePending, false)
    assert.equal(refreshes, 1)
  } finally { view.unmount() }
})
test('a failed detail never confirms a list fallback', async () => {
  const view = mount({ getElectricianDetail: async () => { throw new Error('offline') } })
  try { await view.model.load(5); assert.equal(view.reads.length, 0); assert.equal(view.model.detail.value, null); assert(view.model.error.value) }
  finally { view.unmount() }
})
test('a confirmation failure keeps the notice and allows retry', async () => {
  let attempts = 0
  const view = mount({ markElectricianProfileViewed: async () => { if (!attempts++) throw new Error('offline'); return { code: 200 } } })
  try {
    await view.model.load(5)
    assert(view.model.readError.value); assert(view.model.detail.value.profileNoticePending)
    await view.model.confirmViewed()
    assert.equal(view.model.readError.value, false); assert.equal(view.model.detail.value.profileNoticePending, false)
    assert.equal(attempts, 2)
  } finally { view.unmount() }
})
test('a slower old object response cannot display or confirm after switching objects', async () => {
  const slow = deferred()
  const view = mount({ getElectricianDetail: id => id === 1 ? slow.promise : Promise.resolve(fixture(id)) })
  try {
    const old = view.model.load(1)
    await view.model.load(2)
    slow.resolve(fixture(1)); await old
    assert.equal(view.model.detail.value.id, 2)
    assert.deepEqual(view.reads.map(x => x.id), [2])
  } finally { view.unmount() }
})
test('closing before a detail response prevents any confirmation', async () => {
  const slow = deferred(), view = mount({ getElectricianDetail: () => slow.promise })
  try {
    const pending = view.model.load(1); view.model.visible.value = false
    slow.resolve(fixture(1)); await pending; await nextTick()
    assert.equal(view.reads.length, 0); assert.equal(view.model.detail.value, null)
  } finally { view.unmount() }
})
test('unmounting or changing the login token invalidates unfinished reads', async () => {
  for (const change of ['unmount', 'auth']) {
    const slow = deferred(), view = mount({ getElectricianDetail: () => slow.promise })
    const pending = view.model.load(1)
    if (change === 'unmount') view.unmount(); else view.changeAuth('admin-b')
    slow.resolve(fixture(1)); await pending
    assert.equal(view.reads.length, 0)
    if (change === 'auth') view.unmount()
  }
})
test('a new server version remains separate from the already displayed snapshot', async () => {
  let requested, latestPending = false
  const view = mount({ markElectricianProfileViewed: async (id, version) => {
    requested = version; latestPending = true
    return { code: 200, data: { profileNoticeVersion: 3, profileNoticePending: true } }
  } }, () => { assert(latestPending) })
  try {
    await view.model.load(5)
    assert.equal(requested, 2); assert.equal(view.model.detail.value.profileNoticeVersion, 2)
    assert.equal(view.model.detail.value.profileNoticePending, false); assert(latestPending)
  } finally { view.unmount() }
})
test('a late confirmation failure cannot set errors on a newer object', async () => {
  const slow = deferred()
  const view = mount({ markElectricianProfileViewed: id => id === 1 ? slow.promise : Promise.resolve({ code: 200 }) })
  try {
    const old = view.model.load(1); await nextTick(); await nextTick()
    await view.model.load(2)
    slow.reject(new Error('old request')); await old
    assert.equal(view.model.detail.value.id, 2); assert.equal(view.model.readError.value, false)
  } finally { view.unmount() }
})
test('history already viewed never confirms and profile time is Beijing time to the second', async () => {
  const view = mount({ getElectricianDetail: async id => fixture(id, 0, false) })
  try { await view.model.load(5); assert.equal(view.reads.length, 0) } finally { view.unmount() }
  assert.match(profileTime('2026-11-14T23:02:03Z'), /2026.*11.*15.*07:02:03/)
  assert.equal(profileTime(null), '—')
})
