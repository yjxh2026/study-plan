/**
 * 学习计划 PWA Service Worker
 * 离线缓存支持 - v3.2.1
 */

// 缓存版本控制
const CACHE_NAME = 'study-plan-v3.3.1-20260412';

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

// ============ 请求拦截 - 网络优先策略 ============
self.addEventListener('fetch', (event) => {
  // 只处理同源请求
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 对于导航请求（HTML页面），使用网络优先策略
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // 网络请求成功，更新缓存
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          // 网络请求失败，返回缓存
          console.log('[SW] 网络请求失败，尝试返回缓存');
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('./index.html');
            });
        })
    );
    return;
  }

  // 对于其他请求（静态资源），使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // 返回缓存，同时在后台更新
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, networkResponse);
                  });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // 缓存中没有，尝试网络请求
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          });
      })
  );
});

// ============ 消息处理 - 更新缓存 ============
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 手动清除缓存并重新加载
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log('[SW] 所有缓存已清除');
      });
  }
});
