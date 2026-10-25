import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { parse, compileScript } from '@vue/compiler-sfc'
const source = fs.readFileSync(new URL('../src/views/Messages.vue', import.meta.url), 'utf8')
const compiled = compileScript(parse(source).descriptor, { id: 'notice-board' }).content
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function runtime() {
  const calls = { create: [], update: [], remove: [], list: [], errors: [], success: [] }
  let unmount, mounted
  const context = {
    ref: value => ({ value }), reactive: value => value,
    onMounted: fn => { mounted = fn }, onUnmounted: fn => { unmount = fn },
    ElMessage: { error: text => calls.errors.push(text), success: text => calls.success.push(text) },
    ElMessageBox: { confirm: async () => {} }, Plus: {},
    getMessages: async () => { calls.list.push(1); return { data: { messages: [], total: 0 } } },
    createMessage: async value => calls.create.push(value),
    updateMessage: async (id, value) => calls.update.push({ id, ...value }),
    deleteMessageApi: async id => calls.remove.push(id)
  }
  const code = compiled.replace(/^import .*$/gm, '').replace('export default', 'globalThis.component =')
  vm.runInNewContext(code, context)
  const state = context.component.setup({}, { expose() {} })
  state.messageFormRef.value = { validate: async () => {}, clearValidate() {} }
  return { state, calls, context, unmount: () => unmount(), mount: () => mounted() }
}
const row = { id: 7, title: '旧通知', content: '正文', type: 'system', priority: 'medium', target_users: 'all', status: 'published', scheduled_at: '2099-01-01T00:00:00Z', sort_order: 2 }
test('V1/V2: 编辑取消后新建清理旧ID、状态、排序，清空排序提交null', async () => {
  const r = runtime(); r.state.editMessage(row); r.state.showCreateDialog.value = false; r.state.openCreate()
  assert.equal(r.state.editingMessage.value, null); assert.equal(r.state.messageForm.sort_order, null)
  r.state.messageForm.title = '新通知'; r.state.messageForm.content = '正文'; await r.state.saveMessage()
  assert.equal(r.calls.update.length, 0); assert.equal(r.calls.create.length, 1); assert.equal(r.calls.create[0].sort_order, null)
})
test('V2/V3: 普通编辑省略未变状态/时间，0和null持久化，明确发布另发published', async () => {
  const r = runtime(); r.state.editMessage(row); r.state.messageForm.sort_order = 0; await r.state.saveMessage(false)
  assert.equal(r.calls.update[0].sort_order, 0); assert.equal(Object.hasOwn(r.calls.update[0], 'status'), false); assert.equal(Object.hasOwn(r.calls.update[0], 'scheduled_at'), false)
  r.state.editMessage(row); r.state.messageForm.sort_order = null; await r.state.saveMessage(true)
  assert.equal(r.calls.update[1].sort_order, null); assert.equal(r.calls.update[1].status, 'published'); assert.equal(Object.hasOwn(r.calls.update[1], 'scheduled_at'), false)
})
test('V3: 缺定时时间阻止保存，变更状态/时间按新值发送', async () => {
  const r = runtime(); r.state.editMessage(row); r.state.messageForm.status = 'scheduled'; r.state.messageForm.scheduled_at = ''
  await r.state.saveMessage(); assert.equal(r.calls.update.length, 0); assert.match(r.calls.errors[0], /计划时间/)
  r.state.messageForm.scheduled_at = '2099-02-01T00:00:00+08:00'; await r.state.saveMessage()
  assert.equal(r.calls.update[0].status, 'scheduled'); assert.equal(r.calls.update[0].scheduled_at, '2099-02-01T00:00:00+08:00')
})
test('V1: 保存防重，卸载后迟到保存无提示/刷新', async () => {
  const r = runtime(); const pending = deferred(); r.context.updateMessage = async () => { r.calls.update.push(1); return pending.promise }
  r.state.editMessage(row); const first = r.state.saveMessage(); await Promise.resolve(); await r.state.saveMessage(); assert.equal(r.calls.update.length, 1)
  r.unmount(); pending.resolve(); await first; assert.equal(r.calls.success.length, 0); assert.equal(r.calls.list.length, 0)
})
test('V1: 卸载后未确认删除不能发请求，列表迟到回包不更新', async () => {
  const r = runtime(); const pending = deferred(); r.context.ElMessageBox.confirm = () => pending.promise
  const deleting = r.state.deleteMessage(row); r.unmount(); pending.resolve(); await deleting; assert.equal(r.calls.remove.length, 0)
  const s = runtime(); const list = deferred(); s.context.getMessages = () => list.promise
  const loading = s.state.loadMessages(); s.unmount(); list.resolve({ data: { messages: [row], total: 1 } }); await loading
  assert.equal(s.state.messages.value.length, 0)
})
test('V1: 新旧路由兼容、菜单顺序完整、无重复顶级入口', () => {
  const router = fs.readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8')
  const layout = fs.readFileSync(new URL('../src/layout/index.vue', import.meta.url), 'utf8')
  assert.match(router, /path: '\/messages', redirect: '\/home-information\/notices'/)
  assert.match(layout, /electrician-home[\s\S]*safety-knowledge[\s\S]*home-information\/notices[\s\S]*home-information\/ads/)
  assert.doesNotMatch(layout, /el-menu-item index="\/messages"/)
})
