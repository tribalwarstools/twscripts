// ==UserScript==
// @name         TW - Gerenciador Global de Construção Tribal (Verificação Real + Retomar Auto)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Percorre todas as aldeias e constrói automaticamente via iframe invisível. Verifica fila cheia, nível máximo e retoma após reload. Tema Tribal Wars.
// @match        *://*.tribalwars.com.br/*game.php*
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';

  const ESTILO = `
    .twc-tribal-theme {
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

    #twc-tab {
      position: fixed;
      right: 0;
      top: 50%;
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

    #twc-tab:hover {
      background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
      padding-right: 12px;
    }

    #twc-panel {
      position: fixed;
      bottom: 20px;
      right: -420px;
      width: 400px;
      background: linear-gradient(145deg, var(--color-dark), #2c1e17);
      color: var(--color-light);
      border: 3px solid var(--color-accent);
      font-family: 'Trebuchet MS', sans-serif;
      font-size: 13px;
      padding: 15px;
      z-index: 9999;
      border-radius: var(--border-radius);
      box-shadow: var(--shadow);
      transition: right 0.4s ease-in-out;
      max-height: 80vh;
      overflow-y: auto;
    }

    #twc-panel.panel-visible {
      right: 20px;
    }

    #twc-panel.panel-hidden {
      right: -420px;
    }

    .twc-header {
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

    .twc-header::before {
      content: '⚔️';
      margin-right: 8px;
    }

    .twc-header::after {
      content: '⚔️';
      margin-left: 8px;
    }

    .twc-controls-section {
      background: rgba(139, 69, 19, 0.2);
      border: 1px solid var(--color-primary);
      border-radius: var(--border-radius);
      padding: 12px;
      margin-bottom: 12px;
    }

    .twc-section-title {
      font-weight: bold;
      color: var(--color-accent);
      margin-bottom: 8px;
      font-size: 14px;
      border-bottom: 1px solid var(--color-primary);
      padding-bottom: 4px;
    }

    #twc-edificios {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      max-height: 200px;
      overflow-y: auto;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      border: 1px solid var(--color-primary);
    }

    #twc-edificios label {
      display: flex;
      align-items: center;
      margin: 2px 0;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    #twc-edificios label:hover {
      background: rgba(205, 133, 63, 0.2);
    }

    #twc-edificios input[type="checkbox"] {
      margin-right: 8px;
      accent-color: var(--color-accent);
      transform: scale(1.1);
    }

    .twc-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
    }

    .twc-input-group label {
      font-weight: bold;
      color: var(--color-accent);
    }

    #twc-delay {
      width: 60px;
      text-align: center;
      background: var(--color-dark);
      border: 1px solid var(--color-primary);
      color: var(--color-light);
      border-radius: 4px;
      padding: 4px;
    }

    .twc-buttons {
      display: flex;
      gap: 8px;
      margin: 12px 0;
    }

    .twc-button {
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

    .twc-button:hover {
      background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .twc-button:active {
      transform: translateY(0);
    }

    .twc-button-start {
      background: linear-gradient(135deg, #2e8b57, #3cb371);
    }

    .twc-button-stop {
      background: linear-gradient(135deg, #b22222, #dc143c);
    }

    #twc-progress {
      width: 100%;
      height: 16px;
      background: var(--color-dark);
      border: 1px solid var(--color-primary);
      border-radius: var(--border-radius);
      margin: 12px 0;
      overflow: hidden;
    }

    #twc-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--color-success), var(--color-warning));
      border-radius: var(--border-radius);
      transition: width 0.5s ease;
      position: relative;
    }

    #twc-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    #twc-log {
      height: 120px;
      overflow: auto;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--color-primary);
      padding: 8px;
      color: var(--color-light);
      border-radius: var(--border-radius);
      font-size: 11px;
      font-family: 'Courier New', monospace;
    }

    .log-entry {
      margin: 2px 0;
      padding: 2px 4px;
      border-radius: 3px;
    }

    .log-success { background: rgba(143, 188, 143, 0.2); }
    .log-warning { background: rgba(218, 165, 32, 0.2); }
    .log-error { background: rgba(205, 92, 92, 0.2); }
    .log-info { background: rgba(205, 133, 63, 0.2); }

    #twc-iframe {
      display: none;
      width: 0;
      height: 0;
      border: none;
    }

    .twc-stats {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--color-accent);
      margin-top: 8px;
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

  // Inicialização do painel
  if (!document.querySelector('#twc-panel')) {
    const style = document.createElement('style');
    style.textContent = ESTILO;
    document.head.appendChild(style);

    // Criar aba de controle
    const tab = document.createElement('div');
    tab.id = 'twc-tab';
    tab.innerHTML = 'CONSTRUTOR TRIBAL';
    tab.className = 'twc-tribal-theme';

    // Criar painel principal
    const panel = document.createElement('div');
    panel.id = 'twc-panel';
    panel.className = 'twc-tribal-theme panel-hidden scrollbar-custom';
    panel.innerHTML = `
      <div class="twc-header">🏹 Construtor Global Tribal</div>
      
      <div class="twc-controls-section">
        <div class="twc-section-title">🏗️ Edifícios para Construir</div>
        <div id="twc-edificios" class="scrollbar-custom">
          ${Object.entries(edificios).map(([k,v])=>`
            <label><input type="checkbox" data-ed="${k}" ${localStorage.getItem('twc_'+k)==='1'?'checked':''}>${v}</label>
          `).join('')}
        </div>
      </div>

      <div class="twc-controls-section">
        <div class="twc-section-title">⚙️ Configurações</div>
        <div class="twc-input-group">
          <label for="twc-delay">Delay entre aldeias (segundos):</label>
          <input id="twc-delay" type="number" min="1" max="30" value="${localStorage.getItem('twc_delay')||5}">
        </div>
      </div>

      <div class="twc-controls-section">
        <div class="twc-section-title">🎮 Controles</div>
        <div class="twc-buttons">
          <button id="twc-start" class="twc-button twc-button-start">⚔️ Iniciar Conquista</button>
          <button id="twc-stop" class="twc-button twc-button-stop">🛡️ Parar Batalha</button>
        </div>
        <div id="twc-progress">
          <div id="twc-bar"></div>
        </div>
      </div>

      <div class="twc-controls-section">
        <div class="twc-section-title">📜 Registro de Batalha</div>
        <div id="twc-log" class="scrollbar-custom"></div>
        <div class="twc-stats">
          <span id="twc-stats-time">⏱️ --:--:--</span>
          <span id="twc-stats-villages">🏘️ 0/0 aldeias</span>
          <span id="twc-stats-status">💤 Inativo</span>
        </div>
      </div>

      <iframe id="twc-iframe"></iframe>
    `;

    document.body.appendChild(tab);
    document.body.appendChild(panel);

    // Controle de visibilidade do painel
    let panelVisible = localStorage.getItem('twc_panel_visible') === 'true';
    
    tab.onclick = () => {
      panelVisible = !panelVisible;
      localStorage.setItem('twc_panel_visible', panelVisible.toString());
      
      if (panelVisible) {
        panel.classList.remove('panel-hidden');
        panel.classList.add('panel-visible');
        tab.innerHTML = '⬅️ OCULTAR';
      } else {
        panel.classList.remove('panel-visible');
        panel.classList.add('panel-hidden');
        tab.innerHTML = 'CONSTRUTOR TRIBAL';
      }
    };

    // Inicializar visibilidade do painel
    if (panelVisible) {
      panel.classList.remove('panel-hidden');
      panel.classList.add('panel-visible');
      tab.innerHTML = '⬅️ OCULTAR';
    }
  }

  // Elementos do DOM
  const logBox = document.querySelector('#twc-log');
  const iframe = document.querySelector('#twc-iframe');
  const progressBar = document.querySelector('#twc-bar');
  const statsTime = document.querySelector('#twc-stats-time');
  const statsVillages = document.querySelector('#twc-stats-villages');
  const statsStatus = document.querySelector('#twc-stats-status');

  let interromper = false;
  const ultimoErro = {};
  let startTime = null;
  let timerInterval = null;

  // Funções de utilidade
  const log = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const typeClass = `log-${type}`;
    logBox.innerHTML += `<div class="log-entry ${typeClass}">[${timestamp}] ${msg}</div>`;
    logBox.scrollTop = logBox.scrollHeight;
  };

  const updateStats = (current = 0, total = 0, status = '') => {
    if (statsVillages) {
      statsVillages.textContent = `🏘️ ${current}/${total} aldeias`;
    }
    if (statsStatus && status) {
      statsStatus.textContent = status;
    }
  };

  const updateTimer = () => {
    if (!startTime) return;
    const now = new Date();
    const diff = now - startTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (statsTime) {
      statsTime.textContent = `⏱️ ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const salvarConfig = () => {
    document.querySelectorAll('#twc-edificios input[type=checkbox]').forEach(ch => {
      localStorage.setItem('twc_' + ch.dataset.ed, ch.checked ? '1' : '0');
    });
    localStorage.setItem('twc_delay', document.querySelector('#twc-delay').value);
  };

  // Event listeners
  document.querySelector('#twc-edificios').addEventListener('change', salvarConfig);
  document.querySelector('#twc-delay').addEventListener('change', salvarConfig);

  document.querySelector('#twc-stop').onclick = () => {
    interromper = true;
    localStorage.setItem('twc_ativo', '0');
    if (timerInterval) clearInterval(timerInterval);
    updateStats(0, 0, '💤 Interrompido');
    log('🛑 Batalha interrompida pelo guerreiro.', 'error');
  };

  // Funções principais (mantidas do código original)
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

          if (doc.querySelector('.queue_building_limit, .error')) {
            log(`⚠️ Fila de batalha cheia na aldeia ${villageId}`, 'warning');
            ultimoErro[villageId] = Date.now();
            return resolve(false);
          }

          for (const edif of fila) {
            const bloco = doc.querySelector(`#main_buildrow_${edif}`);
            if (!bloco) continue;

            const maxSpan = bloco.querySelector('.max_level');
            if (maxSpan) {
              log(`✅ ${edificios[edif]} já alcançou o nível máximo (${villageId})`, 'success');
              continue;
            }

            const botao = bloco.querySelector(`a.btn-build[id^='main_buildlink_${edif}_']:not(.btn-disabled)`);

            if (botao) {
              botao.click();
              setTimeout(() => {
                const aindaExiste = iframe.contentDocument.querySelector(`a.btn-build[id^='main_buildlink_${edif}_']:not(.btn-disabled)`);
                if (!aindaExiste) {
                  log(`🏹 ${edificios[edif]} construído com sucesso na aldeia ${villageId}`, 'success');
                  ultimoErro[villageId] = 0;
                  resolve(true);
                } else {
                  log(`⚠️ Fila ocupada ou erro na aldeia ${villageId}`, 'warning');
                  ultimoErro[villageId] = Date.now();
                  resolve(false);
                }
              }, 1000);
              return;
            }
          }

          log(`⚠️ Nenhuma construção disponível na aldeia ${villageId}`, 'warning');
          ultimoErro[villageId] = Date.now();
          resolve(false);
        } catch(e) {
          log(`❌ Erro crítico na aldeia ${villageId}: ${e.message}`, 'error');
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
    const fila = Object.keys(edificios).filter(k => localStorage.getItem('twc_' + k) === '1');
    
    if (!fila.length) {
      log('⚠️ Nenhum edifício selecionado para a conquista!', 'warning');
      return;
    }
    
    const delay = Number(document.querySelector('#twc-delay').value) * 1000;

    // Iniciar timer
    startTime = new Date();
    timerInterval = setInterval(updateTimer, 1000);
    
    log('⚔️ INICIANDO GRANDE CONQUISTA TRIBAL!', 'success');
    updateStats(0, 0, '⚔️ Conquistando...');

    while (!interromper) {
      const aldeias = await getAldeias();
      const totalAldeias = aldeias.length;
      log(`📜 Examinando ${totalAldeias} aldeia(s) para conquista...`, 'info');

      let aldeiasProcessadas = 0;

      for (let i = 0; i < aldeias.length; i++) {
        if (interromper) break;
        const vid = aldeias[i];
        
        // Pular aldeias com erro recente
        if (ultimoErro[vid] && Date.now() - ultimoErro[vid] < 60000) {
          aldeiasProcessadas++;
          continue;
        }
        
        await tentarFila(vid, fila);
        aldeiasProcessadas++;
        
        // Atualizar progresso
        const progresso = ((aldeiasProcessadas) / totalAldeias * 100).toFixed(1);
        progressBar.style.width = progresso + '%';
        updateStats(aldeiasProcessadas, totalAldeias, '⚔️ Conquistando...');
        
        await new Promise(r => setTimeout(r, delay));
      }

      if (interromper) break;
      
      log(`🔁 Preparando próximo ciclo de conquista (${delay/1000}s)...`, 'info');
      updateStats(0, 0, '⏳ Aguardando...');
      await new Promise(r => setTimeout(r, delay));
    }

    localStorage.setItem('twc_ativo', '0');
    if (timerInterval) clearInterval(timerInterval);
    updateStats(0, 0, '💤 Conquista Finalizada');
    log('✅ Grande conquista tribal finalizada!', 'success');
  }

  document.querySelector('#twc-start').onclick = iniciarLoop;

  // Auto-retomada após reload
  window.addEventListener('load', () => {
    if (localStorage.getItem('twc_ativo') === '1') {
      log('♻️ Retomando a grande conquista tribal...', 'info');
      setTimeout(iniciarLoop, 2000);
    }
  });

})();
