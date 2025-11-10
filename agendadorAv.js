// ==UserScript==
// @name         Agendador Avançado (Ocultar Painel + Salvar Estado + Nova Aba + Auto-Confirmar + Envio Final + Importar BBCode + Tooltip de Tropas + Scroll em Lista)
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Agenda múltiplos ataques com contagem regressiva (abre em nova aba, auto-confirma, envia automaticamente, importa tabelas BBCode, mostra tooltip de tropas e permite ocultar o painel lateral com estado salvo).
// @author       GiovaniG
// @match        https://*.tribalwars.com.br/*
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';

  // === Envio automático na tela de confirmação ===
  if (location.href.includes('screen=place&try=confirm')) {
    const btn = document.querySelector('#troop_confirm_submit');
    if (btn) setTimeout(() => btn.click(), 300);
    return;
  }

  const STORAGE_KEY = 'tw_scheduler_multi_v1';
  const PANEL_STATE_KEY = 'tws_panel_state';
  const TROOP_LIST = ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
  const world = location.hostname.split('.')[0];
  const VILLAGE_TXT_URL = `https://${world}.tribalwars.com.br/map/village.txt`;

  // === carregar village.txt ===
  async function loadVillageTxt() {
    const res = await fetch(VILLAGE_TXT_URL);
    const text = await res.text();
    const map = {};
    const myVillages = [];
    for (const line of text.trim().split('\n')) {
      const [id, name, x, y, playerId] = line.split(',');
      map[`${x}|${y}`] = id;
      if (playerId === game_data.player.id.toString()) {
        const clean = decodeURIComponent(name.replace(/\+/g, ' '));
        myVillages.push({ id, name: clean, coord: `${x}|${y}` });
      }
    }
    return { map, myVillages };
  }

  const { map: villageMap, myVillages } = await loadVillageTxt();

  // === painel principal ===
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
        background: url('https://dsen.innogamescdn.com/asset/efb4e9b/graphic/background/wood.jpg') #2b1b0f !important;
        color: #f5deb3 !important;
        border: 2px solid #654321 !important;
        border-right: none !important;
        border-radius: 8px 0 0 8px !important;
        box-shadow: 0 4px 18px rgba(0,0,0,0.7) !important;
        padding: 10px !important;
        transition: transform 0.4s ease !important;
      }
      .tws-toggle-tab {
        position: absolute;
        left: -28px;
        top: 40%;
        background: #5c3a1e;
        border: 2px solid #654321;
        border-right: none;
        border-radius: 6px 0 0 6px;
        padding: 6px 4px;
        font-size: 14px;
        color: #ffd700;
        cursor: pointer;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        user-select: none;
        box-shadow: -2px 0 6px rgba(0,0,0,0.5);
      }
      .tws-toggle-tab:hover { background: #7b5124; }
      .tws-hidden { transform: translateX(100%); }
      .tws-container h3 {margin:0 0 6px;text-align:center;color:#ffd700;text-shadow:1px 1px 2px #000;}
      .tws-container input,
      .tws-container select,
      .tws-container button,
      .tws-container textarea {
        border-radius:5px;
        border:1px solid #5c3a1e;
        background:#1e1408;
        color:#fff;
        padding:5px;
        font-size:12px;
      }
      .tws-container button{
        cursor:pointer;
        background:#6b4c2a;
        color:#f8e6c2;
        transition:0.2s;
      }
      .tws-container button:hover{background:#8b652e;}
      .tws-schedule-wrapper {max-height:270px;overflow-y:auto;border:1px solid #3d2a12;border-radius:6px;margin-top:6px;}
      .tws-schedule-table {width:100%;border-collapse:collapse;font-size:12px;}
      .tws-schedule-table th,
      .tws-schedule-table td {border:1px solid #3d2a12;padding:4px;text-align:center;}
      .tws-schedule-table th {background:#3d2a12;color:#ffd700;position:sticky;top:0;z-index:1;}
      .tws-schedule-table td button {background:#b33;border:none;color:white;padding:3px 6px;border-radius:4px;cursor:pointer;}
      .tws-schedule-table td button:hover{background:#e44;}
      .tws-container details summary{cursor:pointer;color:#ffd700;margin-top:6px;}
      .tws-status {font-size:11px;margin-top:5px;opacity:0.9;max-height:150px;overflow-y:auto;background:rgba(0,0,0,0.3);padding:4px;border-radius:5px;}
      .tws-bbcode-area {width:100%;height:100px;margin-top:4px;}
      .tws-tooltip {position: relative;display: inline-block;}
      .tws-tooltip .tws-tooltip-content {
        visibility: hidden;width:max-content;max-width:280px;background:#2b1b0f;color:#f5deb3;text-align:left;
        border:1px solid #7b5b2a;border-radius:5px;padding:5px;position:absolute;z-index:999999;
        bottom:100%;left:50%;transform:translateX(-50%);opacity:0;transition:opacity 0.2s;
        box-shadow:0 0 8px rgba(0,0,0,0.6);font-size:11px;
      }
      .tws-tooltip:hover .tws-tooltip-content {visibility:visible;opacity:1;}
      .tws-tooltip-content img {height:16px;vertical-align:middle;margin-right:3px;}
    </style>

    <div class="tws-toggle-tab" id="tws-toggle-tab">Painel</div>
    <h3>Agendador Avançado</h3>

    <label>Origem:</label>
    <select id="tws-select-origem" style="width:50%;margin-bottom:4px">
      <option value="">Selecione sua aldeia...</option>
    </select>

    <label>Destino:</label>
    <input id="tws-alvo" placeholder="400|500" style="width:10%;margin-bottom:4px"/>

    <details>
      <summary>Selecionar tropas</summary>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:4px">
        ${TROOP_LIST.map(u=>`
          <div style="text-align:center">
            <img src="/graphic/unit/unit_${u}.png" title="${u}" style="height:18px;"><br>
            <input type="number" id="tws-${u}" min="0" value="0" style="width:45px;text-align:center">
          </div>`).join('')}
      </div>
    </details>

    <label>Data e hora (DD/MM/AAAA HH:MM:SS)</label>
    <input id="tws-datetime" placeholder="09/11/2025 21:30:00" style="width:50%;margin-bottom:6px"/>

    <div style="display:flex;gap:6px;margin-bottom:6px">
      <button id="tws-add" style="flex:1">➕ Adicionar</button>
      <button id="tws-clear" style="flex:1">🗑️ Limpar</button>
    </div>

    <details>
      <summary>📥 Importar BBCode</summary>
      <textarea class="tws-bbcode-area" id="tws-bbcode-area" placeholder="Cole aqui o código [table]...[/table] do fórum"></textarea>
      <button id="tws-import" style="width:100%;margin-top:4px;">📤 Importar BBCode</button>
    </details>

    <div class="tws-schedule-wrapper" id="tws-schedule-wrapper">
      <table class="tws-schedule-table" id="tws-schedule-table">
        <thead><tr><th>Origem</th><th>Alvo</th><th>Data/Hora</th><th>Ações</th></tr></thead>
        <tbody id="tws-tbody"></tbody>
      </table>
    </div>

    <div class="tws-status" id="tws-status">Aguardando agendamentos...</div>
  `;
  document.body.appendChild(panel);

  // === Ocultar/Exibir painel ===
  const toggle = panel.querySelector('#tws-toggle-tab');
  function updatePanelState() {
    const hidden = panel.classList.contains('tws-hidden');
    localStorage.setItem(PANEL_STATE_KEY, hidden ? 'hidden' : 'visible');
    toggle.textContent = hidden ? 'Abrir' : 'Fechar';
  }

  toggle.onclick = () => {
    panel.classList.toggle('tws-hidden');
    updatePanelState();
  };

  const savedState = localStorage.getItem(PANEL_STATE_KEY);
  if (savedState === 'hidden') {
    panel.classList.add('tws-hidden');
    toggle.textContent = 'Abrir';
  } else toggle.textContent = 'Fechar';

  // === Preencher aldeias ===
  const sel = panel.querySelector('#tws-select-origem');
  myVillages.forEach(v=>{
    const o=document.createElement('option');
    o.value=v.id; o.textContent=`${v.name} (${v.coord})`;
    sel.appendChild(o);
  });

  // === Funções auxiliares ===
  const el=id=>panel.querySelector(id.startsWith('#')?id:'#'+id);
  const parseDateTimeToMs=str=>{
    const m=str.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if(!m)return NaN;
    const[,d,mo,y,hh,mm,ss]=m;
    return new Date(+y,+mo-1,+d,+hh,+mm,+ss).getTime();
  };
  const parseCoord=s=>s.trim().match(/^(\d+)\|(\d+)$/)?s.trim():null;
  const getList=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  const setList=l=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(l));renderTable();};

  const tbody=el('tws-tbody');
  function renderTable(){
    const list=getList();
    if(!list.length){ tbody.innerHTML='<tr><td colspan="4"><i>Nenhum agendamento</i></td></tr>'; return; }
    tbody.innerHTML=list.map((a,i)=>{
      const troops=TROOP_LIST.filter(t=>a[t]>0).map(t=>`<img src="/graphic/unit/unit_${t}.png"> ${a[t]}`).join('<br>')||'Nenhuma tropa';
      return `<tr>
        <td class="tws-tooltip">${a.origem}<div class="tws-tooltip-content">${troops}</div></td>
        <td>${a.alvo}</td>
        <td>${a.datetime}${a.done?' ✅':''}</td>
        <td><button onclick="window.twsDel(${i})">X</button></td>
      </tr>`;
    }).join('');
  }
  window.twsDel=i=>{const list=getList(); list.splice(i,1); setList(list);};

// ---------- nova versão: executeAttack usando fetch + confirmação automática ----------
async function executeAttack(cfg){
    const origemId = cfg.origemId || villageMap[cfg.origem];
    const statusEl = document.getElementById('tws-status');
    function setStatus(msg){ try{ if(statusEl) statusEl.innerHTML = msg; }catch{}; console.log('[TWScheduler]', msg); }

    if(!origemId) {
      setStatus(`Origem ${cfg.origem} não encontrada!`);
      return;
    }

    const [x, y] = (cfg.alvo||'').split('|');
    if(!x || !y) {
      setStatus(`Alvo inválido: ${cfg.alvo}`);
      return;
    }

    const placeUrl = `${location.protocol}//${location.host}/game.php?village=${origemId}&screen=place`;
    setStatus(`Iniciando envio (origem ${origemId}) → ${cfg.alvo} ...`);

    try {
        // 1) GET da página /place para extrair o formulário e tokens
        const getRes = await fetch(placeUrl, { credentials: 'same-origin' });
        if(!getRes.ok){ setStatus(`GET place falhou: HTTP ${getRes.status}`); return; }
        const html = await getRes.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 2) localizar o form de envio (procura por form com x/y ou action contendo screen=place)
        let form = Array.from(doc.querySelectorAll('form')).find(f => (f.action && f.action.includes('screen=place')) || f.querySelector('input[name="x"]') || f.querySelector('input[name="y"]'));
        if(!form){
          // fallback: procurar form que contenha inputs de unidade
          form = Array.from(doc.querySelectorAll('form')).find(f => TROOP_LIST.some(u=>f.querySelector(`input[name="${u}"]`)));
        }
        if(!form){
          setStatus('Form de envio não encontrado na página place (selectors podem variar).');
          return;
        }

        // 3) construir payload copiando todos os inputs/selects/textareas
        const payloadObj = {};
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(inp=>{
          const name = inp.getAttribute('name');
          if(!name) return;
          if((inp.type === 'checkbox' || inp.type === 'radio')) {
            if(inp.checked) payloadObj[name] = inp.value || 'on';
          } else {
            payloadObj[name] = inp.value || '';
          }
        });

        // 4) sobrescrever campos de destino e tropas com os valores do cfg
        payloadObj['x'] = String(x);
        payloadObj['y'] = String(y);
        // algumas versões usam 'target' ou 'id' em vez de x/y — se quiser, podemos adicionar lógica extra
        TROOP_LIST.forEach(u=>{
          // se cfg[u] for vazio string, tenta 0
          const val = (cfg[u] !== undefined && cfg[u] !== null && cfg[u] !== '') ? String(cfg[u]) : '0';
          // só sobrescreve se existe campo correspondente no form OR sempre setar para garantir envio
          payloadObj[u] = val;
        });

        // 5) detectar botão submit e adicionar seu name/value se necessário
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if(submitBtn){
          const n = submitBtn.getAttribute('name');
          const v = submitBtn.getAttribute('value') || '';
          if(n) payloadObj[n] = v;
        }

        // 6) preparar body x-www-form-urlencoded
        const urlEncoded = Object.entries(payloadObj).map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

        // 7) resolver postUrl (normaliza action relativo)
        let postUrl = form.getAttribute('action') || placeUrl;
        if(postUrl.startsWith('/')) postUrl = `${location.protocol}//${location.host}${postUrl}`;
        if(!postUrl.includes('screen=place')) {
          // garantir que envie para screen=place (fallback)
          postUrl = placeUrl;
        }

        // 8) enviar POST inicial (este pode retornar a página de confirmação)
        setStatus(`Enviando POST inicial...`);
        const postRes = await fetch(postUrl, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: urlEncoded
        });

        if(!postRes.ok){
          setStatus(`POST inicial falhou: HTTP ${postRes.status}`);
          return;
        }

        const postText = await postRes.text();

        // 9) verificar se o retorno contém indicação de "confirm page" ou botão de confirmação
        const postDoc = parser.parseFromString(postText, 'text/html');

        // procura por formulário de confirmação (try=confirm) ou botão com id 'troop_confirm_submit' ou input[name="submit"]
        let confirmForm = Array.from(postDoc.querySelectorAll('form')).find(f => (f.action && f.action.includes('try=confirm')) || f.querySelector('#troop_confirm_submit') || f.querySelector('input[name="submit"]') || f.querySelector('button#troop_confirm_submit'));
        if(!confirmForm) {
          // alternativa: procurar por form que contenha 'confirm' no texto ou 'try=confirm' nos inputs
          confirmForm = Array.from(postDoc.querySelectorAll('form')).find(f => /confirm/i.test(f.outerHTML));
        }

        if(confirmForm){
          // extrair campos do form de confirmação
          const confirmPayload = {};
          Array.from(confirmForm.querySelectorAll('input, select, textarea')).forEach(inp=>{
            const name = inp.getAttribute('name');
            if(!name) return;
            if((inp.type === 'checkbox' || inp.type === 'radio')) {
              if(inp.checked) confirmPayload[name] = inp.value || 'on';
            } else {
              confirmPayload[name] = inp.value || '';
            }
          });

          // garantir que o botão de confirmação esteja presente no payload (ex: name=submit)
          const confirmBtn = confirmForm.querySelector('button[type="submit"], input[type="submit"], #troop_confirm_submit');
          if(confirmBtn){
            const n = confirmBtn.getAttribute('name');
            const v = confirmBtn.getAttribute('value') || '';
            if(n) confirmPayload[n] = v;
          }

          // montar body e postar
          const confirmBody = Object.entries(confirmPayload).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
          let confirmUrl = confirmForm.getAttribute('action') || postRes.url || placeUrl;
          if(confirmUrl.startsWith('/')) confirmUrl = `${location.protocol}//${location.host}${confirmUrl}`;

          setStatus('Enviando confirmação final...');
          const confirmRes = await fetch(confirmUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: confirmBody
          });

          if(!confirmRes.ok){
            setStatus(`POST confirmação falhou: HTTP ${confirmRes.status}`);
            return;
          }

          const finalText = await confirmRes.text();
          // heurística de sucesso: procurar palavras-chave na resposta
          if(/attack sent|attack in queue|Attack sent|enviado|ataque enviado|enfileirad|A batalha começou|march started/i.test(finalText)){
            setStatus(`✅ Ataque enviado: ${cfg.origem} → ${cfg.alvo}`);
            console.log('[TWScheduler] Envio confirmado (fetch).');
            return;
          } else {
            setStatus(`⚠️ Confirmação concluída, verifique manualmente se ataque foi enfileirado.`);
            console.log('[TWScheduler] Confirm Resposta não indicou sucesso. Verifique a fila.');
            return;
          }
        } else {
          // Se não há formulário de confirmação, o POST inicial pode já ter executado o envio (dependendo do servidor).
          if(/attack sent|attack in queue|Attack sent|enviado|ataque enviado|enfileirad|A batalha começou|march started/i.test(postText)){
            setStatus(`✅ Ataque enviado: ${cfg.origem} → ${cfg.alvo}`);
            return;
          } else {
            setStatus('Resposta do POST inicial não indicou confirmação; pode ter falhado silenciosamente. Verifique manualmente.');
            console.log('[TWScheduler] POST inicial não retornou confirmação nem formulário de confirm.');
            return;
          }
        }
    } catch (err) {
        console.error('[TWScheduler] Erro executeAttack', err);
        setStatus('Erro ao tentar enviar ataque (veja console).');
    }
}
// ---------- fim executeAttack ----------

  const status=el('tws-status');
  function startScheduler(){
    setInterval(()=>{
      const list=getList(); const now=Date.now(); const msgs=[];
      for(const a of list){
        const t=parseDateTimeToMs(a.datetime);
        if(!t||a.done)continue;
        const diff=t-now;
        if(diff<=0&&diff>-10000){a.done=true; executeAttack(a); msgs.push(`🔥 ${a.origem} → ${a.alvo}`);}
        else if(diff>0){msgs.push(`🕒 ${a.origem} → ${a.alvo} em ${Math.ceil(diff/1000)}s`);}
      }
      setList(list);
      status.innerHTML=msgs.length?msgs.join('<br>'):'Sem agendamentos ativos.';
    },1000);
  }

  el('tws-add').onclick=()=>{
    const selVal=sel.value;
    const alvo=parseCoord(el('tws-alvo').value);
    const dt=el('tws-datetime').value.trim();
    if(!selVal||!alvo||isNaN(parseDateTimeToMs(dt)))
      return alert('Verifique origem, coordenadas e data!');
    const origem=myVillages.find(v=>v.id===selVal)?.coord;
    const origemId=selVal;
    const cfg={origem,origemId,alvo,datetime:dt};
    TROOP_LIST.forEach(u=>cfg[u]=el('tws-'+u).value);
    const list=getList(); list.push(cfg); setList(list);
  };

  el('tws-clear').onclick=()=>{
    if(confirm('Apagar todos os agendamentos?')){
      localStorage.removeItem(STORAGE_KEY);
      renderTable(); status.textContent='Lista limpa.';
    }
  };

  el('tws-import').onclick=()=>{
    const bb=el('tws-bbcode-area').value.trim();
    if(!bb)return alert('Cole o código BB primeiro!');
    const ag=importarDeBBCode(bb);
    const list=getList(); list.push(...ag); setList(list);
    alert(`${ag.length} agendamentos importados com sucesso!`);
  };

  function importarDeBBCode(bbcode){
    const linhas=bbcode.split('[*]').filter(l=>l.trim()!=='');
    const agendamentos=[];
    for(const linha of linhas){
      const origem=linha.match(/(\d{3}\|\d{3})/g)?.[0]||'';
      const destino=linha.match(/(\d{3}\|\d{3})/g)?.[1]||'';
      const dataHora=linha.match(/(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/)?.[1]||'';
      const url=linha.match(/\[url=(.*?)\]/)?.[1]||'';
      const params={};
      if(url){
        const query=url.split('?')[1];
        if(query){
          query.split('&').forEach(p=>{
            const[k,v]=p.split('=');
            params[k]=decodeURIComponent(v||'');
          });
        }
      }
      const origemId=params.village||villageMap[origem];
      const cfg={origem,origemId,alvo:destino,datetime:dataHora};
      TROOP_LIST.forEach(u=>cfg[u]=params['att_'+u]||0);
      if(origem&&destino&&dataHora)agendamentos.push(cfg);
    }
    return agendamentos;
  }

  renderTable();
  startScheduler();
})();
