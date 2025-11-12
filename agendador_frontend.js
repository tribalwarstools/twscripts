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
  panel.className = 'tws-tribal-theme';
  panel.innerHTML = `
    <style>
      .tws-tribal-theme {
        --color-primary: #8b4513;
        --color-secondary: #654321;
        --color-accent: #cd853f;
        --color-dark: #3e2723;
        --color-light: #f5deb3;
        --color-success: #8fbc8f;
        --color-warning: #daa520;
        --color-error: #cd5c5c;
        --border-radius: 8px;
        --shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
      }

      #tws-panel {
        position: fixed;
        right: -480px;
        bottom: 80px;
        width: 460px;
        background: linear-gradient(145deg, var(--color-dark), #2c1e17);
        color: var(--color-light);
        border: 3px solid var(--color-accent);
        font-family: 'Trebuchet MS', sans-serif;
        font-size: 13px;
        padding: 15px;
        z-index: 9999;
        border-radius: var(--border-radius) 0 0 var(--border-radius);
        box-shadow: var(--shadow);
        transition: right 0.4s ease-in-out;
        max-height: 80vh;
        overflow-y: auto;
      }

      #tws-panel.panel-visible {
        right: 0;
      }

      #tws-panel.panel-hidden {
        right: -480px;
      }

      .tws-toggle-tab {
        position: fixed;
        right: 0;
        top: 20%;
        transform: translateY(-50%);
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        color: var(--color-light);
        padding: 15px 8px;
        border-radius: var(--border-radius) 0 0 var(--border-radius);
        cursor: pointer;
        z-index: 10000;
        font-family: 'Trebuchet MS', sans-serif;
        font-weight: bold;
        font-size: 14px;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        box-shadow: var(--shadow);
        border: 2px solid var(--color-accent);
        border-right: none;
        transition: all 0.3s ease;
      }

      .tws-toggle-tab:hover {
        background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
        padding-right: 12px;
      }

      .tws-header {
        text-align: center;
        margin: 0 0 12px 0;
        font-size: 16px;
        color: var(--color-light);
        background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
        padding: 8px;
        border-radius: var(--border-radius);
        border: 1px solid var(--color-accent);
        position: relative;
      }

      .tws-header::before {
        content: '🏹';
        margin-right: 8px;
      }

      .tws-header::after {
        content: '🏹';
        margin-left: 8px;
      }

      .tws-controls-section {
        background: rgba(139, 69, 19, 0.2);
        border: 1px solid var(--color-primary);
        border-radius: var(--border-radius);
        padding: 12px;
        margin-bottom: 12px;
      }

      .tws-section-title {
        font-weight: bold;
        color: var(--color-accent);
        margin-bottom: 8px;
        font-size: 14px;
        border-bottom: 1px solid var(--color-primary);
        padding-bottom: 4px;
      }

      .tws-input-group {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
      }

      .tws-input-group label {
        font-weight: bold;
        color: var(--color-accent);
        flex-shrink: 0;
      }

      #tws-select-origem, #tws-alvo, #tws-datetime {
        width: 100%;
        text-align: center;
        background: var(--color-dark);
        border: 1px solid var(--color-primary);
        color: var(--color-light);
        border-radius: 4px;
        padding: 6px;
        font-family: 'Trebuchet MS', sans-serif;
      }

      .tws-troops-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 8px;
        margin-top: 8px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        border: 1px solid var(--color-primary);
      }

      .tws-troop-item {
        text-align: center;
      }

      .tws-troop-item img {
        height: 20px;
        margin-bottom: 4px;
      }

      .tws-troop-input {
        width: 45px;
        text-align: center;
        background: var(--color-dark);
        border: 1px solid var(--color-primary);
        color: var(--color-light);
        border-radius: 4px;
        padding: 2px;
      }

      .tws-buttons-row {
        display: flex;
        gap: 8px;
        margin: 12px 0;
      }

      .tws-button {
        flex: 1;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        border: 1px solid var(--color-accent);
        color: var(--color-light);
        padding: 8px 12px;
        border-radius: var(--border-radius);
        cursor: pointer;
        font-family: 'Trebuchet MS', sans-serif;
        font-weight: bold;
        font-size: 12px;
        transition: all 0.2s;
      }

      .tws-button:hover {
        background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }

      .tws-button:active {
        transform: translateY(0);
      }

      .tws-button-add {
        background: linear-gradient(135deg, #2e8b57, #3cb371);
      }

      .tws-button-clear {
        background: linear-gradient(135deg, #b22222, #dc143c);
      }

      .tws-button-import {
        background: linear-gradient(135deg, #daa520, #ffd700);
        color: var(--color-dark);
        width: 100%;
        margin-top: 8px;
      }

      .tws-bbcode-area {
        width: 100%;
        height: 80px;
        background: var(--color-dark);
        border: 1px solid var(--color-primary);
        color: var(--color-light);
        border-radius: 4px;
        padding: 6px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        margin-top: 8px;
        resize: vertical;
      }

      .tws-schedule-wrapper {
        max-height: 270px;
        overflow-y: auto;
        border: 1px solid var(--color-primary);
        border-radius: var(--border-radius);
        margin-top: 8px;
        background: rgba(0, 0, 0, 0.3);
      }

      .tws-schedule-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }

      .tws-schedule-table th {
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        color: var(--color-light);
        padding: 6px;
        text-align: center;
        position: sticky;
        top: 0;
        z-index: 1;
        border: 1px solid var(--color-accent);
      }

      .tws-schedule-table td {
        padding: 4px;
        text-align: center;
        border: 1px solid var(--color-primary);
      }

      .tws-schedule-table tr:nth-child(even) {
        background: rgba(139, 69, 19, 0.1);
      }

      .tws-schedule-table tr:hover {
        background: rgba(205, 133, 63, 0.2);
      }

      .tws-del-btn {
        background: linear-gradient(135deg, #b22222, #dc143c);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }

      .tws-del-btn:hover {
        background: linear-gradient(135deg, #dc143c, #ff4444);
        transform: scale(1.05);
      }

      .tws-status {
        font-size: 11px;
        margin-top: 8px;
        padding: 6px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid var(--color-primary);
        border-radius: var(--border-radius);
        color: var(--color-accent);
        max-height: 80px;
        overflow-y: auto;
      }

      .tws-tooltip {
        position: relative;
        display: inline-block;
        cursor: help;
      }

      .tws-tooltip .tws-tooltip-content {
        visibility: hidden;
        width: max-content;
        max-width: 280px;
        background: var(--color-dark);
        color: var(--color-light);
        text-align: left;
        border: 1px solid var(--color-accent);
        border-radius: var(--border-radius);
        padding: 8px;
        position: absolute;
        z-index: 999999;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.3s;
        box-shadow: var(--shadow);
        font-size: 11px;
      }

      .tws-tooltip:hover .tws-tooltip-content {
        visibility: visible;
        opacity: 1;
      }

      .tws-tooltip-content img {
        height: 16px;
        vertical-align: middle;
        margin-right: 3px;
      }

      .scrollbar-custom::-webkit-scrollbar {
        width: 8px;
      }

      .scrollbar-custom::-webkit-scrollbar-track {
        background: var(--color-dark);
        border-radius: 4px;
      }

      .scrollbar-custom::-webkit-scrollbar-thumb {
        background: var(--color-primary);
        border-radius: 4px;
      }

      .scrollbar-custom::-webkit-scrollbar-thumb:hover {
        background: var(--color-accent);
      }

      details summary {
        cursor: pointer;
        color: var(--color-accent);
        font-weight: bold;
        margin-bottom: 6px;
      }

      details[open] summary {
        margin-bottom: 8px;
      }
    </style>

    <div class="tws-toggle-tab" id="tws-toggle-tab">AGENDADOR TRIBAL</div>
    
    <div class="tws-header">🏹 Agendador de Ataques Tribal</div>

    <div class="tws-controls-section">
      <div class="tws-section-title">📍 Aldeia de Origem</div>
      <select id="tws-select-origem">
        <option value="">Selecione sua aldeia...</option>
      </select>
    </div>

    <div class="tws-controls-section">
      <div class="tws-section-title">⚔️ Composição do Exército</div>
      <details>
        <summary>Selecionar tropas para a batalha</summary>
        <div class="tws-troops-grid">
          ${backend.TROOP_LIST.map(u => `
            <div class="tws-troop-item">
              <img src="/graphic/unit/unit_${u}.png" title="${u}"><br>
              <input type="number" id="tws-${u}" min="0" value="0" class="tws-troop-input">
            </div>
          `).join('')}
        </div>
      </details>
    </div>

    <div class="tws-controls-section">
      <div class="tws-section-title">🎯 Alvo e Tempo</div>
      <div class="tws-input-group">
        <label for="tws-alvo">Coordenadas do Alvo:</label>
        <input id="tws-alvo" placeholder="400|500">
      </div>
      <div class="tws-input-group">
        <label for="tws-datetime">Data/Hora do Ataque:</label>
        <input id="tws-datetime" placeholder="09/11/2025 21:30:00">
      </div>
    </div>

    <div class="tws-controls-section">
      <div class="tws-section-title">⚙️ Comandos</div>
      <div class="tws-buttons-row">
        <button id="tws-add" class="tws-button tws-button-add">🎯 Agendar Ataque</button>
        <button id="tws-clear" class="tws-button tws-button-clear">🗑️ Limpar Tudo</button>
      </div>
    </div>

    <div class="tws-controls-section">
      <div class="tws-section-title">📥 Importação Rápida</div>
      <details>
        <summary>Importar plano de batalha (BBCode)</summary>
        <textarea class="tws-bbcode-area" id="tws-bbcode-area" placeholder="Cole aqui o código [table]...[/table] do fórum tribal"></textarea>
        <button id="tws-import" class="tws-button tws-button-import">📤 Importar BBCode</button>
      </details>
    </div>

    <div class="tws-controls-section">
      <div class="tws-section-title">📋 Missões Agendadas</div>
      <div class="tws-schedule-wrapper scrollbar-custom">
        <table class="tws-schedule-table">
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
    </div>

    <div class="tws-controls-section">
      <div class="tws-section-title">📊 Status do Campo de Batalha</div>
      <div class="tws-status scrollbar-custom" id="tws-status">⚔️ Aguardando agendamentos de batalha...</div>
    </div>
  `;

  document.body.appendChild(panel);

  // === Controle de visibilidade do painel ===
  const toggle = panel.querySelector('#tws-toggle-tab');
  let panelVisible = localStorage.getItem('tws_panel_visible') === 'true';
  
  function updatePanelState() {
    if (panelVisible) {
      panel.classList.remove('panel-hidden');
      panel.classList.add('panel-visible');
      toggle.textContent = '⬅️ OCULTAR';
    } else {
      panel.classList.remove('panel-visible');
      panel.classList.add('panel-hidden');
      toggle.textContent = 'AGENDADOR TRIBAL';
    }
    localStorage.setItem('tws_panel_visible', panelVisible.toString());
  }
  
  toggle.onclick = () => {
    panelVisible = !panelVisible;
    updatePanelState();
  };

  // Inicializar visibilidade
  updatePanelState();

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
      showStatusMessage('⚔️ Carregando exército da aldeia...', 'info');
      const troops = await backend.getVillageTroops(villageId);
      if (troops) {
        for (const [unit, val] of Object.entries(troops)) {
          const input = document.getElementById('tws-' + unit);
          if (input) input.value = val;
        }
        showStatusMessage('✅ Exército carregado com sucesso!', 'success');
      } else {
        showStatusMessage('⚠️ Não foi possível carregar o exército da aldeia.', 'warning');
      }
    } catch (e) {
      console.error('Erro ao obter tropas:', e);
      showStatusMessage('❌ Erro ao carregar exército da aldeia.', 'error');
    }
  });

  // === Funções auxiliares ===
  const el = id => panel.querySelector(id.startsWith('#') ? id : '#' + id);

  function showStatusMessage(message, type = 'info') {
    const statusEl = el('tws-status');
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : '⚔️';
    statusEl.innerHTML = `<strong>${icon} [${timestamp}]</strong> ${message}`;
  }

  window.renderTable = function renderTable() {
    const list = backend.getList();
    const tbody = el('tws-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5"><i>⚔️ Nenhuma missão agendada</i></td></tr>';
      return;
    }
    const now = Date.now();
    tbody.innerHTML = list.map((a, i) => {
      const troops = backend.TROOP_LIST.filter(t => a[t] > 0).map(t => `<img src="/graphic/unit/unit_${t}.png"> ${a[t]}`).join('<br>') || '🏃 Nenhuma tropa';
      const timeDiff = backend.parseDateTimeToMs(a.datetime) - now;
      let status = '';
      
      if (a.done) {
        status = '✅ Missão Concluída';
      } else if (timeDiff > 0) {
        const minutes = Math.ceil(timeDiff / 60000);
        status = `🕒 ${minutes}min`;
      } else {
        status = '🔥 Executando...';
      }
      
      return `<tr>
        <td class="tws-tooltip">${a.origem || a.origemId}
          <div class="tws-tooltip-content">${troops}</div>
        </td>
        <td>${a.alvo}</td>
        <td>${a.datetime}</td>
        <td>${status}</td>
        <td><button data-idx="${i}" class="tws-del-btn">X</button></td>
      </tr>`;
    }).join('');
    
    tbody.querySelectorAll('.tws-del-btn').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.idx;
        const l = backend.getList(); 
        l.splice(i, 1); 
        backend.setList(l);
        renderTable();
        showStatusMessage('🗑️ Missão removida do planejamento.', 'warning');
      };
    });
  };

  // === Inicializar scheduler ===
  backend.startScheduler();

  // === Event Listeners ===
  el('tws-add').onclick = () => {
    const selVal = sel.value;
    const alvo = backend.parseCoord(el('tws-alvo').value);
    const dt = el('tws-datetime').value.trim();
    
    if (!selVal || !alvo) {
      showStatusMessage('❌ Verifique origem e coordenadas do alvo!', 'error');
      return;
    }
    
    if (isNaN(backend.parseDateTimeToMs(dt))) {
      showStatusMessage('❌ Data/hora inválida! Use formato: DD/MM/AAAA HH:MM:SS', 'error');
      return;
    }
    
    const origem = myVillages.find(v => v.id === selVal)?.coord || '';
    const origemId = selVal;
    const cfg = { origem, origemId, alvo, datetime: dt };
    
    backend.TROOP_LIST.forEach(u => cfg[u] = parseInt(el('tws-' + u).value) || 0);
    
    const list = backend.getList(); 
    list.push(cfg); 
    backend.setList(list);
    renderTable();
    
    showStatusMessage(`✅ Missão agendada! ${origem} → ${alvo} às ${dt}`, 'success');
    
    // Limpar campos
    el('tws-alvo').value = '';
    el('tws-datetime').value = '';
  };

  el('tws-clear').onclick = () => {
    if (confirm('⚔️ Tem certeza que deseja apagar TODAS as missões agendadas?')) {
      localStorage.removeItem(backend.STORAGE_KEY);
      renderTable();
      showStatusMessage('🗑️ Todas as missões foram removidas.', 'warning');
    }
  };

  el('tws-import').onclick = () => {
    const bb = el('tws-bbcode-area').value.trim();
    if (!bb) {
      showStatusMessage('❌ Cole o código BB primeiro!', 'error');
      return;
    }
    
    try {
      const ag = backend.importarDeBBCode(bb);
      const list = backend.getList(); 
      list.push(...ag); 
      backend.setList(list);
      renderTable();
      
      showStatusMessage(`✅ ${ag.length} missões importadas com sucesso!`, 'success');
      el('tws-bbcode-area').value = '';
    } catch (e) {
      showStatusMessage('❌ Erro ao importar BBCode. Verifique o formato.', 'error');
    }
  };

  // === Inicialização ===
  renderTable();
  showStatusMessage('🏹 Agendador Tribal carregado e pronto para batalha!', 'success');
  console.log('[TWS_Frontend] Agendador Tribal carregado com sucesso.');

})();
