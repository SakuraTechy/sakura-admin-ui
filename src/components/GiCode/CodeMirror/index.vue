// https://juejin.cn/post/7442316640912293939
// https://rennzhang.github.io/codemirror-editor-vue3/zh-CN/
<template>
  <div class="gi-code-editor-container">
    <div class="code-editor-controls">
      <label for="theme-select">主题:</label>
      <a-select
        id="theme-select"
        v-model="selectedTheme"
        size="mini"
        style="width: 120px;"
        allow-clear
        allow-search
        :options="themeList"
        @change="updateOptions"
      >
      </a-select>

      <label for="lang-select">语言:</label>
      <a-select
        id="lang-select"
        v-model="selectedLang"
        size="mini"
        style="width: 120px;"
        allow-clear
        allow-search
        :options="langList"
        @change="updateOptions"
      >
      </a-select>
      <a-button size="mini" @click="getCode(example)">
        <template #icon>
          <icon-code-block />
        </template>
        <template #default>示例</template>
      </a-button>
      <a-button size="mini" @click="formatCode">
        <template #icon>
          <icon-code-square />
        </template>
        <template #default>格式化</template>
      </a-button>
    </div>
    <Codemirror
      v-model:value="code"
      :options="cmOptions"
      :height="height"
      :width="width"
      class="cm-component"
      :border="border"
      @ready="onReady"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { Editor, EditorConfiguration } from 'codemirror'
import Codemirror from 'codemirror-editor-vue3'
import beautify from 'js-beautify'
import { format as sqlFormatter } from 'sql-formatter'
import { Message } from '@arco-design/web-vue'
import yaml from 'js-yaml'

// Import theme CSS files here. Add more as needed.
// import 'codemirror/theme/default.css'
import 'codemirror/theme/3024-day.css'
import 'codemirror/theme/3024-night.css'
import 'codemirror/theme/abbott.css'
import 'codemirror/theme/abcdef.css'
import 'codemirror/theme/ambiance.css'
import 'codemirror/theme/ayu-dark.css'
import 'codemirror/theme/ayu-mirage.css'
import 'codemirror/theme/base16-dark.css'
import 'codemirror/theme/base16-light.css'
import 'codemirror/theme/bespin.css'
import 'codemirror/theme/blackboard.css'
import 'codemirror/theme/cobalt.css'
import 'codemirror/theme/colorforth.css'
import 'codemirror/theme/darcula.css'
import 'codemirror/theme/dracula.css'
import 'codemirror/theme/duotone-dark.css'
import 'codemirror/theme/duotone-light.css'
import 'codemirror/theme/eclipse.css'
import 'codemirror/theme/elegant.css'
import 'codemirror/theme/erlang-dark.css'
import 'codemirror/theme/gruvbox-dark.css'
import 'codemirror/theme/hopscotch.css'
import 'codemirror/theme/icecoder.css'
import 'codemirror/theme/idea.css'
import 'codemirror/theme/isotope.css'
import 'codemirror/theme/juejin.css'
import 'codemirror/theme/lesser-dark.css'
import 'codemirror/theme/liquibyte.css'
import 'codemirror/theme/lucario.css'
import 'codemirror/theme/material.css'
import 'codemirror/theme/material-darker.css'
import 'codemirror/theme/material-palenight.css'
import 'codemirror/theme/material-ocean.css'
import 'codemirror/theme/mbo.css'
import 'codemirror/theme/mdn-like.css'
import 'codemirror/theme/midnight.css'
import 'codemirror/theme/monokai.css'
import 'codemirror/theme/moxer.css'
import 'codemirror/theme/neat.css'
import 'codemirror/theme/neo.css'
import 'codemirror/theme/night.css'
import 'codemirror/theme/nord.css'
import 'codemirror/theme/oceanic-next.css'
import 'codemirror/theme/panda-syntax.css'
import 'codemirror/theme/paraiso-dark.css'
import 'codemirror/theme/paraiso-light.css'
import 'codemirror/theme/pastel-on-dark.css'
import 'codemirror/theme/railscasts.css'
import 'codemirror/theme/rubyblue.css'
import 'codemirror/theme/seti.css'
import 'codemirror/theme/shadowfox.css'
import 'codemirror/theme/solarized.css' // Includes both dark and light
// import 'codemirror/theme/ssms.css' // Might be less common
import 'codemirror/theme/the-matrix.css'
import 'codemirror/theme/tomorrow-night-bright.css'
import 'codemirror/theme/tomorrow-night-eighties.css'
import 'codemirror/theme/ttcn.css'
import 'codemirror/theme/twilight.css'
import 'codemirror/theme/vibrant-ink.css'
import 'codemirror/theme/xq-dark.css'
import 'codemirror/theme/xq-light.css'
import 'codemirror/theme/yeti.css'
import 'codemirror/theme/yonce.css'
import 'codemirror/theme/zenburn.css'

// Import language mode JS files here. Add more as needed.
import 'codemirror/mode/javascript/javascript.js'

// import 'codemirror/mode/json/json.js'
import 'codemirror/mode/css/css.js'
import 'codemirror/mode/htmlmixed/htmlmixed.js'
import 'codemirror/mode/apl/apl.js'
import 'codemirror/mode/sql/sql.js'
import 'codemirror/mode/xml/xml.js'
import 'codemirror/mode/yaml/yaml.js'

// import 'codemirror/mode/java/java.js'
import 'codemirror/mode/python/python.js'
import 'codemirror/mode/php/php.js'
import 'codemirror/mode/go/go.js'
import 'codemirror/mode/ruby/ruby.js'

import 'codemirror/mode/vue/vue.js'
import 'codemirror/mode/markdown/markdown.js'
import 'codemirror/mode/clike/clike.js' // For C, C++, C#, Java, etc.
import 'codemirror/mode/swift/swift.js'

// import 'codemirror/mode/csharp/csharp.js'
import 'codemirror/mode/shell/shell.js'
import 'codemirror/mode/powershell/powershell.js'
import 'codemirror/mode/protobuf/protobuf.js'
import 'codemirror/mode/groovy/groovy.js'
import 'codemirror/mode/perl/perl.js'
import 'codemirror/mode/sass/sass.js'
// import 'codemirror/mode/scss/scss.js'
// import 'codemirror/mode/less/less.js'
import 'codemirror/mode/r/r.js'
import 'codemirror/mode/rust/rust.js'
import 'codemirror/mode/cmake/cmake.js'

const props = defineProps({
  example: {
    type: String,
    default: '',
  },
  value: { // v-model
    type: String,
    default: '',
  },
  options: {
    type: Object as () => EditorConfiguration,
    default: () => ({
      theme: 'default',
      mode: 'json',
      readOnly: false,
      lint: true,
      lineNumbers: true,
      lineWrapping: true,
      lineWiseCopyCut: true,
      styleActiveLine: true,
      viewportMargin: Infinity,
      placeholder: '',
      gutters: ['CodeMirror-lint-markers'],
    }),
  },
  height: {
    type: String,
    default: '400px',
  },
  width: {
    type: String,
    default: '100%',
  },
  border: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits<{ (event: 'update:value', value: string): void }>()

const code = ref(props.value)

// List of available themes and languages (add more to the imports and these lists)
const themeList = [
  'default',
  '3024-day',
  '3024-night',
  'abbott',
  'abcdef',
  'ambiance',
  'ayu-dark',
  'ayu-mirage',
  'base16-dark',
  'base16-light',
  'bespin',
  'blackboard',
  'cobalt',
  'colorforth',
  'darcula',
  'dracula',
  'duotone-dark',
  'duotone-light',
  'eclipse',
  'elegant',
  'erlang-dark',
  'gruvbox-dark',
  'hopscotch',
  'icecoder',
  'idea',
  'isotope',
  'juejin',
  'lesser-dark',
  'liquibyte',
  'lucario',
  'material',
  'material-darker',
  'material-palenight',
  'material-ocean',
  'mbo',
  'mdn-like',
  'midnight',
  'monokai',
  'moxer',
  'neat',
  'neo',
  'night',
  'nord',
  'oceanic-next',
  'panda-syntax',
  'paraiso-dark',
  'paraiso-light',
  'pastel-on-dark',
  'railscasts',
  'rubyblue',
  'seti',
  'shadowfox',
  'solarized',
  'the-matrix',
  'tomorrow-night-bright',
  'tomorrow-night-eighties',
  'ttcn',
  'twilight',
  'vibrant-ink',
  'xq-dark',
  'xq-light',
  'yeti',
  'yonce',
  'zenburn',
]

const langList = [
  { label: 'json', value: 'json' },
  { label: 'apl', value: 'text/apl' },
  { label: 'c', value: 'text/x-csrc' },
  { label: 'c#', value: 'csharp' },
  { label: 'c++', value: 'text/x-c++src' },
  { label: 'cmake', value: 'cmake' },
  { label: 'css', value: 'css' },
  { label: 'go', value: 'text/x-go' },
  { label: 'groovy', value: 'groovy' },
  { label: 'html', value: 'text/html' },
  { label: 'java', value: 'text/x-java' },
  { label: 'javascript', value: 'javascript' },
  { label: 'less', value: 'less' },
  { label: 'markdown', value: 'markdown' },
  { label: 'perl', value: 'perl' },
  { label: 'php', value: 'text/x-php' },
  { label: 'powershell', value: 'powershell' },
  { label: 'protobuf', value: 'protobuf' },
  { label: 'python', value: 'text/x-python' },
  { label: 'r', value: 'r' },
  { label: 'ruby', value: 'ruby' },
  { label: 'rust', value: 'rust' },
  { label: 'sass', value: 'sass' },
  { label: 'scss', value: 'scss' },
  { label: 'shell', value: 'shell' },
  { label: 'sql', value: 'text/x-sql' },
  { label: 'swift', value: 'swift' },
  { label: 'vue', value: 'vue' },
  { label: 'xml', value: 'xml' },
  { label: 'yaml', value: 'text/x-yaml' },
]

const selectedTheme = ref(props.options.theme || 'default')
const selectedLang = ref(props.options.mode || 'json')

const cmOptions = reactive({
  ...props.options,
  theme: selectedTheme.value,
  mode: selectedLang.value,
})

// Update options when theme or language changes
const updateOptions = () => {
  cmOptions.theme = selectedTheme.value
  cmOptions.mode = selectedLang.value === 'json' ? 'javascript' : selectedLang.value
}

watch(() => props.value, (newValue) => {
  code.value = newValue
})

watch(code, (newValue) => {
  emit('update:value', newValue)
//   formatCode()
})

watch(() => props.options, (newOptions) => {
  Object.assign(cmOptions, newOptions)
  if (newOptions.mode === 'json') {
    cmOptions.mode = cmOptions.mode === 'json' ? 'javascript' : cmOptions.mode
  } else {
    // Update select boxes if options prop changes externally
    selectedTheme.value = cmOptions.theme || 'default'
    selectedLang.value = cmOptions.mode || 'json'
  }
}, { deep: true })

const cminstance = ref<Editor | null>(null)
const onReady = (cm: Editor) => {
  cminstance.value = cm

  // 延时刷新确保初始显示正确
  setTimeout(() => {
    if (cminstance.value) cminstance.value.refresh()
  }, 100)

  // 创建定时器每隔一段时间刷新一次，确保在任何情况下都能正确显示
  const interval = setInterval(() => {
    if (cminstance.value) cminstance.value.refresh()
  }, 500)

  // 当编辑器实例销毁时，清除定时器
  cm.on('destroy', () => clearInterval(interval))
}

const getCode = async (example: string) => {
  code.value = example || '{"name": "John", "age": 30, "city": "New York"}'
}

const formatCode = async () => {
  if (!cminstance.value) return
  const lang = selectedLang.value
  let formatted = code.value
  try {
    if (lang === 'json') {
      // 先尝试解析 JSON 确保格式正确
      const jsonObj = JSON.parse(code.value)
      // 使用 JSON.stringify 进行格式化
      formatted = JSON.stringify(jsonObj, null, 2)
    } else if ([
      'yaml',
      'yml',
      'text/x-yaml',
    ].includes(lang)) {
      // 先尝试解析 YAML 确保格式正确
      const yamlObj = yaml.load(code.value)
      // 使用 js-yaml 进行格式化
      formatted = yaml.dump(yamlObj, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        noCompatMode: true,
      })
    } else if ([
      'javascript',
      'js',
      'typescript',
      'ts',
      'jsx',
      'tsx',
    ].includes(lang)) {
      formatted = beautify.js(code.value, {
        indent_size: 2,
        space_in_empty_paren: true,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        keep_array_indentation: false,
        break_chained_methods: false,
        indent_scripts: 'normal',
        brace_style: 'collapse',
        space_before_conditional: true,
        unescape_strings: false,
        jslint_happy: false,
        end_with_newline: true,
        wrap_line_length: 0,
        indent_inner_html: false,
        comma_first: false,
        e4x: false,
        indent_empty_lines: false,
      })
    } else if ([
      'css',
      'scss',
      'less',
    ].includes(lang)) {
      formatted = beautify.css(code.value, {
        indent_size: 2,
        indent_char: ' ',
        max_preserve_newlines: 2,
        preserve_newlines: true,
        keep_array_indentation: false,
        break_chained_methods: false,
        indent_scripts: 'normal',
        brace_style: 'collapse',
        space_before_conditional: true,
        unescape_strings: false,
        jslint_happy: false,
        end_with_newline: true,
        wrap_line_length: 0,
        indent_inner_html: false,
        comma_first: false,
        e4x: false,
        indent_empty_lines: false,
      })
    } else if ([
      'html',
      'text/html',
      'vue',
    ].includes(lang)) {
      formatted = beautify.html(code.value, {
        indent_size: 2,
        indent_char: ' ',
        max_preserve_newlines: 2,
        preserve_newlines: true,
        keep_array_indentation: false,
        break_chained_methods: false,
        indent_scripts: 'normal',
        brace_style: 'collapse',
        space_before_conditional: true,
        unescape_strings: false,
        jslint_happy: false,
        end_with_newline: true,
        wrap_line_length: 0,
        indent_inner_html: false,
        comma_first: false,
        e4x: false,
        indent_empty_lines: false,
      })
    } else if ([
      'sql',
      'text/x-sql',
    ].includes(lang)) {
      formatted = sqlFormatter(code.value)
    } else if ([
      'xml',
    ].includes(lang)) {
      formatted = beautify.html(code.value)
    } else {
      // 其他语言暂不支持
      Message.warning('暂不支持该语言的自动格式化')
      return
    }
    code.value = formatted
  } catch (e) {
    Message.warning(`格式化失败: ${(e as Error).message}`)
  }
}

defineExpose({
  formatCode,
})
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss">
.gi-code-editor-container {
  display: flex;
  flex-direction: column-reverse; /* 子元素垂直堆叠 */
  width: 100%; /* 确保容器填充父元素的宽度 */
  gap: 10px;
  margin-top: 5px;
}

.code-editor-controls {
//   margin-bottom: 5px;
  width: 100%;
  display: flex; /* 使用Flexbox布局 */
  align-items: center; /* 垂直居中对齐 */
  gap: 15px; /* 添加一些间距 */
  align-self: flex-start; /* 靠左对齐并只占用内容宽度 */
  justify-content: flex-end;

  label {
    font-size: 12px;
    margin-right: 0; /* 移除原有的右边距 */
  }

  .select {
    margin-right: 0; /* 移除原有的右边距 */
    padding: 4px; /* 添加一些内边距让下拉框看起来更好 */
    border: 1px solid #ccc; /* 添加边框 */
    border-radius: 4px; /* 添加圆角 */
  }

  .code-editor-controls-buttons {
    .arco-btn {
        display: flex;
        align-items: flex-end;
    }
  }
}

:deep(.arco-btn) {
    display: flex;
    align-items: flex-end;
}
.cm-component {
  font-family: monospace;
  width: 100%; /* 确保 Codemirror 填充其父容器的宽度 */
}
</style>
