/* sw-firebase-cache.js — Cache de imagens Firebase + suporte a clear-cache */
const SW_VERSION = '1.0.0';
const IMAGE_CACHE_NAME = 'firebase-img-cache-v1';
const FIREBASE_STORAGE_ORIGIN = 'https://firebasestorage.googleapis.com';

// Ao ativar: remove caches de versões antigas e assume controle imediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith('firebase-img-cache-') && k !== IMAGE_CACHE_NAME
          )
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Intercepta requisições de imagens do Firebase Storage
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora tudo que não seja GET para o Firebase Storage
  if (
    request.method !== 'GET' ||
    !request.url.startsWith(FIREBASE_STORAGE_ORIGIN)
  ) {
    return;
  }

  event.respondWith(
    caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      // Busca atualização em background sem bloquear
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Sem rede: retorna null, o cache cobre
          return null;
        });

      // Retorna cache se disponível; senão aguarda rede
      if (cached) {
        return cached;
      }

      const networkResponse = await networkFetch;
      if (networkResponse) {
        return networkResponse;
      }

      // Fallback: resposta vazia com status 503 para não crashar o app
      return new Response('', {
        status: 503,
        statusText: 'Offline — imagem não disponível no cache',
      });
    })
  );
});

// Recebe mensagem do app para limpar cache (usada quando admin atualiza)
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'CLEAR_ALL_CACHES') return;

  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => {
        // Notifica todos os clientes que o cache foi limpo
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: 'CACHES_CLEARED' })
          );
        });
      })
  );
});
