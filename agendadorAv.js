// ==UserScript==
// @name         Agendador Avançado (Painel Isolado + Ocultar + Salvar Estado + Nova Aba + Auto-Confirmar + Envio Final + Importar BBCode + Tooltip + Scroll)
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Agenda múltiplos ataques com contagem regressiva (com painel isolado e sem conflitos com o jogo).
// @author       GiovaniG
// @match        https://*.tribalwars.com.br/*
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';

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

  const panel = document.createElement('div');
  panel.id = 'tws-panel';
  panel.innerHTML = `
    <style>
      #tws-panel * { box-sizing: border-box; font-family: Verdana, sans-serif !important; }

      #tws-panel {
        position: fixed !important;
        right: 0 !important;
        bottom: 10px !important;
        width: 460px !important;
        z-index: 99999 !important;
        background: url('https://dsen.innogamescdn.com/asset/efb4e9b/graphic/background/wood.jpg') #2b1b0f !important;
        color: #f5deb3 !important;
        border: 2px solid #654321 !important;
        border-right: none !important;
        border-radius: 8px 0 0 8px !important;
        box-shadow: 0 4px 18px rgba(0,0,0,0.7) !important;
        padding: 10px !important;
        transition: transform 0.4s ease !important;
      }

      #tws-panel.hidden { transform: translateX(100%) !important; }

      #tws-toggle-tab {
        position: absolute !important;
        left: -28px !important;
        top: 40% !important;
        background: #5c3a1e !important;
        border: 2px solid #654321 !important;
        border-right: none !important;
        border-radius: 6px 0 0 6px !important;
        padding: 6px 4px !important;
        font-size: 14px !important;
        color: #ffd700 !important;
        cursor: pointer !important;
        writing-mode: vertical-rl !important;
        text-orientation: mixed !important;
        user-select: none !important;
        box-shadow: -2px 0 6px rgba(0,0,0,0.5) !important;
      }
      #tws-toggle-tab:hover { background: #7b5124 !important; }

      #tws-panel h3 {
        margin: 0 0 6px !important;
        text-align: center !important;
        color: #ffd700 !important;
        text-shadow: 1px 1px 2px #000 !important;
      }

      #tws-panel input,
      #tws-panel select,
      #tws-panel button,
      #tws-panel textarea {
        border-radius: 5px !important;
        border: 1px solid #5c3a1e !important;
        background: #1e1408 !important;
        color: #fff !important;
        padding: 5px !important;
        font-size: 12px !important;
      }

      #tws-panel button {
        cursor: pointer !important;
        background: #6b4c2a !important;
        color: #f8e6c2 !important;
        transition: 0.2s !important;
      }
      #tws-panel button:hover { background: #8b652e !important; }

      #tws-schedule-wrapper {
        max-height: 270px !important;
        overflow-y: auto !important;
        border: 1px solid #3d2a12 !important;
        border-radius: 6px !important;
        margin-top: 6px !important;
      }

      #tws-schedule-table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 12px !important;
      }

      #tws-schedule-table th,
      #tws-schedule-table td {
        border: 1px solid #3d2a12 !important;
        padding: 4px !important;
        text-align: center !important;
      }

      #tws-schedule-table th {
        background: #3d2a12 !important;
        color: #ffd700 !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
      }

      #tws-schedule-table td button {
        background: #b33 !important;
        border: none !important;
        color: white !important;
        padding: 3px 6px !important;
        border-radius: 4px !important;
      }
      #tws-schedule-table td button:hover { background: #e44 !important; }

      #tws-panel details summary {
        cursor: pointer !important;
        color: #ffd700 !important;
        margin-top: 6px !important;
      }

      #tws-status {
        font-size: 11px !important;
        margin-top: 5px !important;
        opacity: 0.9 !important;
        max-height: 150px !important;
        overflow-y: auto !important;
        background: rgba(0,0,0,0.3) !important;
        padding: 4px !important;
        border-radius: 5px !important;
      }

      #tws-bbcode-area {
        width: 100% !important;
        height: 100px !important;
        margin-top: 4px !important;
      }

      #tws-panel img { pointer-events: none; }

      #tws-panel .tws-tooltip { position: relative !important; display: inline-block !important; }
      #tws-panel .tws-tooltip .tws-tooltip-content {
        visibility: hidden !important;
        width: max-content !important;
        max-width: 280px !important;
        background: #2b1b0f !important;
        color: #f5deb3 !important;
        text-align: left !important;
        border: 1px solid #7b5b2a !important;
        border-radius: 5px !important;
        padding: 5px !important;
        position: absolute !important;
        z-index: 999999 !important;
        bottom: -200% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        opacity: 0 !important;
        transition: opacity 0.2s !important;
        box-shadow: 0 0 8px rgba(0,0,0,0.6) !important;
        font-size: 11px !important;
      }
      #tws-panel .tws-tooltip:hover .tws-tooltip-content {
        visibility: visible !important;
        opacity: 1 !important;
      }
      #tws-panel .tws-tooltip-content img { height: 16px !important; vertical-align: middle !important; margin-right: 3px !important; }
    </style>

    <div id="tws-toggle-tab">Painel</div>
    <h3>Agendador Avançado</h3>
    <label>Aldeia Origem:</label>
    <select id="tws-select-origem"><option value="">Selecione sua aldeia...</option></select>
    <label>Alvo (coord X|Y):</label>
    <input id="tws-alvo" placeholder="400|500" />
    <details>
      <summary>Selecionar tropas</summary>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:4px">
        ${TROOP_LIST.map(u=>`
          <div style="text-align:center">
            <img src="/graphic/unit/unit_${u}.png" title="${u}"><br>
            <input type="number" id="tws-${u}" min="0" value="0" style="width:45px;text-align:center">
          </div>`).join('')}
      </div>
    </details>
    <label>Data e hora (DD/MM/AAAA HH:MM:SS)</label>
    <input id="tws-datetime" placeholder="09/11/2025 21:30:00" />
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <button id="tws-add" style="flex:1">➕ Adicionar</button>
      <button id="tws-clear" style="flex:1">🗑️ Limpar</button>
    </div>
    <details>
      <summary>📥 Importar BBCode</summary>
      <textarea id="tws-bbcode-area" placeholder="Cole aqui o código [table]...[/table] do fórum"></textarea>
      <button id="tws-import" style="width:100%;margin-top:4px;">📤 Importar BBCode</button>
    </details>
    <div id="tws-schedule-wrapper">
      <table id="tws-schedule-table">
        <thead><tr><th>Origem</th><th>Alvo</th><th>Data/Hora</th><th>Ações</th></tr></thead>
        <tbody id="tws-tbody"></tbody>
      </table>
    </div>
    <div id="tws-status">Aguardando agendamentos...</div>
  `;
  document.body.appendChild(panel);

  // Funções inalteradas a partir daqui (painel, toggle, agendamento etc.)
  const toggle = panel.querySelector('#tws-toggle-tab');
  function updatePanelState() {
    const hidden = panel.classList.contains('hidden');
    localStorage.setItem(PANEL_STATE_KEY, hidden ? 'hidden' : 'visible');
    toggle.textContent = hidden ? 'Abrir' : 'Fechar';
  }
  toggle.onclick = () => { panel.classList.toggle('hidden'); updatePanelState(); };
  const savedState = localStorage.getItem(PANEL_STATE_KEY);
  if (savedState === 'hidden') panel.classList.add('hidden');

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

  const sel = el('tws-select-origem');
  myVillages.forEach(v=>{
    const o=document.createElement('option');
    o.value=v.id; o.textContent=`${v.name} (${v.coord})`;
    sel.appendChild(o);
  });

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

  async function executeAttack(cfg){
    const origemId=cfg.origemId||villageMap[cfg.origem];
    if(!origemId)return alert(`Origem ${cfg.origem} não encontrada!`);
    const[x,y]=cfg.alvo.split('|');
    const url=`${location.protocol}//${location.host}/game.php?village=${origemId}&screen=place`;
    const win=window.open(url,'_blank');
    const int=setInterval(()=>{
      try{
        if(!win||win.closed)return clearInterval(int);
        const doc=win.document;
        const xField=doc.querySelector('#inputx');
        if(xField){
          xField.value=x; doc.querySelector('#inputy').value=y;
          TROOP_LIST.forEach(u=>{
            const val=parseInt(cfg[u])||0;
            const input=doc.querySelector('#unit_input_'+u);
            if(input)input.value=val;
          });
          const atk=doc.querySelector('[name=attack]');
          if(atk){
            atk.click();
            setTimeout(()=>{const conf=doc.querySelector('[name=submit]'); if(conf)conf.click();},400);
          }
          clearInterval(int);
        }
      }catch{}
    },300);
  }

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
