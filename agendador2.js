// ==UserScript==
// @name         TW Scheduler: agendamento de ataque (Place + auto-click) PT-BR
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Agenda ataques usando aldeia origem, coordenadas únicas, tropas com ícones internos do jogo e data/hora PT-BR
// @author       Você
// @match        https://brp10.tribalwars.com.br/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'tw_scheduler_config_v3';

  const TROOP_KEYS = [
    'village','coord','datetime','open_popup','auto_confirm',
    'spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'
  ];

  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.right = '12px';
  panel.style.bottom = '12px';
  panel.style.width = '380px';
  panel.style.zIndex = '999999';
  panel.style.background = '#1b1b1b';
  panel.style.color = '#fff';
  panel.style.border = '1px solid #2f2f2f';
  panel.style.borderRadius = '8px';
  panel.style.padding = '10px';
  panel.style.fontFamily = 'Arial, sans-serif';
  panel.style.fontSize = '13px';
  panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <strong>TW Scheduler</strong>
      <button id="twsched_close" style="background:#3a3a3a;color:#fff;border:none;padding:4px 6px;border-radius:4px;cursor:pointer">X</button>
    </div>

    <div style="margin-bottom:6px;">
      <label style="display:block;margin-bottom:4px">Aldeia origem (village id) <small style="opacity:0.7">(0 = usar aldeia atual)</small></label>
      <input id="twsched_village" type="number" style="width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#111;color:#fff" />
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
            <img src="/graphic/unit/unit_${u}.png" title="${u}" style="height:20px; vertical-align:middle; margin-bottom:2px;">
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
    if (!raw) return null;
    try {
      const cfg = JSON.parse(raw);
      TROOP_KEYS.forEach(k => {
        const input = el(k);
        if (!input) return;
        if (input.type === 'checkbox') input.checked = !!cfg[k];
        else input.value = cfg[k] ?? '';
      });
      return cfg;
    } catch(e) { return null; }
  }

  function defaultVillageId() {
    const m = location.search.match(/village=(\d+)/);
    return m ? m[1] : 0;
  }

  function parseDateTimeToMs(dtStr) {
    const m = dtStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return NaN;
    const [_, d, mo, y, hh, mm, ss] = m;
    return new Date(Number(y), Number(mo)-1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
  }

  function parseCoord(coordStr) {
    const m = coordStr.trim().match(/^(\d+)\|(\d+)$/);
    if (!m) return [0,0];
    return [Number(m[1]), Number(m[2])];
  }

  function buildPlaceURL(cfg) {
    const village = Number(cfg.village) || 0;
    const baseVillageParam = village > 0 ? `village=${village}&` : '';
    const [x,y] = parseCoord(cfg.coord || '');
    const troopParams = [
      `att_spear=${Number(cfg.spear||0)}`,
      `att_sword=${Number(cfg.sword||0)}`,
      `att_axe=${Number(cfg.axe||0)}`,
      `att_archer=${Number(cfg.archer||0)}`,
      `att_spy=${Number(cfg.spy||0)}`,
      `att_light=${Number(cfg.light||0)}`,
      `att_marcher=${Number(cfg.marcher||0)}`,
      `att_heavy=${Number(cfg.heavy||0)}`,
      `att_ram=${Number(cfg.ram||0)}`,
      `att_catapult=${Number(cfg.catapult||0)}`,
      `att_knight=${Number(cfg.knight||0)}`,
      `att_snob=${Number(cfg.snob||0)}`
    ].join('&');
    return `${location.protocol}//${location.host}/game.php?${baseVillageParam}screen=place&x=${x}&y=${y}&from=simulator&${troopParams}`;
  }

  function openAndMaybeAutoClick(url, autoConfirm) {
    const name = 'tw_place_window';
    let win;
    try {
      win = window.open('', name);
      if (!win || win.closed) win = window.open(url, name);
      else win.location.href = url;
    } catch(e) { location.href = url; return; }

    if (!autoConfirm) { statusEl.textContent = 'Aberto: revisar e confirmar manualmente.'; return; }

    const start = Date.now();
    const maxWait = 15000;
    const interval = setInterval(() => {
      try {
        if (!win || win.closed) { clearInterval(interval); statusEl.textContent = 'Janela fechada.'; return; }
        const doc = win.document;
        const attackBtn = doc.querySelector('[name=attack]');
        if (attackBtn && typeof attackBtn.click==='function') {
          attackBtn.click();
          statusEl.textContent = 'Click [Atacar] executado.';
          setTimeout(() => {
            const submitBtn = doc.querySelector('[name=submit]');
            if (submitBtn && typeof submitBtn.click==='function') {
              submitBtn.click();
              statusEl.textContent = 'Click [Confirmar envio] executado. Enviado!';
            }
          },600);
          clearInterval(interval);
        }
      } catch(e){}
      if(Date.now()-start>maxWait){clearInterval(interval);statusEl.textContent='Timeout: não foi possível auto-confirmar.';}
    },300);
  }

  let schedulerTimer=null;
  function startScheduler() {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = setInterval(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { statusEl.textContent='Nenhuma tarefa agendada.'; return; }
      let cfg;
      try { cfg = JSON.parse(raw); } catch(e){ statusEl.textContent='Config inválida.'; return; }
      if (!cfg.datetime) { statusEl.textContent='Data/hora não definida.'; return; }
      const targetMs=parseDateTimeToMs(cfg.datetime);
      if (isNaN(targetMs)) { statusEl.textContent='Formato de data inválido.'; return; }
      const now=Date.now();
      const diff=targetMs-now;
      if(diff>0){statusEl.textContent=`Aguardando execução em ${Math.floor(diff/1000)} s (${cfg.datetime})`;}
      else if(diff<=0 && diff>-30000){
        localStorage.removeItem(STORAGE_KEY);
        const url=buildPlaceURL(cfg);
        statusEl.textContent='Hora alcançada. Abrindo tela...';
        if(cfg.open_popup==='true'||cfg.open_popup===true||cfg.open_popup==='on'){openAndMaybeAutoClick(url,cfg.auto_confirm==='true'||cfg.auto_confirm===true||cfg.auto_confirm==='on');}
        else location.href=url;
      } else if(diff<=-30000){ localStorage.removeItem(STORAGE_KEY); statusEl.textContent='Tarefa expirada e removida.';}
    },1000);
  }

  document.getElementById('twsched_save').onclick = () => {
    const dt = el('datetime').value.trim();
    if(!dt){alert('Informe data e hora no formato: DD/MM/AAAA HH:MM:SS'); return;}
    if(isNaN(parseDateTimeToMs(dt))){alert('Formato de data/hora inválido. Use: DD/MM/AAAA HH:MM:SS'); return;}
    saveConfig();
    statusEl.textContent='Agendado para: '+dt;
    startScheduler();
  };

  document.getElementById('twsched_clear').onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    TROOP_KEYS.forEach(k=>{const i=el(k);if(!i)return;if(i.type==='checkbox')i.checked=false;else i.value='';});
    el('village').value=defaultVillageId();
    statusEl.textContent='Configuração limpa.';
  };

  el('village').value=defaultVillageId();
  loadConfig();
  startScheduler();

  statusEl.textContent='Pronto. Preencha e clique em "Salvar & Agendar".';

})();
