/**
 * 学习计划 PWA Service Worker
 * 离线缓存支持 - v1.0
 */

// 缓存版本控制
const CACHE_NAME = 'study-plan-v2-20260410';

// 需要缓存的资源列表
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './chart.min.js',
  './favicon.png',
  './favicon-192.png',
  './apple-touch-icon.png'
];

// ============ 安装阶段 - 缓存资源 ============
self.addEventListener('install', (event) => {
  console.log('[SW] 安装 Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 开始缓存资源...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] 资源缓存完成');
        // 跳过等待，立即激活
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] 缓存失败:', error);
      })
  );
});

// ============ 激活阶段 - 清理旧缓存 ============
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活 Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧版本缓存
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker 已激活');
        // 立即接管所有页面
        return self.clients.claim();
      })
  );
});

// ============ 请求拦截 - 离线优先策略 ============
self.addEventListener('fetch', (event) => {
  // 只处理同源请求
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 使用离线优先策略（缓存优先，网络备选）
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // 返回缓存
          return cachedResponse;
        }

        // 缓存中没有，尝试网络请求
        return fetch(event.request)
          .then((networkResponse) => {
            // 检查是否有效响应
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // 克隆响应以缓存
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // 网络请求失败，返回离线提示页面
            console.log('[SW] 网络请求失败，返回离线提示');
            
            // 如果请求的是HTML，返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// ============ 消息处理 - 更新缓存 ============
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] 缓存已清除');
    });
  }
});

console.log('[SW] Service Worker 脚本加载完成');
