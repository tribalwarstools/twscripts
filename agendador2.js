// ==UserScript==
// @name         TW Scheduler: agendamento de ataque (origem por coordenada)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Agenda ataques digitando coordenada da aldeia origem (busca ID via village.txt automaticamente)
// @author       Você
// @match        https://*.tribalwars.com.br/*
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';

  const STORAGE_KEY = 'tw_scheduler_config_v4';
  const TROOP_KEYS = [
    'coord_origem','coord','datetime','open_popup','auto_confirm',
    'spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'
  ];

  // === carregar village.txt ===
  const world = location.hostname.split('.')[0];
  const VILLAGE_TXT_URL = `https://${world}.tribalwars.com.br/map/village.txt`;

  async function loadVillageTxt() {
    const response = await fetch(VILLAGE_TXT_URL);
    const text = await response.text();
    const lines = text.trim().split('\n');
    const map = {};
    for (const line of lines) {
      const [id, name, x, y] = line.split(',');
      map[`${x}|${y}`] = id;
    }
    return map;
  }
  const villageMap = await loadVillageTxt();

  // === painel ===
  const panel = document.createElement('div');
  panel.style = `
    position:fixed;right:12px;bottom:12px;width:380px;z-index:999999;
    background:#1b1b1b;color:#fff;border:1px solid #2f2f2f;border-radius:8px;
    padding:10px;font-family:Arial,sans-serif;font-size:13px;box-shadow:0 6px 18px rgba(0,0,0,0.6);
  `;
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <strong>TW Scheduler</strong>
      <button id="twsched_close" style="background:#3a3a3a;color:#fff;border:none;padding:4px 6px;border-radius:4px;cursor:pointer">X</button>
    </div>

    <div style="margin-bottom:6px;">
      <label style="display:block;margin-bottom:4px">Aldeia origem (coordenada X|Y)</label>
      <input id="twsched_coord_origem" type="text" placeholder="500|500" style="width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#111;color:#fff" />
    </div>

    <div style="margin-bottom:6px;">
      <label style="display:block;margin-bottom:4px">Coordenadas do alvo (X|Y)</label>
      <input id="twsched_coord" type="text" placeholder="400|500" style="width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#111;color:#fff" />
    </div>

    <details style="margin-bottom:6px">
      <summary style="cursor:pointer;padding:6px 0">Tropas (deixe 0 se não enviar)</summary>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:6px">
        ${['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'].map(u => `
          <div style="display:flex;flex-direction:column;align-items:center">
            <img src="/graphic/unit/unit_${u}.png" title="${u}" style="height:20px;margin-bottom:2px;">
            <input id="twsched_${u}" type="number" min="0" value="0" style="width:40px;padding:2px;border-radius:4px;border:1px solid #333;background:#111;color:#fff;text-align:center" />
          </div>
        `).join('')}
      </div>
    </details>

    <div style="margin-bottom:6px;">
      <label>Data e hora (DD/MM/AAAA HH:MM:SS)</label>
      <input id="twsched_datetime" type="text" placeholder="09/11/2025 15:30:00" style="width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#111;color:#fff" />
    </div>

    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <label style="display:flex;align-items:center;gap:6px"><input id="twsched_open_popup" type="checkbox" /> Abrir em nova aba</label>
      <label style="display:flex;align-items:center;gap:6px;margin-left:auto"><input id="twsched_auto_confirm" type="checkbox" /> Confirmar auto</label>
    </div>

    <div style="display:flex;gap:6px">
      <button id="twsched_save" style="flex:1;padding:8px;border-radius:6px;border:none;cursor:pointer;background:#2d8cff;color:#fff">Salvar & Agendar</button>
      <button id="twsched_clear" style="flex:1;padding:8px;border-radius:6px;border:none;cursor:pointer;background:#555;color:#fff">Limpar</button>
    </div>

    <div id="twsched_status" style="margin-top:8px;font-size:12px;opacity:0.9"></div>
  `;
  document.body.appendChild(panel);

  const el = id => document.getElementById('twsched_' + id);
  const statusEl = document.getElementById('twsched_status');
  document.getElementById('twsched_close').onclick = () => panel.style.display = 'none';

  // === salvar e carregar ===
  function saveConfig() {
    const cfg = {};
    TROOP_KEYS.forEach(k => {
      const input = el(k);
      if (!input) return;
      cfg[k] = input.type === 'checkbox' ? input.checked : input.value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return cfg;
  }

  function loadConfig() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const cfg = JSON.parse(raw);
      TROOP_KEYS.forEach(k => {
        const input = el(k);
        if (!input) return;
        if (input.type === 'checkbox') input.checked = !!cfg[k];
        else input.value = cfg[k] ?? '';
      });
    } catch {}
  }

  function parseDateTimeToMs(dtStr) {
    const m = dtStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return NaN;
    const [_, d, mo, y, hh, mm, ss] = m;
    return new Date(+y, +mo - 1, +d, +hh, +mm, +ss).getTime();
  }

  function parseCoord(coordStr) {
    const m = coordStr.trim().match(/^(\d+)\|(\d+)$/);
    return m ? [m[1], m[2]] : [0, 0];
  }

  async function coordToVillageId(coordStr) {
    return villageMap[coordStr.trim()] || null;
  }

  // === Executa ataque ===
  async function executeAttack(cfg) {
    const origemCoord = cfg.coord_origem?.trim();
    const origemId = await coordToVillageId(origemCoord);
    if (!origemId) return alert('Aldeia de origem não encontrada!');

    const [x, y] = parseCoord(cfg.coord || '');
    const url = `${location.protocol}//${location.host}/game.php?village=${origemId}&screen=place`;

    const win = window.open(url, '_blank');
    statusEl.textContent = 'Abrindo tela de envio...';

    const checkReady = setInterval(() => {
      try {
        if (!win || win.closed) return clearInterval(checkReady);
        const doc = win.document;
        const coordInput = doc.querySelector('#inputx');
        if (coordInput) {
          // preencher coordenadas alvo
          doc.querySelector('#inputx').value = x;
          doc.querySelector('#inputy').value = y;

          // preencher tropas
          for (const t of ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob']) {
            const val = parseInt(cfg[t]) || 0;
            const field = doc.querySelector(`#unit_input_${t}`);
            if (field) field.value = val;
          }

          // clicar em atacar
          const attackBtn = doc.querySelector('[name=attack]');
          if (attackBtn) {
            attackBtn.click();

            if (cfg.auto_confirm) {
              setTimeout(() => {
                const confirm = doc.querySelector('[name=submit]');
                if (confirm) confirm.click();
              }, 500);
            }
          }
          clearInterval(checkReady);
        }
      } catch {}
    }, 300);
  }

  // === Agendador ===
  function startScheduler() {
    const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!cfg.datetime) return;
    const target = parseDateTimeToMs(cfg.datetime);
    const timer = setInterval(async () => {
      const diff = target - Date.now();
      if (diff > 0) {
        statusEl.textContent = `Aguardando: ${Math.ceil(diff / 1000)}s (${cfg.datetime})`;
      } else if (diff <= 0 && diff > -15000) {
        clearInterval(timer);
        localStorage.removeItem(STORAGE_KEY);
        await executeAttack(cfg);
        statusEl.textContent = 'Envio executado!';
      } else if (diff < -15000) {
        clearInterval(timer);
        statusEl.textContent = 'Tarefa expirada.';
      }
    }, 1000);
  }

  // === Botões ===
  document.getElementById('twsched_save').onclick = () => {
    const dt = el('datetime').value.trim();
    if (!dt || isNaN(parseDateTimeToMs(dt))) return alert('Data/hora inválida.');
    saveConfig();
    startScheduler();
    statusEl.textContent = 'Tarefa agendada.';
  };

  document.getElementById('twsched_clear').onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    TROOP_KEYS.forEach(k => { const i = el(k); if (i) i.value = ''; });
    statusEl.textContent = 'Configuração limpa.';
  };

  // inicialização
  loadConfig();
  startScheduler();
  statusEl.textContent = 'Pronto. Preencha e clique em "Salvar & Agendar".';
})();
