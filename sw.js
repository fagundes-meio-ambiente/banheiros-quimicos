/* Service worker – mantém o app funcionando sem internet */
const CACHE = 'fag-banheiros-v1.9.1';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo-branco.png', './logo-azul.png', './simbolo-branco.png', './simbolo-azul.png', './login.jpg',
  './lib/xlsx.min.js', './modelo_banheiros.xlsx', './modelo_frentes.xlsx', './modelo_equipe.xlsx', './lib/jspdf.min.js', './lib/autotable.min.js', './lib/qrcode.min.js',
  './xlsx.min.js', './jspdf.min.js', './autotable.min.js', './qrcode.min.js'];
self.addEventListener('install', e => {
  // Guarda cada arquivo separadamente: se algum faltar no servidor, os outros continuam guardados
  // (antes, um único arquivo faltando impedia o app de funcionar sem internet).
  e.waitUntil(caches.open(CACHE).then(async c => {
    const essenciais = ['./index.html', './manifest.json', './icon-192.png'];
    await Promise.all(essenciais.map(a => fetch(new Request(a, { cache: 'reload' })).then(r => { if (r.ok) return c.put(a, r); })));
    await Promise.all(ARQUIVOS.filter(a => !essenciais.includes(a)).map(a => fetch(new Request(a, { cache: 'reload' })).then(r => { if (r.ok) return c.put(a, r); }).catch(() => {})));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // servidor (Apps Script) nunca passa pelo cache
  if (u.searchParams.has('verificar')) return; // checagem de versão nova: sempre direto na internet
  const pagina = e.request.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html');
  if (pagina) {
    // Página do app: abre NA HORA com a cópia guardada; a versão nova é baixada em segundo plano
    // e entra na próxima vez que o app for aberto. Sem cópia guardada, busca na rede.
    e.respondWith(caches.open(CACHE).then(async c => {
      const guardada = (await c.match('./index.html')) || (await c.match('./')) || (await caches.match('./index.html'));
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

// Toque no aviso de limpeza vencida: abre o app na lista de vencidos
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.navigate && c.navigate('./index.html#vencidos'); return c.focus(); } }
    return self.clients.openWindow('./index.html#vencidos');
  }));
});
