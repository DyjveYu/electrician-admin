const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { parse } = require('@vue/compiler-sfc');
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const requests = [], confirms = [], successes = [], errors = [];
  const source = parse(fs.readFileSync(path.join(__dirname, '../src/views/Enterprises.vue'), 'utf8')).descriptor.scriptSetup.content;
  const request = {};
  for (const method of ['get', 'post', 'patch']) request[method] = (url, data) => new Promise((resolve, reject) => requests.push({ method, url, data, resolve, reject }));
  const context = { console: { error() {} }, ref: value => ({ value }), reactive: value => value, request,
    onMounted() {}, onBeforeUnmount() {}, watch() {}, nextTick: async () => {},
    useRoute: () => ({ query: {} }), useRouter: () => ({ replace() {} }),
    ElMessage: { success: text => successes.push(text), error: text => errors.push(text) },
    ElMessageBox: { prompt: (...args) => new Promise((resolve, reject) => confirms.push({ args, resolve, reject })) },
    window: { dispatchEvent() {} }, Event: function(type) { this.type = type; } };
  vm.createContext(context);
  vm.runInContext(source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '') + '\nglobalThis.api={handleReturn,returnPending,tableData,certStatusText,certStatusType};', context);
  return { ...context.api, requests, confirms, successes, errors };
}

test('M2.5 原因必填限长，确认期间防重复并按实际状态刷新', async () => {
  const h = harness(), row = { id: 7, certStatus: 'approved', companyName: 'M25企业' };
  const pending = h.handleReturn(row); await h.handleReturn(row); assert.equal(h.confirms.length, 1);
  const options = h.confirms[0].args[2]; assert.notEqual(options.inputValidator('  '), true); assert.notEqual(options.inputValidator('字'.repeat(501)), true); assert.equal(options.inputValidator('执照模糊'), true);
  h.confirms[0].resolve({ value: '  执照模糊  ' }); await flush();
  assert.equal(h.requests[0].url, '/admin/enterprises/7/profile/return'); assert.equal(h.requests[0].data.reason, '执照模糊'); assert.equal(row.certStatus, 'approved');
  h.requests[0].resolve({ code: 200, data: { certStatus: 'returned', returnReason: '执照模糊' } }); await flush();
  h.requests[1].resolve({ code: 200, data: { list: [{ ...row, certStatus: 'returned' }], total: 1 } }); await pending;
  assert.equal(h.successes[0], '资料已打回'); assert.equal(h.tableData.value[0].certStatus, 'returned'); assert.equal(h.returnPending[7], undefined);
});
test('M2.5 取消原因弹窗不发请求、不显示成功', async () => {
  const h = harness(), pending = h.handleReturn({ id: 7 }); h.confirms[0].reject('cancel'); await pending;
  assert.equal(h.requests.length, 0); assert.equal(h.successes.length, 0); assert.equal(h.errors.length, 0);
});
test('M2.5 写入失败或结果不明确不伪造成功，保留原认证状态', async () => {
  for (const network of [false, true]) {
    const h = harness(), row = { id: 7, certStatus: 'approved' }, pending = h.handleReturn(row);
    h.confirms[0].resolve({ value: '原因' }); await flush();
    if (network) h.requests[0].reject(new Error('通知保存失败'));
    else h.requests[0].resolve({ code: 200, data: { certStatus: 'approved' } });
    await pending; assert.equal(h.successes.length, 0); assert.equal(h.errors.length, 1); assert.equal(row.certStatus, 'approved'); assert.equal(h.returnPending[7], undefined);
  }
});
test('M2.5 已打回可更正原因，状态显示独立于冻结', async () => {
  const h = harness(), pending = h.handleReturn({ id: 7, certStatus: 'returned', returnReason: '旧原因', status: 'frozen' });
  assert.equal(h.confirms[0].args[2].inputValue, '旧原因'); assert.equal(h.certStatusText('returned'), '已打回'); assert.equal(h.certStatusType('returned'), 'danger');
  h.confirms[0].reject('close'); await pending;
});
