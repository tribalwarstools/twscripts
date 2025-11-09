//==UserScript==
// @name         TW Scheduler: agendamento de ataque (Place + auto-click)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Agenda um envio para uma data/hora informada, abre a tela /screen=place com tropas preenchidas e opcionalmente clica em "Atacar" e "Confirmar envio" automaticamente.
// @author       Você
// @match        https://brp10.tribalwars.com.br/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ---------- Config padrão ---------- */
  const STORAGE_KEY = 'tw_scheduler_config_v1';

  /* ---------- Helpers ---------- */
  function byName(n, doc = document) { return doc.getElementsByName(n)[0]; }
  function qs(sel, doc = document) { return doc.querySelector(sel); }
  function formatTwo(n){ return (n<10? '0':'')+n; }

  /* ---------- UI (painel flutuante) ---------- */
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.right = '12px';
  panel.style.bottom = '12px';
  panel.style.width = '340px';
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
    <div style="display:flex;gap:6px;margin-bottom:6px;">
      <div style="flex:1">
        <label>X</label>
        <input id="twsched_x" type="number" style="width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#111;color:#fff" />
      </div>
      <div style="flex:1">
        <label>Y</label>
        <input id="twsched_y" type="number" style="width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#111;color:#fff" />
      </div>
    </div>

    <details style="margin-bottom:6px">
      <summary style="cursor:pointer;padding:6px 0">Tropas (deixe 0 se não enviar)</summary>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px">
        ${['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'].map(u => `
          <div style="display:flex;flex-direction:column">
            <label style="font-size:11px">${u}</label>
            <input id="twsched_${u}" type="number" min="0" value="0" style="padding:6px;border-radius:4px;border:1px solid #333;background:#111;color:#fff" />
          </div>
        `).join('')}
      </div>
    </details>

    <div style="margin-bottom:6px;">
      <label>Data e hora (AAAA-MM-DD HH:MM:SS)</label>
      <input id="twsched_datetime" type="text" placeholder="2025-11-09 09:15:00" style="width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#111;color:#fff" />
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

  // elementos
  const el = id => document.getElementById('twsched_' + id);
  const statusEl = document.getElementById('twsched_status');
  document.getElementById('twsched_close').onclick = () => panel.style.display = 'none';

  // populate tropas array keys
  const TROOP_KEYS = ['village','x','y','datetime','open_popup','auto_confirm','spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];

  // load/save
  function saveConfig() {
    const cfg = {};
    TROOP_KEYS.forEach(k => {
      const input = el(k);
      if (!input) return;
      if (input.type === 'checkbox') cfg[k] = input.checked;
      else cfg[k] = input.value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return cfg;
  }
  function loadConfig() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { const cfg = JSON.parse(raw);
      TROOP_KEYS.forEach(k => {
        const input = el(k);
        if (!input) return;
        if (input.type === 'checkbox') input.checked = !!cfg[k];
        else input.value = cfg[k] ?? '';
      });
      return cfg;
    } catch (e) { return null; }
  }

  // preencher village atual por padrão
  function defaultVillageId() {
    // tenta extrair village id da URL atual
    const m = location.search.match(/village=(\d+)/);
    return m ? m[1] : 0;
  }

  // construir URL /game.php?... com tropas
  function buildPlaceURL(cfg) {
    const village = (Number(cfg.village) || 0);
    const baseVillageParam = village > 0 ? `village=${village}&` : '';
    const x = Number(cfg.x) || 0;
    const y = Number(cfg.y) || 0;
    const coords = `x=${x}&y=${y}`;
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

    // from=simulator para manter o mesmo padrão que seu exemplo (opcional)
    const url = `${location.protocol}//${location.host}/game.php?${baseVillageParam}screen=place&${coords}&from=simulator&${troopParams}`;
    return url;
  }

  // tentar transformar string datetime em epoch ms
  function parseDateTimeToMs(dtStr) {
    // aceitar formato "YYYY-MM-DD HH:MM:SS"
    const m = dtStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return NaN;
    const [_, y, mo, d, hh, mm, ss] = m;
    // cria Date no timezone local do usuário
    return new Date(Number(y), Number(mo)-1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
  }

  // função que abre a URL e tenta auto-click
  function openAndMaybeAutoClick(url, autoConfirm) {
    // abrir nova janela nomeada para poder reusar
    const name = 'tw_place_window';
    let win;
    try {
      win = window.open('', name);
      if (!win || win.closed) {
        win = window.open(url, name);
      } else {
        // navegar na janela já aberta
        win.location.href = url;
      }
    } catch (e) {
      // fallback: navegar na mesma aba
      console.warn('Popup bloqueado ou erro ao abrir, navegando na mesma aba.', e);
      if (confirm('Não foi possível abrir nova aba. Deseja abrir na mesma aba agora?')) {
        location.href = url;
        return;
      } else return;
    }

    if (!autoConfirm) {
      statusEl.textContent = 'Aberto: revisar e confirmar manualmente.';
      return;
    }

    // aguardar carregamento da página e tentar clicar com segurança
    const start = Date.now();
    const maxWait = 15000; // 15s
    const interval = setInterval(() => {
      try {
        if (!win || win.closed) {
          clearInterval(interval);
          statusEl.textContent = 'Janela fechada antes da confirmação automática.';
          return;
        }
        const doc = win.document;
        // checar se existe o botão ataque e se está visível
        const attackBtn = doc.querySelector('[name=attack]');
        if (attackBtn && typeof attackBtn.click === 'function') {
          // clicar ataque
          attackBtn.click();
          statusEl.textContent = 'Click [Atacar] executado. Aguardando botão [Confirmar envio]...';
          // aguardar e tentar clicar submit (name=submit)
          setTimeout(() => {
            try {
              const submitBtn = doc.querySelector('[name=submit]');
              if (submitBtn && typeof submitBtn.click === 'function') {
                submitBtn.click();
                statusEl.textContent = 'Click [Confirmar envio] executado. Enviado!';
              } else {
                statusEl.textContent = 'Botão [Confirmar envio] não encontrado automaticamente. Confirme manualmente.';
              }
            } catch (e) {
              console.error('Erro ao tentar clicar confirm', e);
              statusEl.textContent = 'Erro ao clicar [Confirmar envio]. Veja console.';
            }
          }, 600); // espera 600ms entre os cliques
          clearInterval(interval);
          return;
        }

        // às vezes o jogo usa forms dinamicamente; tentar também por id ou botão com texto
        const attackAlt = Array.from(doc.querySelectorAll('button, input[type=button], input[type=submit]')).find(b => /atacar/i.test(b.innerText || b.value || ''));
        if (attackAlt) {
          attackAlt.click();
          statusEl.textContent = 'Click [Atacar] (alternativo) executado.';
          setTimeout(() => {
            try {
              const submitBtn = doc.querySelector('[name=submit]');
              if (submitBtn && typeof submitBtn.click === 'function') submitBtn.click();
              statusEl.textContent = 'Confirm enviado (alternativo).';
            } catch (e) { statusEl.textContent = 'Não foi possível clicar confirm automaticamente.'; }
          }, 600);
          clearInterval(interval);
          return;
        }
      } catch (e) {
        // acesso ao documento pode falhar enquanto a página carrega; ignorar
      }

      if (Date.now() - start > maxWait) {
        clearInterval(interval);
        statusEl.textContent = 'Timeout: não foi possível encontrar botões para auto-confirmar. Verifique a tela manualmente.';
      }
    }, 300);
  }

  // rotina de agendamento (verifica uma vez por segundo)
  let schedulerTimer = null;
  function startScheduler() {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = setInterval(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        statusEl.textContent = 'Nenhuma tarefa agendada.';
        return;
      }
      let cfg;
      try { cfg = JSON.parse(raw); } catch (e) { statusEl.textContent = 'Config inválida.'; return; }
      if (!cfg.datetime) { statusEl.textContent = 'Data/hora não definida.'; return; }
      const targetMs = parseDateTimeToMs(cfg.datetime);
      if (isNaN(targetMs)) { statusEl.textContent = 'Formato de data inválido.'; return; }
      const now = Date.now();
      const diff = targetMs - now;
      if (diff > 0) {
        const s = Math.floor(diff/1000);
        statusEl.textContent = `Aguardando execução em ${s} s (${cfg.datetime})`;
      } else if (diff <= 0 && diff > -30000) { // executar se passou menos de 30s (uma tolerância)
        // evitar re-execução: remover datetime antes de executar
        try {
          const toExecute = cfg;
          // marca como executado temporariamente
          localStorage.removeItem(STORAGE_KEY);
          const url = buildPlaceURL(toExecute);
          statusEl.textContent = 'Hora alcançada. Abrindo tela...';
          if (toExecute.open_popup === 'true' || toExecute.open_popup === true || toExecute.open_popup === 'on') {
            openAndMaybeAutoClick(url, (toExecute.auto_confirm === 'true' || toExecute.auto_confirm === true || toExecute.auto_confirm === 'on'));
          } else {
            // navegar mesma aba
            location.href = url;
            if (toExecute.auto_confirm) {
              // abrirAndMaybeAutoClick fallback: depois que a navegação ocorrer, este script pode não estar no contexto da nova tela (dependendo de route do jogo).
              // portanto, no caso de navegar na mesma aba, avisar o usuário para habilitar auto-confirm apenas se souber que o script será carregado lá.
              statusEl.textContent = 'Navegando para a tela. Se desejar auto-confirmar, habilite "Abrir em nova aba" ou use a função do lado da tela de place.';
            } else {
              statusEl.textContent = 'Navegando para a tela para revisão manual.';
            }
          }
        } catch (e) {
          console.error(e);
          statusEl.textContent = 'Erro ao executar a tarefa. Veja console.';
        }
      } else {
        // já passou muito tempo (mais de 30s) — considerar expirado
        // limpar e avisar
        if (diff <= -30000) {
          localStorage.removeItem(STORAGE_KEY);
          statusEl.textContent = 'Tarefa expirada e removida (passou mais de 30s).';
        }
      }
    }, 1000);
  }

  // botões
  document.getElementById('twsched_save').onclick = () => {
    // validar datetime
    const dt = el('datetime').value.trim();
    if (!dt) {
      alert('Informe data e hora no formato: AAAA-MM-DD HH:MM:SS');
      return;
    }
    if (isNaN(parseDateTimeToMs(dt))) {
      alert('Formato de data/hora inválido. Use: AAAA-MM-DD HH:MM:SS (ex: 2025-11-09 09:15:00)');
      return;
    }
    // salvar
    const cfg = saveConfig();
    statusEl.textContent = 'Agendado para: ' + cfg.datetime;
    startScheduler();
  };
  document.getElementById('twsched_clear').onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    TROOP_KEYS.forEach(k => { const input = el(k); if (!input) return; if (input.type === 'checkbox') input.checked = false; else input.value = ''; });
    // reaplicar village atual padrão
    el('village').value = defaultVillageId();
    statusEl.textContent = 'Configuração limpa.';
  };

  // iniciar preenchimento inicial
  el('village').value = defaultVillageId();
  loadConfig();
  startScheduler();

  // dica: se o usuário abrir uma URL /game.php?screen=place com parâmetros, vamos deixar uma opção para auto-preencher o formulário (útil se você quiser confirmar manualmente)
  // adicionar listener para detectar se estamos na tela place com parâmetros att_...
  if (location.search.includes('screen=place')) {
    // tenta preencher inputs da tela place com base na querystring (caso o TW não tenha feito isso)
    try {
      const params = new URLSearchParams(location.search);
      const troopMap = {
        spear: 'att_spear', sword: 'att_sword', axe: 'att_axe', archer: 'att_archer',
        spy: 'att_spy', light: 'att_light', marcher: 'att_marcher', heavy: 'att_heavy',
        ram: 'att_ram', catapult: 'att_catapult', knight: 'att_knight', snob: 'att_snob'
      };
      // para cada param, se existir campo de input para tropas, preencher
      Object.entries(troopMap).forEach(([k,param]) => {
        if (params.has(param)) {
          const val = params.get(param);
          // procurar input por name igual a param (algumas versões do TW usam nomes diferentes)
          const inputByName = document.querySelector(`[name="${param}"]`);
          if (inputByName) inputByName.value = val;
          // tentar também preencher inputs tipo number visíveis (heurística)
          const alt = document.querySelector(`input[type=number][data-unit="${k}"]`);
          if (alt) alt.value = val;
        }
      });
    } catch (e) { /* silent */ }
  }

  // mostrar pequena notificação inicial
  statusEl.textContent = 'Pronto. Preencha e clique em "Salvar & Agendar".';
})();
