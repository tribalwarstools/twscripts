(function () {
  'use strict';

  // === Configs / Constantes ===
  const STORAGE_KEY = 'tw_scheduler_multi_v1';
  const PANEL_STATE_KEY = 'tws_panel_state';
  const TROOP_LIST = ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
  const world = location.hostname.split('.')[0];
  const VILLAGE_TXT_URL = `https://${world}.tribalwars.com.br/map/village.txt`;
  let _villageMap = {}; // preenchido por loadVillageTxt
  let _myVillages = []; // preenchido por loadVillageTxt
  let _schedulerInterval = null;

  // === Auto-confirm na página de confirmação (caso backend seja carregado nessa página) ===
  try {
    if (location.href.includes('screen=place&try=confirm')) {
      const btn = document.querySelector('#troop_confirm_submit') || document.querySelector('button[name="submit"], input[name="submit"]');
      if (btn) setTimeout(() => btn.click(), 300);
      // não retorna aqui; deixamos o resto disponível caso necessário, mas normalmente a página confirm já fez o trabalho.
    }
  } catch (e) { /* ignore */ }

  // === Utility functions ===
  function parseDateTimeToMs(str) {
    const m = str?.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return NaN;
    const [, d, mo, y, hh, mm, ss] = m;
    return new Date(+y, +mo - 1, +d, +hh, +mm, +ss).getTime();
  }

  function parseCoord(s) {
    if (!s) return null;
    const t = s.trim();
    return /^(\d+)\|(\d+)$/.test(t) ? t : null;
  }

  function getList() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function setList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // se painel estiver presente, pede para atualizar
    if (window.renderTable) window.renderTable();
  }

  // === Carrega village.txt e retorna { map, myVillages } ===
  async function loadVillageTxt() {
    try {
      const res = await fetch(VILLAGE_TXT_URL, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Falha ao buscar village.txt: ' + res.status);
      const text = await res.text();
      const map = {};
      const myVillages = [];
      for (const line of text.trim().split('\n')) {
        const [id, name, x, y, playerId] = line.split(',');
        map[`${x}|${y}`] = id;
        if (playerId === (window.game_data?.player?.id || '').toString()) {
          const clean = decodeURIComponent((name || '').replace(/\+/g, ' '));
          myVillages.push({ id, name: clean, coord: `${x}|${y}` });
        }
      }
      _villageMap = map;
      _myVillages = myVillages;
      return { map, myVillages };
    } catch (err) {
      console.error('[TWS_Backend] loadVillageTxt error', err);
      return { map: {}, myVillages: [] };
    }
  }

  // === Execute attack (fetch + confirm handling) ===
  async function executeAttack(cfg) {
    const statusEl = document.getElementById('tws-status');
    const setStatus = (msg) => { try { if (statusEl) statusEl.innerHTML = msg; } catch {} ; console.log('[TWScheduler]', msg); };

    // resolve origemId: cfg.origemId ou busc via coord
    const origemId = cfg.origemId || _villageMap[cfg.origem] || null;
    if (!origemId) {
      setStatus(`Origem ${cfg.origem || cfg.origemId} não encontrada!`);
      return;
    }

    const [x, y] = (cfg.alvo || '').split('|');
    if (!x || !y) {
      setStatus(`Alvo inválido: ${cfg.alvo}`);
      return;
    }

    const placeUrl = `${location.protocol}//${location.host}/game.php?village=${origemId}&screen=place`;
    setStatus(`Iniciando envio (origem ${origemId}) → ${cfg.alvo} ...`);

    try {
      // 1) GET /place
      const getRes = await fetch(placeUrl, { credentials: 'same-origin' });
      if (!getRes.ok) {
        setStatus(`GET /place falhou: HTTP ${getRes.status}`);
        return;
      }
      const html = await getRes.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 2) localizar form de envio
      let form = Array.from(doc.querySelectorAll('form')).find(f => (f.action && f.action.includes('screen=place')) || f.querySelector('input[name="x"]') || f.querySelector('input[name="y"]'));
      if (!form) {
        form = Array.from(doc.querySelectorAll('form')).find(f => TROOP_LIST.some(u => f.querySelector(`input[name="${u}"]`)));
      }
      if (!form) { setStatus('Form de envio não encontrado na página /place.'); return; }

      // 3) construir payload copiando inputs/selects/textareas
      const payloadObj = {};
      Array.from(form.querySelectorAll('input, select, textarea')).forEach(inp => {
        const name = inp.getAttribute('name');
        if (!name) return;
        if ((inp.type === 'checkbox' || inp.type === 'radio')) {
          if (inp.checked) payloadObj[name] = inp.value || 'on';
        } else {
          payloadObj[name] = inp.value || '';
        }
      });

      // 4) sobrescrever destino e tropas
      payloadObj['x'] = String(x);
      payloadObj['y'] = String(y);
      TROOP_LIST.forEach(u => {
        const val = (cfg[u] !== undefined && cfg[u] !== null && cfg[u] !== '') ? String(cfg[u]) : '0';
        payloadObj[u] = val;
      });

      // 5) adicionar submit button name/value se existir
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        const n = submitBtn.getAttribute('name');
        const v = submitBtn.getAttribute('value') || '';
        if (n) payloadObj[n] = v;
      }

      // 6) body urlencoded
      const urlEncoded = Object.entries(payloadObj).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

      // 7) normalizar postUrl
      let postUrl = form.getAttribute('action') || placeUrl;
      if (postUrl.startsWith('/')) postUrl = `${location.protocol}//${location.host}${postUrl}`;
      if (!postUrl.includes('screen=place')) postUrl = placeUrl;

      // 8) POST inicial
      setStatus(`Enviando POST inicial...`);
      const postRes = await fetch(postUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: urlEncoded
      });
      if (!postRes.ok) { setStatus(`POST inicial falhou: HTTP ${postRes.status}`); return; }
      const postText = await postRes.text();

      // 9) procurar formulário de confirmação
      const postDoc = parser.parseFromString(postText, 'text/html');
      let confirmForm = Array.from(postDoc.querySelectorAll('form')).find(f => (f.action && f.action.includes('try=confirm')) || f.querySelector('#troop_confirm_submit') || f.querySelector('input[name="submit"]') || f.querySelector('button#troop_confirm_submit'));
      if (!confirmForm) confirmForm = Array.from(postDoc.querySelectorAll('form')).find(f => /confirm/i.test(f.outerHTML));

      if (confirmForm) {
        const confirmPayload = {};
        Array.from(confirmForm.querySelectorAll('input, select, textarea')).forEach(inp => {
          const name = inp.getAttribute('name');
          if (!name) return;
          if ((inp.type === 'checkbox' || inp.type === 'radio')) {
            if (inp.checked) confirmPayload[name] = inp.value || 'on';
          } else {
            confirmPayload[name] = inp.value || '';
          }
        });

        const confirmBtn = confirmForm.querySelector('button[type="submit"], input[type="submit"], #troop_confirm_submit');
        if (confirmBtn) {
          const n = confirmBtn.getAttribute('name');
          const v = confirmBtn.getAttribute('value') || '';
          if (n) confirmPayload[n] = v;
        }

        const confirmBody = Object.entries(confirmPayload).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
        let confirmUrl = confirmForm.getAttribute('action') || postRes.url || placeUrl;
        if (confirmUrl.startsWith('/')) confirmUrl = `${location.protocol}//${location.host}${confirmUrl}`;

        setStatus('Enviando confirmação final...');
        const confirmRes = await fetch(confirmUrl, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: confirmBody
        });

        if (!confirmRes.ok) { setStatus(`POST confirmação falhou: HTTP ${confirmRes.status}`); return; }
        const finalText = await confirmRes.text();
        if (/attack sent|attack in queue|Attack sent|enviado|ataque enviado|enfileirad|A batalha começou|march started/i.test(finalText)) {
          setStatus(`✅ Ataque enviado: ${cfg.origem} → ${cfg.alvo}`);
          console.log('[TWScheduler] Envio confirmado (fetch).');
          return;
        } else {
          setStatus(`⚠️ Confirmação concluída, verifique manualmente se ataque foi enfileirado.`);
          console.log('[TWScheduler] Confirm Resposta não indicou sucesso. Verifique a fila.');
          return;
        }
      } else {
        // se não há form confirm
        if (/attack sent|attack in queue|Attack sent|enviado|ataque enviado|enfileirad|A batalha começou|march started/i.test(postText)) {
          setStatus(`✅ Ataque enviado: ${cfg.origem} → ${cfg.alvo}`);
          return;
        } else {
          setStatus('Resposta do POST inicial não indicou confirmação; verifique manualmente.');
          console.log('[TWScheduler] POST inicial não retornou confirmação nem formulário de confirm.');
          return;
        }
      }
    } catch (err) {
      console.error('[TWScheduler] Erro executeAttack', err);
      setStatus('Erro ao tentar enviar ataque (veja console).');
    }
  }

  // === startScheduler: verifica lista e dispara executeAttack quando apropriado ===
  function startScheduler() {
    if (_schedulerInterval) clearInterval(_schedulerInterval);
    _schedulerInterval = setInterval(async () => {
      const list = getList();
      const now = Date.now();
      const updates = [];
      const msgs = [];
      for (const a of list) {
        const t = parseDateTimeToMs(a.datetime);
        if (!t || a.done) continue;
        const diff = t - now;
        if (diff <= 0 && diff > -10000) {
          a.done = true;
          // dispara sem await para não bloquear o loop
          executeAttack(a).catch(err => console.error('executeAttack error', err));
          msgs.push(`🔥 ${a.origem} → ${a.alvo}`);
        } else if (diff > 0) {
          msgs.push(`🕒 ${a.origem} → ${a.alvo} em ${Math.ceil(diff/1000)}s`);
        }
        updates.push(a);
      }
      setList(list);
      const status = document.getElementById('tws-status');
      if (status) status.innerHTML = msgs.length ? msgs.join('<br>') : 'Sem agendamentos ativos.';
    }, 1000);
  }

  // === importarDeBBCode: transforma BBCode em agendamentos ===
  function importarDeBBCode(bbcode) {
    const linhas = bbcode.split('[*]').filter(l => l.trim() !== '');
    const agendamentos = [];
    for (const linha of linhas) {
      const coords = linha.match(/(\d{3}\|\d{3})/g) || [];
      const origem = coords[0] || '';
      const destino = coords[1] || '';
      const dataHora = linha.match(/(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/)?.[1] || '';
      const url = linha.match(/\[url=(.*?)\]/)?.[1] || '';
      const params = {};
      if (url) {
        const query = url.split('?')[1];
        if (query) query.split('&').forEach(p => { const [k, v] = p.split('='); params[k] = decodeURIComponent(v || ''); });
      }
      const origemId = params.village || _villageMap[origem];
      const cfg = { origem, origemId, alvo: destino, datetime: dataHora };
      TROOP_LIST.forEach(u => cfg[u] = params['att_' + u] || 0);
      if (origem && destino && dataHora) agendamentos.push(cfg);
    }
    return agendamentos;
  }


//incio
  // === getVillageTroops: busca as tropas disponíveis de uma aldeia ===
  async function getVillageTroops(villageId) {
    try {
      const placeUrl = `${location.protocol}//${location.host}/game.php?village=${villageId}&screen=place`;
      const res = await fetch(placeUrl, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Falha ao carregar página /place: ' + res.status);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const troops = {};
      TROOP_LIST.forEach(u => {
        const el = doc.querySelector(`#unit_input_${u}`) || doc.querySelector(`input[name="${u}"]`);
        const availableEl = doc.querySelector(`#units_entry_all_${u}`) || doc.querySelector(`#units_home_${u}`);
        const available = availableEl ? parseInt(availableEl.textContent.match(/\d+/)?.[0] || '0', 10) : 0;
        const value = el ? parseInt(el.value || '0', 10) : 0;
        troops[u] = available || value || 0;
      });

      return troops;
    } catch (err) {
      console.error('[TWS_Backend] getVillageTroops error', err);
      return null;
    }
  }

//fim
  



  
window.TWS_Backend = {
  loadVillageTxt,
  parseDateTimeToMs,
  parseCoord,
  getList,
  setList,
  startScheduler,
  importarDeBBCode,
  executeAttack,
  TROOP_LIST,
  STORAGE_KEY,
  PANEL_STATE_KEY,
  getVillageTroops, // <-- ADICIONE ESTA LINHA
  // para debug
  _internal: { _villageMap, _myVillages }
};


  console.log('[TWS_Backend] backend loaded.');
})();
