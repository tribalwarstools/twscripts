// ==UserScript==
// @name         TW BR – Scanner Avançado por Raio + Pontuação (Refatorado)
// @version      2.5
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.__PAINEL_SCAN_AVANCADO__) {
        try { if (typeof UI !== 'undefined' && UI.InfoMessage) UI.InfoMessage("Painel já está aberto!"); } catch(e){ }
        return;
    }
    window.__PAINEL_SCAN_AVANCADO__ = true;

    // ---------- STORAGE HELPERS ----------
    function getStorage(key, defaultValue = '') {
        try {
            const item = localStorage.getItem(`tw_scanner_${key}`);
            return item !== null ? item : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    function setStorage(key, value) {
        try { localStorage.setItem(`tw_scanner_${key}`, value); } catch (e) { console.log(e); }
    }
    function getStorageObject(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`tw_scanner_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    function setStorageObject(key, value) {
        try { localStorage.setItem(`tw_scanner_${key}`, JSON.stringify(value)); } catch (e) { console.log(e); }
    }

    // ---------- CSS ----------
    const css = `
    /* (estilos mantidos/ajustados) */
    #scannerPanel{position:fixed;top:120px;left:50px;width:420px;background:linear-gradient(135deg,#f4e4bc 0%,#e8d4a6 100%);border:2px solid #8b5a2b;border-radius:12px;padding:15px;z-index:10000;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.3);backdrop-filter:blur(5px);cursor:default}
    #scannerPanel.dragging{opacity:.8;box-shadow:0 6px 25px rgba(0,0,0,.4)}
    #scannerPanel h2{margin-top:0;text-align:center;color:#5a3e16;font-size:18px;padding-bottom:10px;border-bottom:2px solid #b48a52;margin-bottom:15px;cursor:move;user-select:none}
    .scanner-section{margin-bottom:15px;padding:10px;background:rgba(255,255,255,.6);border-radius:8px;border:1px solid #c8a66b}
    .scanner-label{display:block;font-weight:bold;margin-bottom:5px;color:#5a3e16;font-size:12px}
    .scanner-input{width:100%;padding:8px;margin:2px 0 8px 0;border:1px solid #aa7a3c;border-radius:6px;background:#fffdf5;box-sizing:border-box;font-size:13px}
    .scanner-input:focus{outline:none;border-color:#8b5a2b;box-shadow:0 0 5px rgba(139,90,43,.3)}
    .scanner-buttons{display:flex;gap:8px;margin-top:10px}
    .scanner-btn{flex:1;padding:10px;background:linear-gradient(to bottom,#cfa869 0%,#b48a52 100%);border:1px solid #7a5424;border-radius:6px;cursor:pointer;font-weight:bold;color:#3e2a10;font-size:13px;transition:all .2s}
    .scanner-btn:hover{background:linear-gradient(to bottom,#ddb57a 0%,#cfa869 100%);transform:translateY(-1px)}
    .scanner-btn:active{transform:translateY(1px)}
    .scanner-btn-secondary{background:linear-gradient(to bottom,#a8a8a8 0%,#8a8a8a 100%);border-color:#666}
    .scanner-btn-danger{background:linear-gradient(to bottom,#e74c3c 0%,#c0392b 100%);border-color:#922b21}
    #scannerResults{max-height:400px;overflow-y:auto;margin-top:15px;background:#fff;padding:8px;border-radius:8px;border:1px solid #c8a66b;font-size:12px}
    .scanRow{padding:8px;border-bottom:1px solid #e8d4a6;transition:background .2s}
    .scanRow:hover{background:#f8f4e8}
    .scanRow:last-child{border:none}
    .player-name{font-weight:bold;color:#8b5a2b}
    .player-points{color:#5a3e16;font-size:11px}
    .village-coord{color:#d35400;font-weight:bold;cursor:pointer;text-decoration:underline}
    .village-distance{color:#7f8c8d;font-size:11px}
    .results-header{display:flex;justify-content:space-between;padding:5px 8px;background:#e8d4a6;border-radius:4px;margin-bottom:5px;font-weight:bold;font-size:11px}
    .close-btn{position:absolute;top:10px;right:12px;background:none;border:none;font-size:18px;cursor:pointer;color:#8b5a2b;font-weight:bold;padding:0;width:20px;height:20px;z-index:10001}
    .close-btn:hover{color:#5a3e16}
    .scanner-row{display:flex;gap:8px;align-items:center}
    .scanner-checkbox{margin-right:5px}
    .checkbox-label{font-size:12px;color:#5a3e16;display:flex;align-items:center;margin:5px 0}
    .config-buttons{display:flex;gap:5px;margin-top:10px}
    .small-btn{padding:5px 8px;font-size:11px;flex:1}
    .tribe-filter{display:flex;gap:8px;margin:8px 0}
    .filter-section{background:rgba(255,255,255,.5);padding:8px;border-radius:6px;margin:8px 0}
    .filter-title{font-weight:bold;color:#5a3e16;margin-bottom:5px;font-size:12px}
    .player-tribe{color:#2980b9;font-size:11px}
    .player-stats{color:#7f8c8d;font-size:10px}
    .drag-handle{cursor:move;user-select:none}
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // ---------- HTML ----------
    const panel = document.createElement('div');
    panel.id = 'scannerPanel';
    panel.innerHTML = `
        <button class="close-btn" title="Fechar (Esc)">×</button>
        <h2 class="drag-handle">🛡️ Scanner TW BR</h2>

        <div class="scanner-section">
            <label class="scanner-label">Coordenada Central</label>
            <input id="scanCoord" class="scanner-input" placeholder="500|500" value="${getStorage('lastCoord','')}">

            <div class="scanner-row">
                <div style="flex:1">
                    <label class="scanner-label">Raio</label>
                    <input id="scanRaio" type="number" min="1" class="scanner-input" placeholder="20" value="${getStorage('lastRaio','20')}">
                </div>
                <div style="flex:1">
                    <label class="scanner-label">Pontuação</label>
                    <div style="display:flex;gap:5px">
                        <input id="scanMin" type="number" class="scanner-input" placeholder="Mín" value="${getStorage('lastMin','0')}">
                        <input id="scanMax" type="number" class="scanner-input" placeholder="Máx" value="${getStorage('lastMax','999999')}">
                    </div>
                </div>
            </div>

            <div class="filter-section">
                <div class="filter-title">Filtros de Tribo</div>
                <label class="scanner-label">Incluir Tribos (separar por vírgula)</label>
                <input id="tribosInclude" class="scanner-input" placeholder="TAG1, TAG2" value="${getStorage('tribosInclude','')}">
                <label class="scanner-label">Excluir Tribos (separar por vírgula)</label>
                <input id="tribosExclude" class="scanner-input" placeholder="TAG1, TAG2" value="${getStorage('tribosExclude','')}">
            </div>

            <div class="filter-section">
                <div class="filter-title">Filtros Adicionais</div>
                <label class="checkbox-label"><input type="checkbox" id="scanBarbaros" class="scanner-checkbox" ${getStorage('incluirBarbaros','false')==='true'?'checked':''}> 🏹 Incluir aldeias bárbaras</label>
                <label class="checkbox-label"><input type="checkbox" id="scanSoBarbaros" class="scanner-checkbox" ${getStorage('soBarbaros','false')==='true'?'checked':''}> 🎯 Apenas aldeias bárbaras</label>
                <label class="checkbox-label"><input type="checkbox" id="scanSoTribo" class="scanner-checkbox" ${getStorage('soTribo','false')==='true'?'checked':''}> 👥 Apenas membros da minha tribo</label>
            </div>
        </div>

        <div class="scanner-buttons">
            <button id="scanBtn" class="scanner-btn">🔍 Buscar Jogadores</button>
            <button id="clearBtn" class="scanner-btn scanner-btn-secondary">🗑️ Limpar</button>
        </div>

        <div class="config-buttons">
            <button id="saveConfigBtn" class="scanner-btn small-btn">💾 Salvar</button>
            <button id="loadConfigBtn" class="scanner-btn small-btn">📂 Carregar</button>
            <button id="resetConfigBtn" class="scanner-btn scanner-btn-danger small-btn">🔄 Resetar</button>
        </div>

        <div class="results-header">
            <span>Resultados: <span id="resultsCount">0</span> encontrados</span>
            <span id="loadingText"></span>
        </div>
        <div id="scannerResults"></div>
    `;
    document.body.appendChild(panel);

    // ---------- Restore panel pos ----------
    const savedPos = getStorageObject('panelPos', null);
    if (savedPos && typeof savedPos.left !== 'undefined' && typeof savedPos.top !== 'undefined') {
        panel.style.left = savedPos.left;
        panel.style.top = savedPos.top;
    }

    // ---------- Close button & Esc ----------
    panel.querySelector('.close-btn').addEventListener('click', closePanel);
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closePanel();
    });
    function closePanel() {
        try { document.body.removeChild(panel); } catch(e){ }
        window.__PAINEL_SCAN_AVANCADO__ = false;
    }

    // ---------- Drag handling: only start when clicking drag-handle ----------
    let isDragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;

    panel.addEventListener('mousedown', function(e) {
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;
        isDragging = true;
        const rect = panel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        panel.classList.add('dragging');
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;
        const maxX = window.innerWidth - panel.offsetWidth;
        const maxY = window.innerHeight - panel.offsetHeight;
        panel.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        panel.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    });

    document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false;
        panel.classList.remove('dragging');
        document.body.style.userSelect = '';

        // Save position
        setStorageObject('panelPos', {
            left: panel.style.left || '50px',
            top: panel.style.top || '120px'
        });
    });

    // ---------- Auto-fill current coord (best effort) ----------
    function preencherCoordenadaAtual() {
        try {
            if (typeof Game !== 'undefined' && Game.playerVillage) {
                const v = Game.playerVillage;
                document.getElementById('scanCoord').placeholder = `${v.x}|${v.y}`;
                return;
            }
            const villageElement = document.querySelector('#village_name_field');
            if (villageElement) {
                const villageId = villageElement.getAttribute('data-village-id');
                if (villageId && typeof VillageData !== 'undefined' && VillageData[villageId]) {
                    const v = VillageData[villageId];
                    document.getElementById('scanCoord').placeholder = `${v.x}|${v.y}`;
                    return;
                }
            }
            const urlParams = new URLSearchParams(window.location.search);
            const village = urlParams.get('village');
            if (village && typeof VillageData !== 'undefined' && VillageData[village]) {
                const v = VillageData[village];
                document.getElementById('scanCoord').placeholder = `${v.x}|${v.y}`;
                return;
            }
        } catch (e) {
            console.log('preencherCoordenadaAtual erro', e);
        }
    }
    setTimeout(preencherCoordenadaAtual, 800);

    // ---------- Utility: safe text -> upper TAG list ----------
    function parseTagList(raw) {
        if (!raw) return [];
        return raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }

    // ---------- copyToClipboard - global (prevents propagation) ----------
    window.copyToClipboard = function(text, event) {
        if (event) {
            try { event.stopPropagation(); } catch(e){}
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                try { if (typeof UI !== 'undefined' && UI.SuccessMessage) UI.SuccessMessage(`Coordenada ${text} copiada!`); else alert(`Coordenada ${text} copiada!`); } catch(e){ alert(`Coordenada ${text} copiada!`); }
            }).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }

        function fallbackCopy(t) {
            const ta = document.createElement('textarea');
            ta.value = t;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch(e){ }
            document.body.removeChild(ta);
            try { if (typeof UI !== 'undefined' && UI.SuccessMessage) UI.SuccessMessage(`Coordenada ${text} copiada!`); else alert(`Coordenada ${text} copiada!`); } catch(e){ alert(`Coordenada ${text} copiada!`); }
        }
    };

    // ---------- Main scanner logic ----------
    const scanBtn = document.getElementById('scanBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultsDiv = document.getElementById('scannerResults');
    const loadingText = document.getElementById('loadingText');
    const resultsCount = document.getElementById('resultsCount');

    let currentFetchAbort = null;

    async function buscarJogadores() {
        // Prevent double-clicks / concurrent runs
        if (scanBtn.disabled) return;
        scanBtn.disabled = true;
        scanBtn.textContent = '⏳ Buscando...';

        const coord = document.getElementById("scanCoord").value.trim() || document.getElementById("scanCoord").placeholder.trim();
        const raio = Number(document.getElementById("scanRaio").value);
        const minP = Number(document.getElementById("scanMin").value) || 0;
        const maxP = Number(document.getElementById("scanMax").value) || 9999999;
        const incluirBarbaros = document.getElementById("scanBarbaros").checked;
        const soBarbaros = document.getElementById("scanSoBarbaros").checked;
        const soTribo = document.getElementById("scanSoTribo").checked;

        const tribosInclude = parseTagList(document.getElementById("tribosInclude").value);
        const tribosExclude = parseTagList(document.getElementById("tribosExclude").value);

        if (!coord || !coord.includes("|")) {
            alert("Por favor, insira uma coordenada válida no formato X|Y");
            scanBtn.disabled = false;
            scanBtn.textContent = '🔍 Buscar Jogadores';
            return;
        }
        if (!raio || raio <= 0 || isNaN(raio)) {
            alert("Por favor, insira um raio válido maior que 0");
            scanBtn.disabled = false;
            scanBtn.textContent = '🔍 Buscar Jogadores';
            return;
        }

        // Save quick settings
        setStorage('lastCoord', coord);
        setStorage('lastRaio', String(raio));
        setStorage('lastMin', String(minP));
        setStorage('lastMax', String(maxP));
        setStorage('incluirBarbaros', String(incluirBarbaros));
        setStorage('soBarbaros', String(soBarbaros));
        setStorage('soTribo', String(soTribo));
        setStorage('tribosInclude', document.getElementById("tribosInclude").value);
        setStorage('tribosExclude', document.getElementById("tribosExclude").value);

        const [cx, cy] = coord.split("|").map(Number);
        resultsDiv.innerHTML = "<div class='scanRow'>📡 Coletando dados do servidor...</div>";
        loadingText.textContent = "Carregando dados...";

        try {
            // Fetch map files (ally optional)
            const [villagesRaw, playersRaw, alliesRaw] = await Promise.all([
                fetch('/map/village.txt').then(r => r.text()),
                fetch('/map/player.txt').then(r => r.text()),
                fetch('/map/ally.txt').then(r => r.text()).catch(() => "")
            ]);
            loadingText.textContent = "Processando...";

            // Parse players
            const players = {};
            playersRaw.trim().split("\n").forEach(line => {
                if (!line) return;
                const p = line.split(',');
                // Expecting at least 6 columns: ID,NAME,ALLY,NUM_VILLAGES,POINTS,RANK
                if (p.length >= 6) {
                    players[p[0]] = {
                        id: p[0],
                        nome: p[1],
                        aliado: p[2],
                        aldeias: Number(p[3]) || 0,
                        pontos: Number(p[4]) || 0,
                        rank: Number(p[5]) || 0
                    };
                }
            });

            // Parse allies -> map id -> {tag: TAG, name: NAME}
            const allies = {};
            if (alliesRaw) {
                alliesRaw.trim().split("\n").forEach(line => {
                    if (!line) return;
                    const a = line.split(',');
                    // ally.txt: ID,TAG,Name
                    if (a.length >= 3) {
                        allies[a[0]] = { tag: (a[1]||'').toUpperCase(), name: a[2] || '' };
                    }
                });
            }

            // detect my tribe tag (if possible)
            let minhaTriboTag = '';
            try {
                if (typeof UI !== 'undefined' && UI.player_data && UI.player_data.ally) {
                    const minhaTriboId = UI.player_data.ally;
                    if (minhaTriboId && allies[minhaTriboId]) minhaTriboTag = allies[minhaTriboId].tag || '';
                } else if (typeof Game !== 'undefined' && Game.player && Game.player.ally) {
                    const minhaTriboId = Game.player.ally;
                    if (minhaTriboId && allies[minhaTriboId]) minhaTriboTag = allies[minhaTriboId].tag || '';
                }
            } catch (e) {
                console.log('detectar tribo erro', e);
            }

            // iterate villages
            const encontrados = [];
            const raioQuad = raio * raio;

            villagesRaw.trim().split("\n").forEach(line => {
                if (!line) return;
                const v = line.split(',');
                // village.txt structure (depends on server) but normally includes id,x,y,owner,...
                // Example assumption: id,name,x,y,owner,...
                if (v.length < 5) return;
                const vx = Number(v[2]);
                const vy = Number(v[3]);
                const owner = v[4];

                const isBarbaro = owner === '0';

                if (soBarbaros && !isBarbaro) return;
                if (!soBarbaros && !incluirBarbaros && isBarbaro) return;

                const dx = vx - cx;
                const dy = vy - cy;
                const distQuad = dx*dx + dy*dy;
                if (distQuad > raioQuad) return;

                if (isBarbaro) {
                    const distNum = Number(Math.sqrt(distQuad).toFixed(1));
                    encontrados.push({
                        jogador: '🏹 Aldeia Bárbara',
                        pontos: 0,
                        coord: `${vx}|${vy}`,
                        dist: distNum,
                        aliado: '',
                        aldeias: 1,
                        rank: 0,
                        isBarbaro: true
                    });
                    return;
                }

                const pj = players[owner];
                if (!pj) return;

                // points filter
                if (pj.pontos < minP || pj.pontos > maxP) return;

                // tribe tag normalized
                let triboTag = '';
                if (pj.aliado && allies[pj.aliado]) triboTag = (allies[pj.aliado].tag || '').toUpperCase();

                // only my tribe
                if (soTribo && minhaTriboTag) {
                    if (triboTag !== minhaTriboTag) return;
                } else if (soTribo && !minhaTriboTag) {
                    // If we cannot detect my tribe, be conservative: skip
                    return;
                }

                // include/exclude tribe tag filters
                if (tribosInclude.length > 0) {
                    if (!triboTag || !tribosInclude.includes(triboTag)) return;
                }
                if (tribosExclude.length > 0 && triboTag) {
                    if (tribosExclude.includes(triboTag)) return;
                }

                const distNum = Number(Math.sqrt(distQuad).toFixed(1));
                encontrados.push({
                    jogador: pj.nome,
                    pontos: pj.pontos,
                    coord: `${vx}|${vy}`,
                    dist: distNum,
                    aliado: triboTag || pj.aliado,
                    aldeias: pj.aldeias,
                    rank: pj.rank,
                    isBarbaro: false
                });
            });

            // sort numerically by distance
            encontrados.sort((a,b) => a.dist - b.dist);

            // render
            loadingText.textContent = '';
            resultsCount.textContent = encontrados.length;
            resultsDiv.innerHTML = '';
            if (encontrados.length === 0) {
                resultsDiv.innerHTML = "<div class='scanRow'><b>❌ Nenhum jogador encontrado com os filtros atuais.</b></div>";
            } else {
                encontrados.forEach(r => {
                    const row = document.createElement('div');
                    row.className = 'scanRow';
                    // create safe coord element with click handler to copy (stopPropagation)
                    const coordHtml = `<span class="village-coord" data-coord="${r.coord}">${r.coord}</span>`;
                    if (r.isBarbaro) {
                        row.innerHTML = `<div>
                            <span class="player-name" style="color:#27ae60">${r.jogador}</span><br>
                            Aldeia: ${coordHtml}
                            <span class="village-distance"> — ${r.dist} quadrantes</span>
                        </div>`;
                    } else {
                        row.innerHTML = `<div>
                            <span class="player-name">${r.jogador}</span>
                            <span class="player-points"> (${r.pontos.toLocaleString()} pts)</span>
                            ${r.aliado ? `<br><span class="player-tribe">Tribo: ${r.aliado}</span>` : '<br><span class="player-tribe">Sem tribo</span>'}
                            <br>Aldeia: ${coordHtml}
                            <span class="village-distance"> — ${r.dist} quadrantes</span>
                            <br><span class="player-stats">Rank: ${r.rank} | Aldeias: ${r.aldeias}</span>
                        </div>`;
                    }
                    resultsDiv.appendChild(row);

                    // attach click to copy (find element by data-coord)
                    const coordEl = row.querySelector('.village-coord');
                    if (coordEl) {
                        coordEl.addEventListener('click', function(ev){
                            const c = this.getAttribute('data-coord');
                            window.copyToClipboard(c, ev);
                        });
                        // prevent drag when clicking coord
                        coordEl.addEventListener('mousedown', function(ev){ ev.stopPropagation(); });
                    }
                });
            }

        } catch (err) {
            console.error('Erro scanner', err);
            loadingText.textContent = '';
            resultsDiv.innerHTML = `<div class='scanRow'><b>❌ Erro ao carregar dados: ${err && err.message ? err.message : String(err)}</b></div>`;
        } finally {
            scanBtn.disabled = false;
            scanBtn.textContent = '🔍 Buscar Jogadores';
        }
    }

    // ---------- Controls ----------
    scanBtn.addEventListener('click', buscarJogadores);
    clearBtn.addEventListener('click', function(){
        resultsDiv.innerHTML = '';
        resultsCount.textContent = '0';
        loadingText.textContent = '';
    });

    // Save / Load / Reset
    document.getElementById('saveConfigBtn').addEventListener('click', function(){
        const config = {
            coord: document.getElementById("scanCoord").value,
            raio: document.getElementById("scanRaio").value,
            min: document.getElementById("scanMin").value,
            max: document.getElementById("scanMax").value,
            barbaros: document.getElementById("scanBarbaros").checked,
            soBarbaros: document.getElementById("scanSoBarbaros").checked,
            soTribo: document.getElementById("scanSoTribo").checked,
            tribosInclude: document.getElementById("tribosInclude").value,
            tribosExclude: document.getElementById("tribosExclude").value
        };
        setStorageObject('savedConfig', config);
        alert('Configuração salva!');
    });

    document.getElementById('loadConfigBtn').addEventListener('click', function(){
        const config = getStorageObject('savedConfig', null);
        if (!config) { alert('Nenhuma configuração salva encontrada!'); return; }
        document.getElementById("scanCoord").value = config.coord || '';
        document.getElementById("scanRaio").value = config.raio || '20';
        document.getElementById("scanMin").value = config.min || '0';
        document.getElementById("scanMax").value = config.max || '999999';
        document.getElementById("scanBarbaros").checked = !!config.barbaros;
        document.getElementById("scanSoBarbaros").checked = !!config.soBarbaros;
        document.getElementById("scanSoTribo").checked = !!config.soTribo;
        document.getElementById("tribosInclude").value = config.tribosInclude || '';
        document.getElementById("tribosExclude").value = config.tribosExclude || '';
        alert('Configuração carregada!');
    });

    document.getElementById('resetConfigBtn').addEventListener('click', function(){
        if (!confirm('Tem certeza que deseja resetar todas as configurações do scanner?')) return;
        // Remove keys starting with tw_scanner_
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(k => { if (k.startsWith('tw_scanner_')) localStorage.removeItem(k); });
        } catch (e) { console.log(e); }
        // Reset UI
        document.getElementById("scanCoord").value = "";
        document.getElementById("scanRaio").value = "20";
        document.getElementById("scanMin").value = "0";
        document.getElementById("scanMax").value = "999999";
        document.getElementById("scanBarbaros").checked = false;
        document.getElementById("scanSoBarbaros").checked = false;
        document.getElementById("scanSoTribo").checked = false;
        document.getElementById("tribosInclude").value = "";
        document.getElementById("tribosExclude").value = "";
        document.getElementById("scannerResults").innerHTML = "";
        document.getElementById("resultsCount").textContent = "0";
        alert('Configurações resetadas!');
    });

    // Enter key triggers search on main inputs
    ['scanCoord','scanRaio','scanMin','scanMax'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keypress', function(e){ if (e.key === 'Enter') buscarJogadores(); });
    });

    // done
})();
