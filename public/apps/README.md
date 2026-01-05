# 应用文件夹说明

这个文件夹包含所有独立的 HTML 应用。

## 结构

```
apps/
├── hello-world/
│   └── index.html
├── base64-encode/
│   └── index.html
└── base64-decode/
    └── index.html
```

## 添加新应用

1. 在 `public/apps/` 下创建新的文件夹
2. 创建 `index.html` 文件（可以包含内联的 CSS 和 JavaScript）
3. 在 `src/apps/index.ts` 中注册新应用

示例：

```typescript
{
  id: 'my-new-app',
  name: '我的新应用',
  description: '应用描述',
  url: '/apps/my-new-app/index.html',
  icon: '🎉'
}
```

## 注意事项

- 每个应用都是完全独立的 HTML 文件
- 应用在 webview 中加载，具有独立的上下文
- 支持所有标准的 HTML/CSS/JavaScript 功能

