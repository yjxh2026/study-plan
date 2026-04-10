# 开发工具与经验记录

## PWA（渐进式Web应用）开发

### 1. Service Worker 实现离线缓存

#### 基础结构
```javascript
// sw.js
const CACHE_NAME = 'app-v1';
const ASSETS = ['./', './index.html', './manifest.json', './chart.min.js'];

// 安装阶段 - 缓存资源
self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

// 激活阶段 - 清理旧缓存
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => 
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(caches.delete))
        )
    );
});

// 请求拦截 - 离线优先
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request))
    );
});
```

#### 关键要点
- **缓存策略选择**：
  - `Cache First`（缓存优先）：适合静态资源（CSS/JS/图片）
  - `Network First`（网络优先）：适合API数据
  - `Stale-While-Revalidate`：适合频繁更新的内容
  
- **版本控制**：修改`CACHE_NAME`后会自动清理旧缓存
- **跳过等待**：`self.skipWaiting()` 立即激活新版本
- **接管页面**：`self.clients.claim()` 立即接管所有页面

### 2. index.html 中的必要配置

#### Service Worker 注册
```javascript
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('注册成功'))
            .catch(err => console.error('注册失败'));
    });
}
```

#### 离线/在线状态监听
```javascript
window.addEventListener('online', () => { /* 显示恢复提示 */ });
window.addEventListener('offline', () => { /* 显示离线横幅 */ });
```

### 3. 离线提示UI设计

```css
.offline-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #FF9F43, #FF6B6B);
    color: white;
    padding: 12px 16px;
    z-index: 10000;
    transform: translateY(-100%); /* 默认隐藏 */
    transition: transform 0.3s ease;
}
.offline-banner.show { transform: translateY(0); }
```

### 4. Chart.js 本地化

```html
<!-- CDN版本（需要网络） -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- 本地版本（离线可用） -->
<script src="chart.min.js"></script>
```

下载命令：
```bash
curl -sL "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" -o chart.min.js
```

### 5. manifest.json 关键配置

```json
{
  "name": "应用名称",
  "short_name": "简称",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#F5F5F7",
  "theme_color": "#4A9FF5",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "purpose": "any maskable" },
    { "src": "icon-512.png", "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

### 6. 测试要点

- [ ] 首次访问后断开网络，页面仍可加载
- [ ] 离线时数据存储在localStorage不受影响
- [ ] 重新联网后自动同步最新资源
- [ ] 移动端添加到主屏幕后可离线使用
- [ ] 更新资源后用户能看到更新提示

### 7. 常见问题解决

| 问题 | 解决方案 |
|------|---------|
| Service Worker 不生效 | 清除浏览器缓存，重新注册 |
| HTTPS要求 | 使用GitHub Pages等支持HTTPS的托管 |
| 缓存不更新 | 修改CACHE_NAME版本号 |
| 离线显示空白 | 检查fetch事件拦截是否返回fallback |

### 8. 相关文件

- `sw.js` - Service Worker脚本
- `chart.min.js` - Chart.js本地库
- `manifest.json` - PWA清单文件
- `index.html` - 包含SW注册代码和离线UI
