// ==UserScript==
// @name         TW Scheduler Avançado (Select de Aldeia Origem + Limpeza de Nome)
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Agenda múltiplos ataques com contagem regressiva, visual Tribal Wars e seletor de aldeias de origem (sem input manual), com nomes decodificados corretamente no select.
// @author       Você
// @match        https://*.tribalwars.com.br/*
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';

  const STORAGE_KEY = 'tw_scheduler_multi_v1';
  const TROOP_LIST = ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
  const world = location.hostname.split('.')[0];
  const VILLAGE_TXT_URL = `https://${world}.tribalwars.com.br/map/village.txt`;

  // === carregar village.txt e montar mapa ===
  async function loadVillageTxt() {
    const response = await fetch(VILLAGE_TXT_URL);
    const text = await response.text();
    const map = {};
    const myVillages = [];
    for (const line of text.trim().split('\n')) {
      const [id, name, x, y, playerId] = line.split(',');
      map[`${x}|${y}`] = id;
      if (playerId === game_data.player.id.toString()) {
        // 🔹 decodifica caracteres (%20 -> espaço, %5B -> [, etc.)
        const decodedName = decodeURIComponent(name);
        const cleanName = decodedName.replace(/[+]/g, '').trim(); // remove apenas "+"
        myVillages.push({ id, name: cleanName, coord: `${x}|${y}` });
      }
    }
    return { map, myVillages };
  }

  const { map: villageMap, myVillages } = await loadVillageTxt();

  // === painel ===
  const panel = document.createElement('div');
  panel.id = 'tws-panel';
  panel.innerHTML = `
    <style>
      #tws-panel {
        position: fixed;
        right: 10px;
        bottom: 10px;
        width: 440px;
        z-index: 99999;
        font-family: 'Verdana', sans-serif;
        background: url('https://dsen.innogamescdn.com/asset/efb4e9b/graphic/background/wood.jpg') #2b1b0f;
        color: #f5deb3;
        border: 2px solid #654321;
        border-radius: 8px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.7);
        padding: 10px;
      }
      #tws-panel h3 {
        margin: 0 0 6px 0;
        font-size: 15px;
        color: #ffd700;
        text-align:center;
        text-shadow: 1px 1px 2px #000;
      }
      #tws-panel input, #tws-panel select, #tws-panel button {
        border-radius: 5px;
        border: 1px solid #5c3a1e;
        background: #1e1408;
        color: #fff;
        padding: 5px;
        font-size: 12px;
      }
      #tws-panel button {
        cursor: pointer;
        background: #6b4c2a;
        color: #f8e6c2;
        transition: 0.2s;
      }
      #tws-panel button:hover { background: #8b652e; }
      #tws-schedule-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        margin-top: 8px;
      }
      #tws-schedule-table th, #tws-schedule-table td {
        border: 1px solid #3d2a12;
        padding: 4px;
        text-align: center;
      }
      #tws-schedule-table th {
        background: #3d2a12;
        color: #ffd700;
      }
      #tws-schedule-table td button {
        background: #b33;
        border: none;
        color: white;
        padding: 3px 6px;
        border-radius: 4px;
        cursor: pointer;
      }
      #tws-schedule-table td button:hover { background: #e44; }
      details summary {
        cursor:pointer;
        color:#ffd700;
        margin-top:6px;
      }
      #tws-status {
        font-size:11px;
        margin-top:5px;
        opacity:0.9;
        max-height:150px;
        overflow-y:auto;
        background:rgba(0,0,0,0.3);
        padding:4px;
        border-radius:5px;
      }
    </style>

    <h3>⚔️ TW Scheduler Avançado ⚔️</h3>

    <label for="tws-select-origem">Aldeia Origem:</label>
    <select id="tws-select-origem" style="width:100%;margin-bottom:4px">
      <option value="">Selecione sua aldeia...</option>
    </select>

    <label>Alvo (coord X|Y):</label>
    <input id="tws-alvo" placeholder="400|500" style="width:100%;margin-bottom:4px"/>

    <details>
      <summary>Selecionar tropas</summary>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:4px">
        ${TROOP_LIST.map(u => `
          <div style="text-align:center">
            <img src="/graphic/unit/unit_${u}.png" title="${u}" style="height:18px;"><br>
            <input type="number" id="tws-${u}" min="0" value="0" style="width:45px;text-align:center">
          </div>
        `).join('')}
      </div>
    </details>

    <label>Data e hora (DD/MM/AAAA HH:MM:SS)</label>
    <input id="tws-datetime" placeholder="09/11/2025 21:30:00" style="width:100%;margin-bottom:4px"/>

    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <label><input id="tws-open" type="checkbox"> Nova aba</label>
      <label><input id="tws-auto" type="checkbox"> Auto-confirmar</label>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:6px">
      <button id="tws-add" style="flex:1">➕ Adicionar</button>
      <button id="tws-clear" style="flex:1">🗑️ Limpar Todos</button>
    </div>

    <table id="tws-schedule-table">
      <thead><tr><th>Origem</th><th>Alvo</th><th>Data/Hora</th><th>Ações</th></tr></thead>
      <tbody id="tws-tbody"></tbody>
    </table>

    <div id="tws-status">Aguardando agendamentos...</div>
  `;
  document.body.appendChild(panel);

  // === preencher select com aldeias do jogador ===
  const selectOrigem = document.getElementById('tws-select-origem');
  myVillages.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id; // guardamos ID
    opt.textContent = `${v.name} (${v.coord})`;
    selectOrigem.appendChild(opt);
  });

  // === utilitários ===
  const el = id => document.getElementById(id);
  const tbody = el('tws-tbody');
  const statusEl = el('tws-status');

  const parseDateTimeToMs = str => {
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return NaN;
    const [, d, mo, y, hh, mm, ss] = m;
    return new Date(+y, +mo - 1, +d, +hh, +mm, +ss).getTime();
  };
  const parseCoord = s => s.trim().match(/^(\d+)\|(\d+)$/) ? s.trim() : null;

  const getSchedules = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const setSchedules = l => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(l));
    renderTable();
  };

  // === render tabela ===
  function renderTable() {
    const list = getSchedules();
    tbody.innerHTML = list.map((a, i) => `
      <tr>
        <td>${a.origem}</td>
        <td>${a.alvo}</td>
        <td>${a.datetime}${a.done ? ' ✅' : ''}</td>
        <td><button onclick="window.twsRemove(${i})">X</button></td>
      </tr>
    `).join('');
  }

  window.twsRemove = i => {
    const list = getSchedules();
    list.splice(i, 1);
    setSchedules(list);
  };

  // === executar envio ===
  async function executeAttack(cfg) {
    const origemId = cfg.origemId || villageMap[cfg.origem];
    if (!origemId) return alert(`Origem ${cfg.origem} não encontrada!`);
    const [x, y] = cfg.alvo.split('|');
    const url = `${location.protocol}//${location.host}/game.php?village=${origemId}&screen=place`;
    const win = window.open(url, cfg.open ? '_blank' : '_self');
    const int = setInterval(() => {
      try {
        if (!win || win.closed) return clearInterval(int);
        const doc = win.document;
        const xField = doc.querySelector('#inputx');
        if (xField) {
          xField.value = x;
          doc.querySelector('#inputy').value = y;
          TROOP_LIST.forEach(u => {
            const val = parseInt(cfg[u]) || 0;
            const input = doc.querySelector(`#unit_input_${u}`);
            if (input) input.value = val;
          });
          const atk = doc.querySelector('[name=attack]');
          if (atk) {
            atk.click();
            if (cfg.auto) {
              setTimeout(() => {
                const conf = doc.querySelector('[name=submit]');
                if (conf) conf.click();
              }, 400);
            }
          }
          clearInterval(int);
        }
      } catch {}
    }, 300);
  }

  // === agendador múltiplo ===
  function startScheduler() {
    setInterval(() => {
      const list = getSchedules();
      const now = Date.now();
      const pendingLines = [];

      for (const a of list) {
        const t = parseDateTimeToMs(a.datetime);
        if (!t || a.done) continue;
        const diff = t - now;
        if (diff <= 0 && diff > -10000) {
          a.done = true;
          executeAttack(a);
          pendingLines.push(`🔥 Ataque disparado: ${a.origem} → ${a.alvo}`);
        } else if (diff > 0) {
          pendingLines.push(`🕒 ${a.origem} → ${a.alvo} em ${Math.ceil(diff / 1000)}s`);
        }
      }

      setSchedules(list);
      statusEl.innerHTML = pendingLines.length
        ? `<strong>Aguardando:</strong><br>${pendingLines.join('<br>')}`
        : 'Sem agendamentos ativos.';
    }, 1000);
  }

  // === eventos ===
  el('tws-add').onclick = () => {
    const selectVal = el('tws-select-origem').value;
    const alvo = parseCoord(el('tws-alvo').value);
    const dt = el('tws-datetime').value.trim();

    if (!selectVal || !alvo || isNaN(parseDateTimeToMs(dt)))
      return alert('Selecione uma aldeia de origem válida e verifique coordenadas e data!');

    const origem = myVillages.find(v => v.id === selectVal)?.coord;
    const origemId = selectVal || villageMap[origem];
    const cfg = { origem, origemId, alvo, datetime: dt, open: el('tws-open').checked, auto: el('tws-auto').checked };
    TROOP_LIST.forEach(u => cfg[u] = el(`tws-${u}`).value);
    const list = getSchedules();
    list.push(cfg);
    setSchedules(list);
  };

  el('tws-clear').onclick = () => {
    if (confirm('Apagar todos os agendamentos?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderTable();
      statusEl.textContent = 'Lista limpa.';
    }
  };

  renderTable();
  startScheduler();
})();
