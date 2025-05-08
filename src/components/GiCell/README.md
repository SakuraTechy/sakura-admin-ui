# GiCell 单元格组件集

GiCell组件集是一系列用于数据表格单元格显示的组件集合。

## GiCellVersion 版本显示组件

### 组件介绍
`GiCellVersion` 是一个用于美观显示版本号的组件，可以根据版本类型自动使用不同颜色的标签显示。支持自定义颜色配置。

### 使用方法

```vue
<template>
  <!-- 基本使用 -->
  <GiCellVersion :version="record.version" />
  
  <!-- 自定义颜色配置 -->
  <GiCellVersion 
    :version="record.version" 
    :preset-colors="{
      'CentOS': 'blue',
      'Ubuntu': 'green',
      'Windows': 'purple'
    }"
    default-color="gray"
  />
</template>

<script setup>
import { GiCellVersion } from '@/components/GiCell'
</script>
```

### 属性说明

| 属性名 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| version | string | '' | 版本号文本 |
| presetColors | object | 预设颜色映射 | 版本类型与颜色的映射对象，默认包含常见操作系统颜色映射 |
| defaultColor | string | 'gray' | 当版本类型未匹配到预设颜色时使用的默认颜色 |

### 预设颜色
组件默认包含以下版本类型的颜色映射：
- CentOS: arcoblue
- Ubuntu: green
- Windows: purple
- Debian: orangered
- Alpine: blue
- Red Hat: red
- Mac: #666
- iOS: #333
- Android: #87d068

## GiCellPassword 密码显示/隐藏组件

### 组件介绍
`GiCellPassword` 是一个用于密码显示与隐藏的组件，可以在表格中显示密码字段，支持显示/隐藏切换和复制功能，同时支持权限控制。

### 使用方法

```vue
<template>
  <GiCellPassword 
    :value="record.password" 
    :permission="'system:user:get'"
    :on-show="() => onShowPassword(record)"
    :on-hide="() => onHidePassword(record)"
  />
</template>

<script setup>
import { GiCellPassword } from '@/components/GiCell'

const onShowPassword = async (record) => {
  // 可以在这里调用API获取真实密码
  const response = await getUserPassword(record.id)
  record.password = response.data.password
  record.passwordStatus = true
}

const onHidePassword = (record) => {
  // 隐藏密码的逻辑
  record.password = undefined
  record.passwordStatus = false
}
</script>
```

### 属性说明

| 属性名 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | string | '' | 密码值 |
| onShow | function | undefined | 显示密码时的回调函数，可以返回字符串作为新的密码值，也可以返回Promise |
| onHide | function | undefined | 隐藏密码时的回调函数 |
| showTooltip | string | '显示' | 显示按钮的提示文字 |
| hideTooltip | string | '隐藏' | 隐藏按钮的提示文字 |
| permission | string | '' | 权限控制字符串，用于控制显示按钮的权限 |

### 事件说明

| 事件名 | 说明 |
| --- | --- |
| update:value | 当密码值发生变化时触发 |
| show | 当密码显示时触发 |
| hide | 当密码隐藏时触发 |