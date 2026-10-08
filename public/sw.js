// Service worker da Copa dos Amigos.
// Estratégia: rede primeiro (nunca serve conteúdo velho com internet);
// cache só entra como fallback quando a rede falha (offline).
const CACHE = 'copa-dos-amigos-v1'

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  evento.respondWith(
    fetch(request)
      .then((resposta) => {
        if (resposta && resposta.ok) {
          const copia = resposta.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copia))
        }
        return resposta
      })
      .catch(() => caches.match(request).then((cachada) => cachada ?? caches.match('/'))),
  )
})
