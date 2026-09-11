import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { compileFunction } from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const load = (source, mocks = {}) => {
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
const method = catalog.types.flatMap(type => type.methods).find(item => item.method_code === 'assertion.element.match')
assert.ok(method)

const field = (name) => method.form_schema.find(item => item.name === name)
assert.deepEqual(field('read_mode').options.map(option => option.value), ['auto', 'text', 'attribute', 'value'])
assert.equal(field('attribute').required_when.read_mode, 'attribute')

const target = { strategy: 'css', value: '#engine-state', exact: true }
const base = { target_ref: target, read_mode: 'attribute', attribute: 'class', match_mode: 'equals', expect: 'icon-inner running' }
assert.equal(catalogApi.validateAutomationOperationConfig(method, base), '')
assert.deepEqual(catalogApi.normalizeAutomationOperationConfig(method, base), base)
assert.match(catalogApi.validateAutomationOperationConfig(method, { ...base, attribute: '' }), /属性名/)

const visible = catalogApi.normalizeAutomationOperationConfig(method, {
  target_ref: target,
  read_mode: 'attribute',
  attribute: 'class',
  match_mode: 'visible',
})
assert.deepEqual(visible, { target_ref: target, match_mode: 'visible' })
assert.equal(catalogApi.validateAutomationOperationConfig(method, visible), '')

console.log('属性断言操作目录配置测试通过：选项、条件必填、规范化和可见性兼容均通过。')
