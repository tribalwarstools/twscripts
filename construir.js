// ==UserScript==
// @name         TW - Gerenciador Global de Construção (Verificação Real + Retomar Auto)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Percorre todas as aldeias e constrói automaticamente via iframe invisível. Verifica fila cheia, nível máximo e retoma após reload.
// @match        *://*.tribalwars.com.br/*game.php*
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';

  const ESTILO = `
    #twc-panel {
      position: fixed; bottom: 10px; right: 10px; width: 380px;
      background: rgba(15,10,5,0.95); color: #f4e2be; border: 2px solid #8b5a2b;
      font-family: Verdana, sans-serif; font-size: 12px; padding: 10px; z-index: 99999;
      border-radius: 10px; box-shadow: 0 0 8px #000;
    }
    #twc-panel h3 { text-align:center; margin:0 0 6px 0; font-size:14px; color:#f4e2be; }
    #twc-panel label { display:block; margin:3px 0; cursor:pointer; }
    #twc-panel input[type=checkbox] { margin-right:6px; }
    #twc-panel button {
      background:#8b5a2b; border:none; color:#fff; padding:5px 10px;
      margin:4px; border-radius:6px; cursor:pointer;
    }
    #twc-panel button:hover { background:#a9713a; }
    #twc-log {
      height:120px; overflow:auto; background:#1a1207; border:1px solid #704214;
      padding:5px; color:#d9b98c; border-radius:5px; font-size:11px;
    }
    #twc-delay { width:50px; text-align:center; }
    #twc-progress {
      width:100%; height:10px; background:#3a2a12; border-radius:6px; margin-top:5px;
    }
    #twc-bar {
      height:10px; width:0%; background:#d9b98c; border-radius:6px;
      transition:width 0.3s;
    }
    #twc-iframe { display:none; width:0; height:0; border:none; }
  `;

  const edificios = {
    main: 'Edifício Principal',
    barracks: 'Quartel',
    stable: 'Estábulo',
    garage: 'Oficina',
    smith: 'Ferreiro',
    market: 'Mercado',
    farm: 'Fazenda',
    storage: 'Armazém',
    wall: 'Muralha',
    wood: 'Bosque',
    stone: 'Poço de Argila',
    iron: 'Mina de Ferro',
    snob: 'Academia',
    statue: 'Estátua',
    church: 'Igreja',
    watchtower: 'Torre de Vigia'
  };

  if (!document.querySelector('#twc-panel')) {
    const style = document.createElement('style');
    style.textContent = ESTILO;
    document.head.appendChild(style);

    const div = document.createElement('div');
    div.id = 'twc-panel';
    div.innerHTML = `
      <h3>🏗️ Construtor Global (Verificação Real)</h3>
      <div id="twc-edificios">
        ${Object.entries(edificios).map(([k,v])=>`
          <label><input type="checkbox" data-ed="${k}" ${localStorage.getItem('twc_'+k)==='1'?'checked':''}>${v}</label>
        `).join('')}
      </div>
      <hr>
      Delay: <input id="twc-delay" type="number" min="1" max="30" value="${localStorage.getItem('twc_delay')||5}">s
      <div style="margin-top:5px;text-align:center;">
        <button id="twc-start">▶️ Iniciar Global</button>
        <button id="twc-stop">⏹️ Parar</button>
      </div>
      <div id="twc-progress"><div id="twc-bar"></div></div>
      <div id="twc-log"></div>
      <iframe id="twc-iframe"></iframe>
    `;
    document.body.appendChild(div);
  }

  const logBox = document.querySelector('#twc-log');
  const iframe = document.querySelector('#twc-iframe');
  let interromper = false;
  const ultimoErro = {}; // {villageId: timestamp}

  const log = msg => {
    logBox.innerHTML += `[${new Date().toLocaleTimeString()}] ${msg}<br>`;
    logBox.scrollTop = logBox.scrollHeight;
  };

  const salvarConfig = () => {
    document.querySelectorAll('#twc-edificios input[type=checkbox]').forEach(ch=>{
      localStorage.setItem('twc_'+ch.dataset.ed, ch.checked?'1':'0');
    });
    localStorage.setItem('twc_delay', document.querySelector('#twc-delay').value);
  };

  document.querySelector('#twc-edificios').addEventListener('change', salvarConfig);
  document.querySelector('#twc-delay').addEventListener('change', salvarConfig);

  document.querySelector('#twc-stop').onclick = ()=>{
    interromper = true;
    localStorage.setItem('twc_ativo', '0');
    log('🛑 Interrompido pelo usuário.');
  };

  async function getAldeias() {
    const res = await fetch('/game.php?screen=overview_villages&mode=combined');
    const html = await res.text();
    const matches = [...html.matchAll(/village=(\d+)&/g)];
    const ids = [...new Set(matches.map(m => m[1]))];
    if (!ids.length && game_data.village?.id) ids.push(game_data.village.id);
    return ids;
  }

  async function tentarFila(villageId, fila) {
    return new Promise(resolve => {
      iframe.onload = () => {
        try {
          const doc = iframe.contentDocument;

          // Detecta fila cheia
          if (doc.querySelector('.queue_building_limit, .error')) {
            log(`⚠️ Fila cheia em aldeia ${villageId}`);
            ultimoErro[villageId] = Date.now();
            return resolve(false);
          }

          for (const edif of fila) {
            const bloco = doc.querySelector(`#main_buildrow_${edif}`);
            if (!bloco) continue;

            // Detecta nível máximo
            const maxSpan = bloco.querySelector('.max_level');
            if (maxSpan) {
              log(`✅ ${edificios[edif]} já está no nível máximo (${villageId})`);
              continue;
            }

            const botao = bloco.querySelector(`a.btn-build[id^='main_buildlink_${edif}_']:not(.btn-disabled)`);

            if (botao) {
              botao.click();
              // Verifica após 1s se o botão sumiu (confirma o clique real)
              setTimeout(() => {
                const aindaExiste = iframe.contentDocument.querySelector(`a.btn-build[id^='main_buildlink_${edif}_']:not(.btn-disabled)`);
                if (!aindaExiste) {
                  log(`🏗️ ${edificios[edif]} realmente iniciado em aldeia ${villageId}`);
                  ultimoErro[villageId] = 0;
                  resolve(true);
                } else {
                  log(`⚠️ Fila ocupada ou erro de clique em ${villageId}`);
                  ultimoErro[villageId] = Date.now();
                  resolve(false);
                }
              }, 1000);
              return;
            }
          }

          log(`⚠️ Nenhum edifício disponível em ${villageId} (sem recursos ou todos no máximo)`);
          ultimoErro[villageId] = Date.now();
          resolve(false);
        } catch(e) {
          log(`❌ Erro em aldeia ${villageId}: ${e.message}`);
          ultimoErro[villageId] = Date.now();
          resolve(false);
        }
      };
      iframe.src = `/game.php?village=${villageId}&screen=main`;
    });
  }

  async function iniciarLoop() {
    interromper = false;
    localStorage.setItem('twc_ativo', '1');
    const fila = Object.keys(edificios).filter(k=>localStorage.getItem('twc_'+k)==='1');
    if (!fila.length) return log('⚠️ Nenhum edifício selecionado!');
    const delay = Number(document.querySelector('#twc-delay').value) * 1000;

    log('🚀 Gerenciador Global iniciado (verificação real).');

    while (!interromper) {
      const aldeias = await getAldeias();
      log(`📜 Verificando ${aldeias.length} aldeia(s)...`);

      for (let i=0; i<aldeias.length; i++) {
        if (interromper) break;
        const vid = aldeias[i];
        if (ultimoErro[vid] && Date.now() - ultimoErro[vid] < 60000) continue;
        await tentarFila(vid, fila);
        document.querySelector('#twc-bar').style.width = ((i+1)/aldeias.length*100).toFixed(1)+'%';
        await new Promise(r=>setTimeout(r, delay));
      }

      if (interromper) break;
      log(`🔁 Aguardando novo ciclo (${delay/1000}s)...`);
      await new Promise(r=>setTimeout(r, delay));
    }

    localStorage.setItem('twc_ativo', '0');
    log('✅ Processo encerrado.');
  }

  document.querySelector('#twc-start').onclick = iniciarLoop;

  window.addEventListener('load', ()=>{
    if (localStorage.getItem('twc_ativo')==='1') {
      log('♻️ Retomando construção automática após recarregamento...');
      iniciarLoop();
    }
  });

})();
