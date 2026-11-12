/* Service worker – mantém o app funcionando sem internet */
const CACHE = 'fag-seguranca-v3.7.2';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo-branco.png', './logo-azul.png', './simbolo-branco.png', './simbolo-azul.png', './login.jpg', './modelo_colaboradores.xlsx', './modelo_areas_frentes.xlsx'];
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
    // Página do app: tenta a versão mais nova por até 3 s; com sinal fraco ou sem internet abre na hora a cópia guardada.
    const rede = fetch(e.request, { cache: 'no-store' }).then(r => {
      if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cl)); }
      return r;
    });
    const limite = new Promise(res => setTimeout(res, 3000));
    e.respondWith(caches.match('./index.html').then(guardada => {
      if (!guardada) return rede;                                   // primeira vez: precisa da internet
      return Promise.race([rede.catch(() => guardada), limite.then(() => guardada)]);
    }));
    e.waitUntil(rede.catch(() => {}));                              // continua atualizando em segundo plano
    return;
  }
  // Imagens e modelos: usa a cópia guardada e atualiza em segundo plano.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(cache => {
    const rede = fetch(e.request).then(r => {
      if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
      return r;
    }).catch(() => cache);
    return cache || rede;
  }));
});
