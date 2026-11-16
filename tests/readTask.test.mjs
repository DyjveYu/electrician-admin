import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, h } from 'vue'
import { useReadTask } from '../src/composables/useReadTask.js'

const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null, patchProp() {} })
function mount() {
  let task
  const app = renderer.createApp({ setup() { task = useReadTask(); return () => h('div') } })
  app.mount({})
  return { task, unmount: () => app.unmount() }
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

test('首次失败与真实零值区分；重试成功后刷新失败保留旧数据', async () => {
  const { task, unmount } = mount()
  let value
  try {
    await task.run(async () => { throw Error('offline') }, data => { value = data })
    assert.equal(task.state.loaded, false)
    assert.equal(value, undefined)
    assert.match(task.state.error, /加载失败/)
    await task.run(async () => ({ data: 0 }), data => { value = data })
    assert.equal(value, 0)
    assert.equal(task.state.loaded, true)
    assert.equal(task.state.error, '')
    await task.run(async () => { throw Error('offline') }, data => { value = data })
    assert.equal(value, 0)
    assert.match(task.state.error, /上次加载的数据/)
    assert.equal(task.state.loading, false)
  } finally { unmount() }
})

test('旧成功和旧失败均不覆盖最新请求及加载状态', async () => {
  const { task, unmount } = mount()
  const first = deferred(), second = deferred(), third = deferred()
  const values = []
  try {
    const a = task.run(() => first.promise, data => values.push(data))
    const b = task.run(() => second.promise, data => values.push(data))
    first.resolve({ data: 'old' }); await a
    assert.equal(task.state.loading, true)
    second.resolve({ data: 'new' }); await b
    assert.deepEqual(values, ['new'])
    const c = task.run(() => third.promise, data => values.push(data))
    await task.run(async () => ({ data: 'latest' }), data => values.push(data))
    third.reject(Error('late failure')); await c
    assert.equal(task.state.error, '')
    assert.deepEqual(values, ['new', 'latest'])
  } finally { unmount() }
})

test('卸载后的迟到读取不写入状态或展示数据', async () => {
  const { task, unmount } = mount(), pending = deferred()
  let applied = false
  const work = task.run(() => pending.promise, () => { applied = true })
  unmount(); pending.resolve({ data: 42 }); await work
  assert.equal(applied, false)
  assert.equal(task.state.loaded, false)
})
