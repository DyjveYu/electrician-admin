import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, h } from 'vue'
import { useTestOpenidEditor } from '../src/composables/useTestOpenidEditor.js'
const renderer = createRenderer({ createElement: type => ({ type, children: [] }), createText: text => ({ text }), createComment: () => ({}),
  insert: (node, parent) => { parent.children ||= []; parent.children.push(node) }, remove() {}, setText() {}, setElementText() {},
  parentNode: () => null, nextSibling: () => null, patchProp() {} })
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const detail = (id, openid = 'old') => ({ code: 200, data: { id, openid } })
function mount(overrides = {}, onSaved = async () => true) {
  let token = 'admin-a', allowed = true, model
  globalThis.localStorage = { getItem: () => token }
  const writes = [], api = { getUserDetail: async id => detail(id), updateTestOpenid: async (id, body) => {
    writes.push({ id, ...body }); return detail(id, body.openid === '' ? null : body.openid)
  }, ...overrides }
  const app = renderer.createApp({ setup() { model = useTestOpenidEditor(api, () => allowed, onSaved); return () => h('div') } })
  app.mount({ children: [] })
  return { model, writes, close: () => app.unmount(), auth: () => { token = 'admin-b' }, forbid: () => { allowed = false } }
}
test('saves exact input and raw expected value; next edit works after successful close', async () => {
  const v = mount()
  try {
    await v.model.load(42); v.model.value.value = ' raw non-WeChat value '
    await v.model.save(); assert.deepEqual(v.writes, [{ id: 42, openid: ' raw non-WeChat value ', expectedOpenid: 'old' }])
    assert.equal(v.model.visible.value, false); assert.equal(v.model.saving.value, false)
    await v.model.load(43); v.model.value.value = ''; await v.model.save()
    assert.equal(v.writes[1].id, 43); assert.equal(v.writes[1].openid, '')
  } finally { v.close() }
})
test('failed current read cannot save a row fallback', async () => {
  const v = mount({ getUserDetail: async () => { throw new Error('offline') } })
  try { await v.model.load(1); await v.model.save(); assert(v.model.error.value); assert.equal(v.writes.length, 0) } finally { v.close() }
})
test('conflict keeps draft; reload refreshes expected value but preserves draft', async () => {
  let reads = 0
  const v = mount({ getUserDetail: async id => detail(id, reads++ ? 'other' : 'old'), updateTestOpenid: async () => { throw { response: { data: { message: '已更新，请重新加载' } } } } })
  try {
    await v.model.load(1); v.model.value.value = 'draft'; await v.model.save()
    assert.match(v.model.error.value, /重新加载/); assert.equal(v.model.value.value, 'draft')
    await v.model.reload(); assert.equal(v.model.target.value.openid, 'other'); assert.equal(v.model.value.value, 'draft')
  } finally { v.close() }
})
test('successful save with refresh failure only retries query', async () => {
  let refreshed = 0
  const v = mount({}, async () => ++refreshed > 1)
  try {
    await v.model.load(1); v.model.value.value = ''; await v.model.save()
    assert.equal(v.model.saved.value, true); assert.equal(v.model.target.value.openid, null); assert.equal(v.model.refreshError.value, true)
    await v.model.save(); assert.equal(v.writes.length, 1)
    await v.model.refresh(); assert.equal(v.model.visible.value, false); assert.equal(v.writes.length, 1)
  } finally { v.close() }
})
test('late detail cannot replace newly selected user', async () => {
  const slow = deferred(), v = mount({ getUserDetail: id => id === 1 ? slow.promise : Promise.resolve(detail(id)) })
  try { const old = v.model.load(1); await v.model.load(2); slow.resolve(detail(1)); await old; await v.model.save(); assert.equal(v.writes[0].id, 2) } finally { v.close() }
})
test('closing, auth change, forbidden environment, and unmount invalidate pending data', async () => {
  for (const reason of ['close', 'auth', 'forbid', 'unmount']) {
    const slow = deferred(), v = mount({ getUserDetail: () => slow.promise })
    const pending = v.model.load(1)
    if (reason === 'close') v.model.visible.value = false
    else if (reason === 'auth') v.auth()
    else if (reason === 'forbid') v.forbid()
    else v.close()
    slow.resolve(detail(1)); await pending; assert.equal(v.model.target.value, null); assert.equal(v.writes.length, 0)
    if (reason !== 'unmount') v.close()
  }
})
test('double click or switching user during save cannot retarget write', async () => {
  const slow = deferred(), writes = [], v = mount({ updateTestOpenid: (id, body) => { writes.push({ id, ...body }); return slow.promise } })
  try {
    await v.model.load(1); v.model.value.value = 'new'; const pending = v.model.save()
    await v.model.save(); await v.model.load(2); assert.equal(v.model.target.value.id, 1); assert.equal(writes.length, 1)
    slow.resolve(detail(1, 'new')); await pending; assert.equal(v.model.saving.value, false)
  } finally { v.close() }
})
test('late save after auth change cannot refresh or overwrite new session', async () => {
  const slow = deferred(); let refreshes = 0
  const v = mount({ updateTestOpenid: () => slow.promise }, async () => { refreshes++; return true })
  try { await v.model.load(1); const pending = v.model.save(); v.auth(); slow.resolve(detail(1, 'new')); await pending; assert.equal(refreshes, 0); assert.equal(v.model.saved.value, false) } finally { v.close() }
})
