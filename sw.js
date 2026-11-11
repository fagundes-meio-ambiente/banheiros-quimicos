/* Service worker – mantém o app funcionando sem internet */
const CACHE = 'fag-banheiros-v1.4.0';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo-branco.png', './logo-azul.png', './simbolo-branco.png', './simbolo-azul.png', './login.jpg',
  './lib/xlsx.min.js', './modelo_banheiros.xlsx', './modelo_frentes.xlsx', './modelo_equipe.xlsx', './lib/jspdf.min.js', './lib/autotable.min.js', './lib/qrcode.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(a => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // servidor (Apps Script) nunca passa pelo cache
  const pagina = e.request.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html');
  if (pagina) {
    // Página do app: abre NA HORA com a cópia guardada; a versão nova é baixada em segundo plano
    // e entra na próxima vez que o app for aberto. Sem cópia guardada, busca na rede.
    e.respondWith(caches.open(CACHE).then(async c => {
      const guardada = await c.match('./index.html');
      const rede = fetch(e.request, { cache: 'no-store' }).then(r => { if (r && r.ok) c.put('./index.html', r.clone()); return r; });
      if (guardada) { e.waitUntil(rede.catch(() => {})); return guardada; }
      return rede.catch(() => caches.match('./'));
    }));
    return;
  }
  // Imagens e bibliotecas: usa a cópia guardada e atualiza em segundo plano.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(cache => {
    const rede = fetch(e.request).then(r => {
      if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
      return r;
    }).catch(() => cache);
    return cache || rede;
  }));
});
