const CIDADE = { nome: 'Recife', centro: [-8.0578, -34.8829], zoom: 14 };
const USERS_KEY = 'alagamap_users';
const CURRENT_USER_KEY = 'alagamap_current_user';
const REPORTS_KEY = 'alagamap_reports';

const NOS = {
  A: { nome: 'Boa Viagem', ll: [-8.1210, -34.9020] },
  B: { nome: 'Pina', ll: [-8.0930, -34.8830] },
  C: { nome: 'Derby', ll: [-8.0570, -34.8930] },
  D: { nome: 'Recife Antigo', ll: [-8.0620, -34.8710] },
  E: { nome: 'Madalena', ll: [-8.0560, -34.9080] },
  F: { nome: 'Torre', ll: [-8.0430, -34.9080] },
  G: { nome: 'Casa Amarela', ll: [-8.0250, -34.9150] },
  H: { nome: 'Espinheiro', ll: [-8.0390, -34.8930] },
  I: { nome: 'Imbiribeira', ll: [-8.1080, -34.9190] },
  J: { nome: 'Afogados', ll: [-8.0780, -34.9110] },
};

const VIAS = [
  ['A', 'B', 3.4, 8, true],
  ['A', 'I', 2.9, 7, true],
  ['B', 'D', 3.6, 9, true],
  ['B', 'C', 4.1, 11, false],
  ['C', 'D', 2.6, 7, false],
  ['C', 'E', 1.7, 5, false],
  ['C', 'H', 2.2, 6, false],
  ['D', 'H', 2.8, 8, false],
  ['E', 'F', 1.5, 4, true],
  ['E', 'J', 2.6, 7, true],
  ['F', 'G', 2.2, 6, false],
  ['F', 'H', 1.6, 5, false],
  ['G', 'H', 1.9, 6, false],
  ['I', 'J', 3.7, 9, true],
  ['J', 'C', 2.9, 8, true],
];

const PENALIDADE = { 0: 0, 1: 6, 2: 20, 3: Infinity };
const SEV_TXT = { 1: 'Água baixa', 2: 'Transitável c/ risco', 3: 'Intransitável' };
const SEV_COR = { 1: '#facc15', 2: '#fb923c', 3: '#ef4444' };
const VALIDADE_MIN = 90;
const RAIO_IMPACTO_M = 450;

let relatos = carregarRelatos();
let currentUser = carregarUsuarioAtual();
let modo = null;
let sevSel = 2;
let camadaRotas = null;
let camadaRelatos = null;
let pinOrigem = null;
let pinDestino = null;
let map = null;
let userMarker = null;
let lastToastTimer = null;
const geometriaRotas = new Map();
let desenhoRotaId = 0;

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function salvarRelatos() {
  writeStorage(REPORTS_KEY, relatos);
}

function carregarRelatos() {
  const stored = readStorage(REPORTS_KEY, null);
  if (stored && Array.isArray(stored) && stored.length) return stored;

  return [
    {
      id: 'seed1',
      ll: [-8.0790, -34.9100],
      sev: 3,
      confirma: 4,
      ts: Date.now() - 12 * 60000,
      ref: 'Afogados, sob o viaduto',
      userId: 'seed-user-1',
      userName: 'Sistema',
      userEmail: 'sistema@alagamap.app',
    },
    {
      id: 'seed2',
      ll: [-8.0570, -34.9075],
      sev: 2,
      confirma: 1,
      ts: Date.now() - 35 * 60000,
      ref: 'Madalena, Rua Real da Torre',
      userId: 'seed-user-2',
      userName: 'Sistema',
      userEmail: 'sistema@alagamap.app',
    },
  ];
}

function carregarUsuarioAtual() {
  const user = readStorage(CURRENT_USER_KEY, null);
  return user || null;
}

function salvarUsuarioAtual(user) {
  if (user) {
    writeStorage(CURRENT_USER_KEY, user);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

function getUsers() {
  const users = readStorage(USERS_KEY, null);
  if (users && Array.isArray(users) && users.length) return users;

  const demoUsers = [
    { id: 'u-demo-1', name: 'Ana Silva', email: 'ana@alagamap.com', password: '123456' },
    { id: 'u-demo-2', name: 'Bruno Costa', email: 'bruno@alagamap.com', password: '123456' },
  ];
  writeStorage(USERS_KEY, demoUsers);
  return demoUsers;
}

function saveUsers(users) {
  writeStorage(USERS_KEY, users);
}

function showAuthScreen() {
  document.getElementById('authScreen').classList.add('active');
  const appScreen = document.getElementById('appScreen');
  if (appScreen) appScreen.classList.remove('active');
}

function showAppScreen() {
  const authScreen = document.getElementById('authScreen');
  if (authScreen) authScreen.classList.remove('active');
  const appScreen = document.getElementById('appScreen');
  if (appScreen) appScreen.classList.add('active');
  if (map) {
    setTimeout(() => map.invalidateSize(), 150);
  } else {
    initMap();
  }
}

function getNomeBairro(ll) {
  const bairros = {
    A: 'Boa Viagem',
    B: 'Pina',
    C: 'Derby',
    D: 'Recife Antigo',
    E: 'Madalena',
    F: 'Torre',
    G: 'Casa Amarela',
    H: 'Espinheiro',
    I: 'Imbiribeira',
    J: 'Afogados',
  };

  const maisProximo = noMaisProximo(ll);
  return bairros[maisProximo] || 'Bairro';
}

function atualizarFiltroBairros() {
  const select = document.getElementById('filtroBairro');
  if (!select) return;

  const bairros = ['Todos', ...Object.values(NOS).map((n) => n.nome)];
  const unique = [...new Set(bairros)];
  select.innerHTML = unique.map((bairro) => `<option value="${bairro}">${bairro === 'Todos' ? 'Todos os bairros' : bairro}</option>`).join('');
}

function renderHistorico() {
  const container = document.getElementById('historicoLista');
  if (!container) return;

  const eventos = relatos
    .slice()
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 6)
    .map((r) => `
      <div class="history-item">
        <strong>${SEV_TXT[r.sev]}</strong>
        <span>${r.ref || 'Sem referência'} · ${r.userName || 'Usuário'} · ${min(r.ts)} min atrás</span>
      </div>
    `)
    .join('');

  container.innerHTML = eventos || '<div class="empty">Ainda não há histórico.</div>';
}

function bindAuthScreens() {
  const tabs = document.querySelectorAll('.tab-button');
  const forms = {
    login: document.getElementById('loginForm'),
    register: document.getElementById('registerForm'),
  };

  if (forms.login && forms.register) {
    tabs.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.tab;
        tabs.forEach((tab) => tab.classList.toggle('active', tab === button));
        forms.login.classList.toggle('active', target === 'login');
        forms.register.classList.toggle('active', target === 'register');
      });
    });

    forms.login.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value.trim();

      const users = getUsers();
      const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);

      if (!user) {
        toast('E-mail ou senha inválidos.');
        return;
      }

      currentUser = user;
      salvarUsuarioAtual(user);
      renderUserHeader();
      forms.login.reset();
      window.location.href = './map.html';
    });

    forms.register.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value.trim();
      const confirmPassword = document.getElementById('registerConfirmPassword').value.trim();

      if (!name || !email || !password) {
        toast('Preencha todos os campos para continuar.');
        return;
      }

      if (password.length < 6) {
        toast('A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (password !== confirmPassword) {
        toast('As senhas não coincidem.');
        return;
      }

      const users = getUsers();
      const emailExists = users.some((item) => item.email.toLowerCase() === email.toLowerCase());

      if (emailExists) {
        toast('Este e-mail já está cadastrado.');
        return;
      }

      const novoUsuario = {
        id: `u-${Date.now()}`,
        name,
        email,
        password,
      };

      users.push(novoUsuario);
      saveUsers(users);
      currentUser = novoUsuario;
      salvarUsuarioAtual(novoUsuario);
      forms.register.reset();
      window.location.href = './map.html';
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    salvarUsuarioAtual(null);
    window.location.href = './index.html';
  });
}

function renderUserHeader() {
  const userNameEl = document.getElementById('userName');
  if (!userNameEl) return;
  userNameEl.textContent = currentUser ? currentUser.name.split(' ')[0] : 'Visitante';
}

function initMap() {
  if (map) return;

  map = L.map('map', { zoomControl: false }).setView(CIDADE.centro, CIDADE.zoom);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  camadaRotas = L.layerGroup().addTo(map);
  camadaRelatos = L.layerGroup().addTo(map);

  userMarker = L.marker(CIDADE.centro, {
    icon: L.divIcon({
      className: '',
      html: '<div class="location-pin"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
  }).addTo(map);

  Object.entries(NOS).forEach(([id, n]) => {
    L.circleMarker(n.ll, {
      radius: 5,
      color: '#2dd4bf',
      fillColor: '#0f1720',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map).bindTooltip(n.nome, { direction: 'top' });
  });

  map.on('click', (event) => {
    const ll = [event.latlng.lat, event.latlng.lng];

    if (modo === 'report') {
      if (!currentUser) {
        toast('Faça login antes de reportar um alagamento.');
        showAuthScreen();
        return;
      }

      relatos.push({
        id: 'r' + Date.now(),
        ll,
        sev: sevSel,
        confirma: 0,
        ts: Date.now(),
        ref: document.getElementById('refTxt').value.trim(),
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
      });

      document.getElementById('refTxt').value = '';
      document.getElementById('repHint').textContent = 'Após clicar, toque no ponto alagado no mapa.';
      modo = null;
      salvarRelatos();
      renderRelatos();
      recalcular();
      toast('Alerta publicado — obrigado!');
      return;
    }

    const n = noMaisProximo(ll);
    if (!pinOrigem) {
      selO.value = n;
      pinOrigem = 1;
      toast('Origem: ' + NOS[n].nome);
    } else {
      selD.value = n;
      pinOrigem = null;
      toast('Destino: ' + NOS[n].nome);
      recalcular();
    }
  });

  localizarUsuario();
}

function localizarUsuario() {
  if (!map || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const ll = [position.coords.latitude, position.coords.longitude];
      userMarker.setLatLng(ll);
      userMarker.bindPopup('Você está aqui');
      map.setView(ll, 17, { animate: true });
    },
    () => {
      map.setView(CIDADE.centro, CIDADE.zoom);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function distM(a, b) {
  const R = 6371000;
  const rad = (x) => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function distPontoVia(p, a, b) {
  const k = Math.cos(a[0] * Math.PI / 180);
  const px = p[1] * k, py = p[0], ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0];
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return distM(p, [ay + t * dy, (ax + t * dx) / k]);
}

function noMaisProximo(ll) {
  let best = null;
  let menorDistancia = Infinity;

  for (const [id, n] of Object.entries(NOS)) {
    const d = distM(ll, n.ll);
    if (d < menorDistancia) {
      menorDistancia = d;
      best = id;
    }
  }

  return best;
}

function ativos() {
  const agora = Date.now();
  return relatos.filter((r) => (agora - r.ts) / 60000 < VALIDADE_MIN && r.confirma >= -2);
}

function sevDaVia(de, para) {
  let s = 0;
  for (const r of ativos()) {
    if (distPontoVia(r.ll, NOS[de].ll, NOS[para].ll) <= RAIO_IMPACTO_M) {
      s = Math.max(s, r.sev);
    }
  }
  return s;
}

function adjacencia(bloqueadas = new Set()) {
  const g = {};
  Object.keys(NOS).forEach((k) => (g[k] = []));

  for (const [a, b, km, min, baixa] of VIAS) {
    const sev = sevDaVia(a, b);
    const pen = PENALIDADE[sev];
    const extra = bloqueadas.has(`${a}|${b}`) || bloqueadas.has(`${b}|${a}`) ? 25 : 0;
    const custo = min + (pen === Infinity ? Infinity : pen) + extra;
    g[a].push({ p: b, custo, km, min, sev, baixa });
    g[b].push({ p: a, custo, km, min, sev, baixa });
  }

  return g;
}

function dijkstra(ini, fim, bloqueadas) {
  const g = adjacencia(bloqueadas);
  const dist = {};
  const prev = {};
  const visto = new Set();

  Object.keys(NOS).forEach((k) => (dist[k] = Infinity));
  dist[ini] = 0;

  while (true) {
    let u = null;
    let menor = Infinity;

    for (const k of Object.keys(NOS)) {
      if (!visto.has(k) && dist[k] < menor) {
        menor = dist[k];
        u = k;
      }
    }

    if (u === null || u === fim) break;
    visto.add(u);

    for (const e of g[u]) {
      if (e.custo === Infinity) continue;
      const nd = dist[u] + e.custo;
      if (nd < dist[e.p]) {
        dist[e.p] = nd;
        prev[e.p] = u;
      }
    }
  }

  if (dist[fim] === Infinity) return null;

  const caminho = [fim];
  let c = fim;

  while (c !== ini) {
    c = prev[c];
    if (c === undefined) return null;
    caminho.unshift(c);
  }

  return caminho;
}

function avaliar(caminho) {
  let km = 0;
  let minTotal = 0;
  let pen = 0;
  let pior = 0;
  const trechos = [];

  for (let i = 0; i < caminho.length - 1; i++) {
    const a = caminho[i];
    const b = caminho[i + 1];
    const via = VIAS.find((v) => (v[0] === a && v[1] === b) || (v[0] === b && v[1] === a));
    const sev = sevDaVia(a, b);
    km += via[2];
    minTotal += via[3];
    pen += PENALIDADE[sev] === Infinity ? 0 : PENALIDADE[sev];
    pior = Math.max(pior, sev);
    trechos.push({ a, b, sev });
  }

  return { caminho, km: +km.toFixed(1), min: minTotal + pen, base: minTotal, pen, pior, trechos };
}

function calcularRotas(ini, fim, k = 3) {
  const out = [];
  const bloq = new Set();

  for (let i = 0; i < k; i++) {
    const c = dijkstra(ini, fim, bloq);
    if (!c) break;

    const chave = c.join('>');
    if (out.some((r) => r.caminho.join('>') === chave)) break;

    out.push(avaliar(c));

    for (let j = 0; j < c.length - 1; j++) {
      bloq.add(`${c[j]}|${c[j + 1]}`);
    }
  }

  return out.sort((x, y) => x.min - y.min || x.pior - y.pior);
}

async function obterGeometriaRota(rota) {
  const chave = rota.caminho.join('>');
  if (geometriaRotas.has(chave)) return geometriaRotas.get(chave);

  const coordenadas = rota.caminho
    .map((no) => `${NOS[no].ll[1]},${NOS[no].ll[0]}`)
    .join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=full&geometries=geojson&steps=false`;

  try {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error('Serviço de rotas indisponível');
    const dados = await resposta.json();
    const pontos = dados.routes?.[0]?.geometry?.coordinates?.map(([lon, lat]) => [lat, lon]);
    if (!pontos?.length) throw new Error('Geometria vazia');
    geometriaRotas.set(chave, pontos);
    return pontos;
  } catch (error) {
    return rota.caminho.map((no) => NOS[no].ll);
  }
}

async function desenharRotas(rotas, destaque = 0) {
  if (!camadaRotas || !map) return;

  const desenhoAtual = ++desenhoRotaId;
  camadaRotas.clearLayers();
  const geometria = await Promise.all(rotas.map(obterGeometriaRota));
  if (!camadaRotas || !map || desenhoAtual !== desenhoRotaId) return;

  rotas.forEach((r, idx) => {
    const pts = geometria[idx];
    const ativo = idx === destaque;
    L.polyline(pts, {
      color: ativo ? (r.pior >= 3 ? '#ef4444' : '#22c55e') : '#64748b',
      weight: ativo ? 7 : 4,
      opacity: ativo ? 0.95 : 0.45,
      dashArray: r.pior >= 2 ? '10,8' : null,
    }).addTo(camadaRotas);

    if (ativo) {
      r.trechos.filter((t) => t.sev > 0).forEach((t) => {
        const trecho = [NOS[t.a].ll, NOS[t.b].ll];
        L.polyline(trecho, { color: SEV_COR[t.sev], weight: 9, opacity: 0.75 }).addTo(camadaRotas);
      });
    }
  });

  if (rotas[destaque]) {
    const bounds = L.polyline(geometria[destaque]).getBounds();
    map.fitBounds(bounds, { padding: [60, 60] });
  }
}

function listarRotas(rotas) {
  const el = document.getElementById('rotas');
  if (!rotas.length) {
    el.innerHTML = '<div class="empty">Sem caminho disponível — todas as vias estão bloqueadas.</div>';
    return;
  }

  el.innerHTML = rotas.map((r, i) => {
    const tag = r.pior >= 3 ? ['bad', 'Bloqueada'] : r.pior === 2 ? ['warn', 'Risco'] : r.pior === 1 ? ['warn', 'Atenção'] : ['ok', 'Livre'];
    const nomes = r.caminho.map((n) => NOS[n].nome).join(' → ');
    return `<div class="route ${i === 0 ? 'best' : ''} ${r.pior >= 3 ? 'blocked' : ''}" data-i="${i}">
      <div class="top">
        <span class="name">${i === 0 ? '★ Recomendada' : 'Alternativa ' + i}</span>
        <span class="tag ${tag[0]}">${tag[1]}</span>
      </div>
      <div class="meta"><span>${r.min} min</span><span>${r.km} km</span>${r.pen ? `<span>+${r.pen} min de desvio</span>` : ''}</div>
      <div class="meta" style="margin-top:5px;font-size:10.5px">${nomes}</div>
    </div>`;
  }).join('');

  el.querySelectorAll('.route').forEach((d) => {
    d.onclick = () => desenharRotas(rotas, Number(d.dataset.i));
  });
}

function renderRelatos() {
  if (!camadaRelatos || !map) return;

  camadaRelatos.clearLayers();
  const as = ativos();
  document.getElementById('cnt').textContent = as.length;

  as.forEach((r) => {
    L.circle(r.ll, {
      radius: RAIO_IMPACTO_M,
      color: SEV_COR[r.sev],
      fillColor: SEV_COR[r.sev],
      fillOpacity: 0.12,
      weight: 1,
    }).addTo(camadaRelatos);

    L.marker(r.ll, {
      icon: L.divIcon({
        className: '',
        html: `<div class="pin" style="width:16px;height:16px;background:${SEV_COR[r.sev]}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(camadaRelatos).bindPopup(
      `<b>${SEV_TXT[r.sev]}</b><br>${r.ref || 'sem referência'}<br><small>Por: ${r.userName || 'Usuário'}<br>${min(r.ts)} min atrás · ${r.confirma >= 0 ? '+' : ''}${r.confirma} confirmações</small>`
    );
  });

  const lista = document.getElementById('lista');
  lista.innerHTML = as.length
    ? as.slice().reverse().map((r) => `
      <div class="rep s${r.sev}">
        <div class="t">${SEV_TXT[r.sev]}</div>
        <div class="m">${r.ref || 'Sem referência'} · ${r.userName ? `por ${r.userName}` : 'anônimo'} · ${min(r.ts)} min atrás · ${r.confirma >= 0 ? '+' : ''}${r.confirma}</div>
        <div class="vote">
          <button data-id="${r.id}" data-v="1">Ainda alagado</button>
          <button data-id="${r.id}" data-v="-1">Já normalizou</button>
        </div>
      </div>`).join('')
    : '<div class="empty">Nenhum alagamento reportado agora.</div>';

  lista.querySelectorAll('.vote button').forEach((b) => {
    b.onclick = () => {
      const r = relatos.find((x) => x.id === b.dataset.id);
      if (!r) return;
      r.confirma += Number(b.dataset.v);
      if (Number(b.dataset.v) === 1) r.ts = Date.now();
      salvarRelatos();
      renderRelatos();
      renderHistorico();
      recalcular();
    };
  });
}

const min = (ts) => Math.round((Date.now() - ts) / 60000);

function setupAppControls() {
  const selO = document.getElementById('origem');
  const selD = document.getElementById('destino');

  Object.entries(NOS).forEach(([id, n]) => {
    selO.add(new Option(n.nome, id));
    selD.add(new Option(n.nome, id));
  });

  selO.value = 'A';
  selD.value = 'G';

  document.getElementById('sevChips').onclick = (event) => {
    const c = event.target.closest('.chip');
    if (!c) return;
    document.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
    c.classList.add('on');
    sevSel = Number(c.dataset.sev);
  };

  document.getElementById('btnReport').onclick = () => {
    if (!currentUser) {
      toast('Faça login antes de reportar um alagamento.');
      showAuthScreen();
      return;
    }

    modo = 'report';
    document.getElementById('repHint').textContent = '➜ Toque agora no ponto alagado do mapa.';
    toast('Toque no mapa para marcar o alagamento');
  };

  document.getElementById('btnLocalizar').onclick = () => {
    if (!navigator.geolocation) {
      toast('Geolocalização não suportada neste navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const ll = [position.coords.latitude, position.coords.longitude];
        if (map) {
          map.setView(ll, 17, { animate: true });
          if (userMarker) userMarker.setLatLng(ll);
        }
        toast(`Localização atual: ${getNomeBairro(ll)}`);
      },
      () => {
        toast('Não foi possível obter sua localização.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  document.getElementById('filtroBairro').addEventListener('change', (event) => {
    const bairro = event.target.value;
    if (!map || !camadaRelatos) return;

    camadaRelatos.eachLayer((layer) => {
      if (layer instanceof L.Circle) {
        const shouldShow = bairro === 'Todos' || getNomeBairro(layer.getLatLng()) === bairro;
        layer.setStyle({ opacity: shouldShow ? 1 : 0.1, fillOpacity: shouldShow ? 0.12 : 0.02 });
      }
    });
  });

  document.getElementById('btnRota').onclick = recalcular;
  document.getElementById('btnLimpar').onclick = () => {
    relatos = ativos();
    salvarRelatos();
    renderRelatos();
    renderHistorico();
    recalcular();
    toast('Alertas expirados removidos');
  };
}

let ultimas = [];
function recalcular() {
  const selO = document.getElementById('origem');
  const selD = document.getElementById('destino');

  if (!selO || !selD) return;

  const i = selO.value;
  const f = selD.value;
  if (i === f) {
    document.getElementById('rotas').innerHTML = '<div class="empty">Origem e destino iguais.</div>';
    if (camadaRotas) camadaRotas.clearLayers();
    return;
  }

  ultimas = calcularRotas(i, f, 3);
  listarRotas(ultimas);
  desenharRotas(ultimas, 0);
}

function toast(msg) {
  clearTimeout(lastToastTimer);
  document.querySelector('.toast')?.remove();
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  document.body.appendChild(d);
  lastToastTimer = setTimeout(() => d.remove(), 2600);
}

const isMapPage = window.location.pathname.toLowerCase().endsWith('map.html');

bindAuthScreens();
renderUserHeader();
if (isMapPage) {
  setupAppControls();
  atualizarFiltroBairros();
  if (currentUser) {
    renderUserHeader();
    showAppScreen();
  } else {
    window.location.href = './index.html';
  }

  renderRelatos();
  renderHistorico();
  recalcular();
  setInterval(() => {
    renderRelatos();
    renderHistorico();
  }, 60000);
} else {
  if (currentUser) {
    window.location.href = './map.html';
  } else {
    showAuthScreen();
  }
}
