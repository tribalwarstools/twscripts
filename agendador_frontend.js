(async function () {
  'use strict';

  // ======== CONFIG: URL do backend =========
  const BACKEND_URL = 'https://tribalwarstools.github.io/twscripts/agendador_backend.js';
  // =========================================

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      try {
        if (window.jQuery && typeof window.jQuery.getScript === 'function') {
          window.jQuery.getScript(url)
            .done(() => setTimeout(resolve, 150))
            .fail(() => {
              const s = document.createElement('script');
              s.src = url;
              s.async = true;
              s.onload = () => setTimeout(resolve, 120);
              s.onerror = e => reject(e);
              document.head.appendChild(s);
            });
        } else {
          const s = document.createElement('script');
          s.src = url;
          s.async = true;
          s.onload = () => setTimeout(resolve, 120);
          s.onerror = e => reject(e);
          document.head.appendChild(s);
        }
      } catch (err) { reject(err); }
    });
  }

  try {
    await loadScript(BACKEND_URL);
  } catch (err) {
    console.error('Erro ao carregar backend:', err);
    alert('Erro ao carregar backend. Verifique BACKEND_URL no script frontend.');
    return;
  }

  const backend = window.TWS_Backend;
  if (!backend) {
    alert('Backend não inicializou corretamente. Verifique console.');
    return;
  }

  // === Carrega village.txt via backend e inicia painel ===
  const { map: villageMap, myVillages } = await backend.loadVillageTxt();

  // === Criação do painel ===
  const panel = document.createElement('div');
  panel.id = 'tws-panel';
  panel.className = 'tws-container';
  panel.innerHTML = `
    <style>
      .tws-container {
        position: fixed; 
        right: 0; 
        bottom: 10px; 
        width: 460px; 
        z-index: 99999;
        font-family: Verdana, sans-serif !important;
        background: #2b1b0f !important; /* ← só a cor sólida */
        color: #f5deb3 !important;
        border: 2px solid #654321 !important; 
        border-right: none !important;
        border-radius: 8px 0 0 8px !important;
        box-shadow: 0 4px 18px rgba(0,0,0,0.7) !important; 
        padding: 10px !important;
        transition: transform 0.4s ease !important;
}

      .tws-toggle-tab {
        position: absolute; left: -28px; top: 40%;
        background: #5c3a1e; border: 2px solid #654321; border-right: none;
        border-radius: 6px 0 0 6px; padding: 6px 4px; font-size: 14px;
        color: #ffd700; cursor: pointer; writing-mode: vertical-rl;
        text-orientation: mixed; user-select: none; box-shadow: -2px 0 6px rgba(0,0,0,0.5);
      }
      .tws-toggle-tab:hover { background: #7b5124; }
      .tws-hidden { transform: translateX(100%); }
      .tws-container h3 { margin:0 0 6px;text-align:center;color:#ffd700;text-shadow:1px 1px 2px #000;}
      .tws-container input, .tws-container select, .tws-container button, .tws-container textarea {
        border-radius:5px; border:1px solid #5c3a1e; background:#1e1408; color:#fff; padding:5px; font-size:12px;
      }
      .tws-container button{ cursor:pointer; background:#6b4c2a; color:#f8e6c2; transition:0.2s; }
      .tws-container button:hover{ background:#8b652e; }
      .tws-schedule-wrapper { max-height:270px; overflow-y:auto; border:1px solid #3d2a12; border-radius:6px; margin-top:6px; }
      .tws-schedule-table { width:100%; border-collapse:collapse; font-size:12px; }
      .tws-schedule-table th, .tws-schedule-table td { border:none; padding:4px; text-align:center; }
      .tws-schedule-table th { background:#3d2a12; color:#ffd700; position:sticky; top:0; z-index:1; }
      .tws-schedule-table td button { background:#b33; border:none; color:white; padding:3px 6px; border-radius:4px; cursor:pointer; }
      .tws-schedule-table td button:hover{ background:#e44; }
      .tws-container details summary{ cursor:pointer; color:#ffd700; margin-top:6px; }
      .tws-status { font-size:11px; margin-top:5px; opacity:0.9; max-height:150px; overflow-y:auto; background:rgba(0,0,0,0.3); padding:4px; border-radius:5px; }
      .tws-bbcode-area { width:100%; height:100px; margin-top:4px; }
      .tws-tooltip { position: relative; display: inline-block; }
      .tws-tooltip .tws-tooltip-content { visibility: hidden; width:max-content; max-width:280px; background:#2b1b0f; color:#f5deb3; text-align:left; border:1px solid #7b5b2a; border-radius:5px; padding:5px; position:absolute; z-index:999999; bottom:100%; left:50%; transform:translateX(-50%); opacity:0; transition:opacity 0.2s; box-shadow:0 0 8px rgba(0,0,0,0.6); font-size:11px; }
      .tws-tooltip:hover .tws-tooltip-content { visibility:visible; opacity:1; }
      .tws-tooltip-content img { height:16px; vertical-align:middle; margin-right:3px; }
    </style>

    <div class="tws-toggle-tab" id="tws-toggle-tab">Painel</div>
    <h3>Agendador de Ataques</h3>

    <div style="margin-bottom:4px;">
      <label>Origem:</label><br>
      <select id="tws-select-origem" style="width:100%">
        <option value="">Selecione sua aldeia...</option>
      </select>
    </div>

    <div style="margin-bottom:4px;">
      <label>Tropa:</label>
      <details>
        <summary>Selecionar tropas</summary>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:4px">
          ${backend.TROOP_LIST.map(u=>`
            <div style="text-align:center">
              <img src="/graphic/unit/unit_${u}.png" title="${u}" style="height:18px;"><br>
              <input type="number" id="tws-${u}" min="0" value="0" style="width:45px;text-align:center">
            </div>`).join('')}
        </div>
      </details>
    </div>

    <div style="display:flex; gap:6px; margin-bottom:4px;">
      <div style="flex:1">
        <label>Destino:</label>
        <input id="tws-alvo" placeholder="400|500" style="width:50%"/>
      </div>
      <div style="flex:1">
        <label>Data/Hora:</label>
        <input id="tws-datetime" placeholder="09/11/2025 21:30:00" style="width:50%"/>
      </div>
    </div>

    <div style="display:flex; gap:6px; margin-bottom:6px;">
      <button id="tws-add" style="flex:1">➕ Acionar</button>
      <button id="tws-clear" style="flex:1">🗑️ Limpar</button>
    </div>

    <details>
      <summary>📥 Importar BBCode</summary>
      <textarea class="tws-bbcode-area" id="tws-bbcode-area" placeholder="Cole aqui o código [table]...[/table] do fórum"></textarea>
      <button id="tws-import" style="width:100%;margin-top:4px;">📤 Importar BBCode</button>
    </details>

    <div class="tws-schedule-wrapper" id="tws-schedule-wrapper">
      <table class="tws-schedule-table" id="tws-schedule-table">
        <thead>
          <tr>
            <th>Origem</th>
            <th>Destino</th>
            <th>Data/Hora</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="tws-tbody"></tbody>
      </table>
    </div>

    <div class="tws-status" id="tws-status">Aguardando agendamentos...</div>
  `;

  document.body.appendChild(panel);

  const toggle = panel.querySelector('#tws-toggle-tab');
  function updatePanelState() {
    const hidden = panel.classList.contains('tws-hidden');
    localStorage.setItem(backend.PANEL_STATE_KEY, hidden ? 'hidden' : 'visible');
    toggle.textContent = hidden ? 'Abrir' : 'Fechar';
  }
  toggle.onclick = () => { panel.classList.toggle('tws-hidden'); updatePanelState(); };
  const savedState = localStorage.getItem(backend.PANEL_STATE_KEY);
  if (savedState === 'hidden') { panel.classList.add('tws-hidden'); toggle.textContent = 'Abrir'; }
  else toggle.textContent = 'Fechar';

  // === Preencher select de aldeias ===
  const sel = panel.querySelector('#tws-select-origem');
  myVillages.forEach(v => {
    const o = document.createElement('option');
    o.value = v.id;
    o.textContent = `${v.name} (${v.coord})`;
    sel.appendChild(o);
  });

  // === Preenchimento automático de tropas ===
  sel.addEventListener('change', async () => {
    const villageId = sel.value;
    if (!villageId) return;
    try {
      UI.InfoMessage('Carregando tropas da aldeia...', 3000, 'success');
      const troops = await backend.getVillageTroops(villageId);
      if (troops) {
        for (const [unit, val] of Object.entries(troops)) {
          const input = document.getElementById('tws-' + unit);
          if (input) input.value = val;
        }
        UI.InfoMessage('Tropas preenchidas com sucesso!', 3000, 'success');
      } else {
        UI.ErrorMessage('Não foi possível carregar as tropas da aldeia.');
      }
    } catch (e) {
      console.error('Erro ao obter tropas:', e);
      UI.ErrorMessage('Erro ao carregar tropas da aldeia.');
    }
  });

  // === Funções auxiliares e eventos ===
  const el = id => panel.querySelector(id.startsWith('#') ? id : '#' + id);

  window.renderTable = function renderTable() {
    const list = backend.getList();
    const tbody = el('tws-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5"><i>Nenhum agendamento</i></td></tr>';
      return;
    }
    const now = Date.now();
    tbody.innerHTML = list.map((a, i) => {
      const troops = backend.TROOP_LIST.filter(t => a[t] > 0).map(t => `<img src="/graphic/unit/unit_${t}.png"> ${a[t]}`).join('<br>') || 'Nenhuma tropa';
      const status = a.done ? '✅ Enviado' : (backend.parseDateTimeToMs(a.datetime) - now > 0 ? `🕒 ${Math.ceil((backend.parseDateTimeToMs(a.datetime)-now)/1000)}s` : '🔥 Enviando...');
      return `<tr>
        <td class="tws-tooltip">${a.origem || a.origemId}<div class="tws-tooltip-content">${troops}</div></td>
        <td>${a.alvo}</td>
        <td>${a.datetime}</td>
        <td>${status}</td>
        <td><button data-idx="${i}" class="tws-del-btn">X</button></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('.tws-del-btn').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.idx;
        const l = backend.getList(); l.splice(i, 1); backend.setList(l);
      };
    });
  };

  backend.startScheduler();

  el('tws-add').onclick = () => {
    const selVal = sel.value;
    const alvo = backend.parseCoord(el('tws-alvo').value);
    const dt = el('tws-datetime').value.trim();
    if (!selVal || !alvo || isNaN(backend.parseDateTimeToMs(dt))) return alert('Verifique origem, coordenadas e data!');
    const origem = myVillages.find(v => v.id === selVal)?.coord || '';
    const origemId = selVal;
    const cfg = { origem, origemId, alvo, datetime: dt };
    backend.TROOP_LIST.forEach(u => cfg[u] = el('tws-' + u).value || 0);
    const list = backend.getList(); list.push(cfg); backend.setList(list);
  };

  el('tws-clear').onclick = () => {
    if (confirm('Apagar todos os agendamentos?')) {
      localStorage.removeItem(backend.STORAGE_KEY);
      renderTable();
      el('tws-status').textContent = 'Lista limpa.';
    }
  };

  el('tws-import').onclick = () => {
    const bb = el('tws-bbcode-area').value.trim();
    if (!bb) return alert('Cole o código BB primeiro!');
    const ag = backend.importarDeBBCode(bb);
    const list = backend.getList(); list.push(...ag); backend.setList(list);
    alert(`${ag.length} agendamentos importados com sucesso!`);
  };

  renderTable();
  console.log('[TWS_Frontend] painel carregado com auto-tropas.');
})();
