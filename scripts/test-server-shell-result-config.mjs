import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { compileFunction } from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const Vue = require('vue')
const { parse, compileScript } = require('vue/compiler-sfc')
function load(source, mocks = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  compileFunction(output, ['require', 'module', 'exports'])((name) => mocks[name] ?? require(name), module, module.exports)
  return module.exports
}
const catalogApi = load(fs.readFileSync(path.join(root, 'src/apis/automation/automationOperationCatalog.ts'), 'utf8'), {
  '@/utils/http': {},
})
const catalog = JSON.parse(fs.readFileSync(path.join(root, '../sakura-admin/continew-automation/src/main/resources/automation/automation-operation-catalog.json'), 'utf8'))
const method = catalog.types.flatMap(type => type.methods).find(item => item.method_code === 'server.shell')
const base = {
  target_ref: { scope: 'project_environment', kind: 'server', slot_id: '1001' },
  shell: 'bash', command: 'printf 123', timeout_ms: 30000,
}
const normalize = values => catalogApi.normalizeAutomationOperationConfig(method, { ...base, ...values })
const validate = values => catalogApi.validateAutomationOperationConfig(method, { ...base, ...values })

test('empty replacement and whitespace survive normalization and JSON round trips', () => {
  for (const replacement of ['', ' ', '  ', '\r\n\t', '$1', '\\$']) {
    const values = normalize({ replace_regex: '(x)', replace_value: replacement, variable_name: 'disk' })
    assert.equal(values.replace_value, replacement)
    assert.equal(JSON.parse(JSON.stringify(values)).replace_value, replacement)
    assert.equal(validate(values), '')
  }
  assert.equal(normalize({ replace_regex: ' ', replace_value: '', variable_name: 'disk' }).replace_regex, ' ')
})

test('empty optional fields keep the original command behavior', () => {
  assert.deepEqual(normalize({ replace_regex: '', replace_value: '', variable_name: '' }), base)
  assert.equal(validate({ variable_name: 'disk' }), '')
})

test('invalid combinations, variable names and placeholders are rejected', () => {
  for (const fields of [
    { replace_regex: '\\n' }, { replace_value: ' ' }, { variable_name: 'system.disk' },
    { variable_name: '1disk' }, { variable_name: [] },
    { variable_name: 'disk', replace_regex: 'a'.repeat(513) },
    { variable_name: 'disk', replace_regex: '(x)', replace_value: '${other}' },
    { variable_name: 'disk', replace_regex: '{{other}}' },
  ]) assert.notEqual(validate(fields), '')
})

const filename = path.join(root, 'src/views/automation/automationUiScene/components/InfrastructureStepConfig.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'shell-result-test' })
const Component = load(script.content, {
  '@/apis/automation/environmentResources': { listEnvironmentResourceSlots: async () => ({ data: [] }) },
}).default
Component.render = () => null
const renderer = Vue.createRenderer({
  createElement: tag => ({ tag, children: [] }),
  createText: text => ({ text }),
  createComment: text => ({ text }),
  insert: (child, parent) => parent.children.push(child),
  remove() {}, patchProp() {}, setText() {}, setElementText() {},
  parentNode: () => null, nextSibling: () => null,
})
const list = config => [
  { paramsName: 'method_code', paramsValue: 'server.shell' },
  { paramsName: 'method_version', paramsValue: '1' },
  { paramsName: 'method_config', paramsValue: JSON.stringify(config) },
]
async function mount(config) {
  const model = Vue.ref(list(config))
  const action = Vue.ref('server_command')
  const app = renderer.createApp({
    render: () => Vue.h(Component, {
      modelValue: model.value, actionType: action.value,
      methodCode: action.value === 'server_command' ? 'server.shell' : 'database.query',
      methodVersion: 1,
      'onUpdate:modelValue': value => { model.value = value },
    }),
  })
  const parent = app.mount({ children: [] })
  await Vue.nextTick()
  return {
    state: parent.$.subTree.component.setupState, model, action,
    config: () => JSON.parse(model.value.find(item => item.paramsName === 'method_config').paramsValue),
    close: () => app.unmount(),
  }
}

test('real Vue panel edits, reopens, copies and clears without stale result fields', async () => {
  const mounted = await mount({ ...base, replace_regex: '\\n', replace_value: '', variable_name: 'disk' })
  try {
    assert.equal(mounted.state.form.replaceRegex, '\\n')
    assert.equal(mounted.state.form.replaceValue, '')
    mounted.state.form.replaceValue = ' '
    await Vue.nextTick()
    assert.equal(mounted.config().replace_value, ' ')
    const copied = await mount(mounted.config())
    assert.equal(copied.state.form.variableName, 'disk')
    assert.equal(copied.state.form.replaceValue, ' ')
    copied.close()
    mounted.state.form.replaceRegex = ''
    mounted.state.form.replaceValue = ''
    mounted.state.form.variableName = ''
    await Vue.nextTick()
    assert.deepEqual(mounted.config(), base)
    assert.deepEqual(mounted.model.value.map(item => item.paramsName), ['method_code', 'method_version', 'method_config'])
  } finally {
    mounted.close()
  }
})

test('switching to a database action does not submit Shell result fields', async () => {
  const mounted = await mount({ ...base, replace_regex: '\\n', replace_value: '', variable_name: 'disk' })
  try {
    mounted.action.value = 'database_sql'
    await Vue.nextTick()
    const result = mounted.config()
    for (const field of ['replace_regex', 'replace_value', 'variable_name', 'command', 'shell']) assert.equal(field in result, false)
  } finally {
    mounted.close()
  }
})
