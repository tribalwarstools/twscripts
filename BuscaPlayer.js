// ==UserScript==
// @name         TW BR – Scanner Avançado por Raio + Pontuação
// @version      2.6
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    if (window.__PAINEL_SCAN_AVANCADO__) {
        UI.InfoMessage("Painel já está aberto!");
        return;
    }
    window.__PAINEL_SCAN_AVANCADO__ = true;

    // === FUNÇÕES DE ARMAZENAMENTO ===
    function getStorage(key, defaultValue) {
        try {
            const item = localStorage.getItem(`tw_scanner_${key}`);
            return item !== null ? item : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    function setStorage(key, value) {
        try {
            localStorage.setItem(`tw_scanner_${key}`, value);
        } catch (e) {
            console.log('Erro ao salvar configurações:', e);
        }
    }

    function getStorageObject(key, defaultValue) {
        try {
            const item = localStorage.getItem(`tw_scanner_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    function setStorageObject(key, value) {
        try {
            localStorage.setItem(`tw_scanner_${key}`, JSON.stringify(value));
        } catch (e) {
            console.log('Erro ao salvar configurações:', e);
        }
    }

    // === ESTILOS DO PAINEL MELHORADO ===
    const css = `
        #scannerPanel {
            position: fixed;
            top: 120px;
            left: 50px;
            width: 420px;
            background: linear-gradient(135deg, #f4e4bc 0%, #e8d4a6 100%);
            border: 2px solid #8b5a2b;
            border-radius: 12px;
            padding: 15px;
            z-index: 9999999999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            backdrop-filter: blur(5px);
            cursor: move;
        }
        
        #scannerPanel.dragging {
            opacity: 0.8;
            box-shadow: 0 6px 25px rgba(0,0,0,0.4);
        }
        
        #scannerPanel h2 {
            margin-top: 0;
            text-align: center;
            color: #5a3e16;
            font-size: 18px;
            padding-bottom: 10px;
            border-bottom: 2px solid #b48a52;
            margin-bottom: 15px;
            cursor: move;
            user-select: none;
        }
        
        .scanner-section {
            margin-bottom: 15px;
            padding: 10px;
            background: rgba(255,255,255,0.6);
            border-radius: 8px;
            border: 1px solid #c8a66b;
        }
        
        .scanner-label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
            color: #5a3e16;
            font-size: 12px;
        }
        
        .scanner-input {
            width: 100%;
            padding: 8px;
            margin: 2px 0 8px 0;
            border: 1px solid #aa7a3c;
            border-radius: 6px;
            background: #fffdf5;
            box-sizing: border-box;
            font-size: 13px;
        }
        
        .scanner-input:focus {
            outline: none;
            border-color: #8b5a2b;
            box-shadow: 0 0 5px rgba(139, 90, 43, 0.3);
        }
        
        .scanner-buttons {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }
        
        .scanner-btn {
            flex: 1;
            padding: 10px;
            background: linear-gradient(to bottom, #cfa869 0%, #b48a52 100%);
            border: 1px solid #7a5424;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            color: #3e2a10;
            font-size: 13px;
            transition: all 0.2s;
        }
        
        .scanner-btn:hover {
            background: linear-gradient(to bottom, #ddb57a 0%, #cfa869 100%);
            transform: translateY(-1px);
        }
        
        .scanner-btn:active {
            transform: translateY(1px);
        }
        
        .scanner-btn-secondary {
            background: linear-gradient(to bottom, #a8a8a8 0%, #8a8a8a 100%);
            border-color: #666;
        }
        
        .scanner-btn-danger {
            background: linear-gradient(to bottom, #e74c3c 0%, #c0392b 100%);
            border-color: #922b21;
        }
        
        #scannerResults {
            max-height: 400px;
            overflow-y: auto;
            margin-top: 15px;
            background: #fff;
            padding: 8px;
            border-radius: 8px;
            border: 1px solid #c8a66b;
            font-size: 12px;
        }
        
        .scanRow {
            padding: 8px;
            border-bottom: 1px solid #e8d4a6;
            transition: background 0.2s;
        }
        
        .scanRow:hover {
            background: #f8f4e8;
        }
        
        .scanRow:last-child {
            border: none;
        }
        
        .player-name {
            font-weight: bold;
            color: #8b5a2b;
        }
        
        .player-points {
            color: #5a3e16;
            font-size: 11px;
        }
        
        .village-coord {
            color: #d35400;
            font-weight: bold;
            cursor: pointer;
            text-decoration: underline;
        }
        
        .village-distance {
            color: #7f8c8d;
            font-size: 11px;
        }
        
        .results-header {
            display: flex;
            justify-content: space-between;
            padding: 5px 8px;
            background: #e8d4a6;
            border-radius: 4px;
            margin-bottom: 5px;
            font-weight: bold;
            font-size: 11px;
        }
        
        .close-btn {
            position: absolute;
            top: 10px;
            right: 12px;
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #8b5a2b;
            font-weight: bold;
            padding: 0;
            width: 20px;
            height: 20px;
            z-index: 10001;
        }
        
        .close-btn:hover {
            color: #5a3e16;
        }
        
        .scanner-row {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .scanner-row .scanner-input {
            margin-bottom: 0;
        }
        
        .scanner-checkbox {
            margin-right: 5px;
        }
        
        .checkbox-label {
            font-size: 12px;
            color: #5a3e16;
            display: flex;
            align-items: center;
            margin: 5px 0;
        }
        
        .config-buttons {
            display: flex;
            gap: 5px;
            margin-top: 10px;
        }
        
        .small-btn {
            padding: 5px 8px;
            font-size: 11px;
            flex: 1;
        }
        
        .tribe-filter {
            display: flex;
            gap: 8px;
            margin: 8px 0;
        }
        
        .tribe-filter input {
            flex: 1;
        }
        
        .filter-section {
            background: rgba(255,255,255,0.5);
            padding: 8px;
            border-radius: 6px;
            margin: 8px 0;
        }
        
        .filter-title {
            font-weight: bold;
            color: #5a3e16;
            margin-bottom: 5px;
            font-size: 12px;
        }
        
        .player-tribe {
            color: #2980b9;
            font-size: 11px;
            font-weight: bold;
        }
        
        .player-stats {
            color: #7f8c8d;
            font-size: 10px;
        }
        
        .drag-handle {
            cursor: move;
            user-select: none;
        }
        
        .filter-hint {
            font-size: 10px;
            color: #7f8c8d;
            font-style: italic;
            margin-top: 2px;
        }
    `;
    
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // === HTML DO PAINEL ATUALIZADO ===
    const div = document.createElement("div");
    div.id = "scannerPanel";
    div.innerHTML = `
        <button class="close-btn" title="Fechar">×</button>
        <h2 class="drag-handle">🛡️ Scanner TW BR v2.6</h2>
        
        <div class="scanner-section">
            <label class="scanner-label">Coordenada Central</label>
            <input id="scanCoord" class="scanner-input" placeholder="500|500" value="${getStorage('lastCoord', '')}">
            
            <div class="scanner-row">
                <div style="flex: 1;">
                    <label class="scanner-label">Raio</label>
                    <input id="scanRaio" type="number" class="scanner-input" placeholder="20" value="${getStorage('lastRaio', '20')}">
                </div>
                <div style="flex: 1;">
                    <label class="scanner-label">Pontuação</label>
                    <div style="display: flex; gap: 5px;">
                        <input id="scanMin" type="number" class="scanner-input" placeholder="Mín" value="${getStorage('lastMin', '0')}">
                        <input id="scanMax" type="number" class="scanner-input" placeholder="Máx" value="${getStorage('lastMax', '999999')}">
                    </div>
                </div>
            </div>
            
            <div class="filter-section">
                <div class="filter-title">Filtros de Tribo (por TAG)</div>
                <label class="scanner-label">Incluir Tribos (TAGs separadas por vírgula)</label>
                <input id="tribosInclude" class="scanner-input" placeholder="PLOT, ABC, XYZ" value="${getStorage('tribosInclude', '')}">
                <div class="filter-hint">Ex: PLOT ou ABC,XYZ,DEF</div>
                
                <label class="scanner-label">Excluir Tribos (TAGs separadas por vírgula)</label>
                <input id="tribosExclude" class="scanner-input" placeholder="ENEMY, FOE" value="${getStorage('tribosExclude', '')}">
                <div class="filter-hint">Ex: ENEMY ou FOE,BAD,EVIL</div>
            </div>
            
            <div class="filter-section">
                <div class="filter-title">Filtros Adicionais</div>
                <label class="checkbox-label">
                    <input type="checkbox" id="scanBarbaros" class="scanner-checkbox" ${getStorage('incluirBarbaros', 'false') === 'true' ? 'checked' : ''}>
                    🏹 Incluir aldeias bárbaras
                </label>
                
                <label class="checkbox-label">
                    <input type="checkbox" id="scanSoBarbaros" class="scanner-checkbox" ${getStorage('soBarbaros', 'false') === 'true' ? 'checked' : ''}>
                    🎯 Apenas aldeias bárbaras
                </label>
                
                <label class="checkbox-label">
                    <input type="checkbox" id="scanSoTribo" class="scanner-checkbox" ${getStorage('soTribo', 'false') === 'true' ? 'checked' : ''}>
                    👥 Apenas membros da minha tribo
                </label>
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
    document.body.appendChild(div);

    // === FUNCIONALIDADES AVANÇADAS ===
    
    // Fechar painel
    div.querySelector('.close-btn').onclick = () => {
        document.body.removeChild(div);
        window.__PAINEL_SCAN_AVANCADO__ = false;
    };

    // Sistema de drag melhorado
    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    function startDrag(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.type === 'checkbox') {
            return;
        }
        
        isDragging = true;
        dragOffsetX = e.clientX - div.getBoundingClientRect().left;
        dragOffsetY = e.clientY - div.getBoundingClientRect().top;
        
        div.classList.add('dragging');
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
        e.stopPropagation();
    }

    function doDrag(e) {
        if (!isDragging) return;
        
        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;
        
        const maxX = window.innerWidth - div.offsetWidth;
        const maxY = window.innerHeight - div.offsetHeight;
        
        div.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        div.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    }

    function stopDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        div.classList.remove('dragging');
        document.body.style.userSelect = '';
        
        setStorageObject('panelPos', {
            left: div.style.left,
            top: div.style.top
        });
    }

    div.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);

    const savedPos = getStorageObject('panelPos', null);
    if (savedPos) {
        div.style.left = savedPos.left;
        div.style.top = savedPos.top;
    }

    // Detectar coordenada atual automaticamente
    function preencherCoordenadaAtual() {
        try {
            if (typeof Game !== 'undefined' && Game.playerVillage) {
                const village = Game.playerVillage;
                document.getElementById('scanCoord').placeholder = `${village.x}|${village.y}`;
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
            }
        } catch (e) {
            console.log('Não foi possível detectar coordenada atual');
        }
    }

    setTimeout(preencherCoordenadaAtual, 1000);

    // === LÓGICA DO SCAN CORRIGIDA - USA TAG CORRETA ===
    async function buscarJogadores() {
        const coord = document.getElementById("scanCoord").value.trim();
        const raio = Number(document.getElementById("scanRaio").value);
        const minP = Number(document.getElementById("scanMin").value);
        const maxP = Number(document.getElementById("scanMax").value);
        const incluirBarbaros = document.getElementById("scanBarbaros").checked;
        const soBarbaros = document.getElementById("scanSoBarbaros").checked;
        const soTribo = document.getElementById("scanSoTribo").checked;
        
        // Filtros de tribo - processar TAGs
        const tribosInclude = document.getElementById("tribosInclude").value
            .split(',')
            .map(t => t.trim())
            .filter(t => t);
            
        const tribosExclude = document.getElementById("tribosExclude").value
            .split(',')
            .map(t => t.trim())
            .filter(t => t);

        if (!coord || !coord.includes("|")) {
            alert("Por favor, insira uma coordenada válida no formato X|Y");
            return;
        }

        if (!raio || raio <= 0) {
            alert("Por favor, insira um raio válido maior que 0");
            return;
        }

        // Salvar configurações
        setStorage('lastCoord', coord);
        setStorage('lastRaio', raio.toString());
        setStorage('lastMin', minP.toString());
        setStorage('lastMax', maxP.toString());
        setStorage('incluirBarbaros', incluirBarbaros.toString());
        setStorage('soBarbaros', soBarbaros.toString());
        setStorage('soTribo', soTribo.toString());
        setStorage('tribosInclude', document.getElementById("tribosInclude").value);
        setStorage('tribosExclude', document.getElementById("tribosExclude").value);

        const [cx, cy] = coord.split("|").map(Number);
        const resultsDiv = document.getElementById("scannerResults");
        const loadingText = document.getElementById("loadingText");
        const resultsCount = document.getElementById("resultsCount");

        loadingText.textContent = "Carregando dados...";
        resultsDiv.innerHTML = "<div class='scanRow'>📡 Coletando dados do servidor...</div>";

        try {
            const [villagesRaw, playersRaw, alliesRaw] = await Promise.all([
                fetch('/map/village.txt').then(r => r.text()),
                fetch('/map/player.txt').then(r => r.text()),
                fetch('/map/ally.txt').then(r => r.text()).catch(() => "")
            ]);

            loadingText.textContent = "Processando...";

            // Mapa de jogadores
            const players = {};
            playersRaw.trim().split("\n").forEach(l => {
                const p = l.split(",");
                if (p.length >= 5) {
                    players[p[0]] = {
                        id: p[0],
                        nome: p[1],
                        aliado_id: p[2],
                        aldeias: Number(p[3]),
                        pontos: Number(p[4]),
                        rank: Number(p[5]) || 0
                    };
                }
            });

            // ===== CORREÇÃO PRINCIPAL: MAPEAR ID → TAG CORRETAMENTE =====
            const alliesMap = {};
            if (alliesRaw) {
                alliesRaw.trim().split("\n").forEach(l => {
                    const a = l.split(",");
                    if (a.length >= 3) {
                        // Formato: ID,NOME_COMPLETO,TAG,MEMBROS,ALDEIAS,PONTOS,PONTOS_TOTAIS,RANK
                        // Exemplo: 13,PLOT+TWIST,PLOT,38,2410,19722210,19722210,2
                        const tribeId = a[0];      // 13
                        const tribeTag = a[2];     // PLOT (TAG!)
                        alliesMap[tribeId] = tribeTag;
                    }
                });
            }

            // Função para obter TAG da tribo
            const getTribeTag = (tribeId) => {
                return alliesMap[tribeId] || "";
            };

            // Detectar minha tribo atual usando TAG
            let minhaTriboTag = "";
            let minhaTriboId = "";
            
            try {
                // Método 1: Via game_data (mais confiável)
                if (typeof game_data !== 'undefined' && game_data.player && game_data.player.ally) {
                    minhaTriboId = game_data.player.ally.toString();
                    minhaTriboTag = getTribeTag(minhaTriboId);
                    console.log('Método 1 - game_data.player.ally:', minhaTriboId, '→ TAG:', minhaTriboTag);
                }
                
                // Método 2: Via UI.player_data (fallback)
                if (!minhaTriboTag && typeof UI !== 'undefined' && UI.player_data && UI.player_data.ally) {
                    minhaTriboId = UI.player_data.ally.toString();
                    minhaTriboTag = getTribeTag(minhaTriboId);
                    console.log('Método 2 - UI.player_data.ally:', minhaTriboId, '→ TAG:', minhaTriboTag);
                }
                
                // Método 3: Buscar no HTML da página
                if (!minhaTriboTag) {
                    const allyLink = document.querySelector('a[href*="screen=ally"]');
                    if (allyLink && allyLink.textContent) {
                        // Pega a TAG diretamente do link da tribo
                        const tagMatch = allyLink.textContent.match(/\[([^\]]+)\]/);
                        if (tagMatch) {
                            minhaTriboTag = tagMatch[1];
                            console.log('Método 3 - HTML link:', minhaTriboTag);
                        }
                    }
                }
                
                console.log('=== DEBUG TRIBO ===');
                console.log('Minha Tribo ID:', minhaTriboId);
                console.log('Minha Tribo TAG:', minhaTriboTag);
                console.log('Filtro "Só Tribo" ativo:', soTribo);
                
            } catch (e) {
                console.log('Erro ao detectar tribo atual:', e);
            }
            
            // Se não detectou a tribo e o filtro está ativo, avisar o usuário
            if (soTribo && !minhaTriboTag) {
                alert('⚠️ Não foi possível detectar sua tribo!\n\nPor favor, use o filtro "Incluir Tribos" manualmente ou desmarque a opção "Apenas membros da minha tribo".');
                loadingText.textContent = "";
                resultsDiv.innerHTML = "<div class='scanRow'><b>⚠️ Tribo não detectada. Use filtros manuais.</b></div>";
                return;
            }

            const encontrados = [];
            const raioQuad = raio * raio;

            villagesRaw.trim().split("\n").forEach(l => {
                const v = l.split(",");
                if (v.length < 5) return;

                const vx = Number(v[2]);
                const vy = Number(v[3]);
                const owner = v[4];

                const isBarbaro = owner === "0";
                
                if (soBarbaros && !isBarbaro) return;
                if (!soBarbaros && !incluirBarbaros && isBarbaro) return;

                const dx = vx - cx;
                const dy = vy - cy;
                const distQuad = dx * dx + dy * dy;
                
                if (distQuad > raioQuad) return;

                // Aldeias bárbaras
                if (isBarbaro) {
                    const dist = Math.sqrt(distQuad).toFixed(1);
                    encontrados.push({
                        jogador: "🏹 Aldeia Bárbara",
                        pontos: 0,
                        coord: `${vx}|${vy}`,
                        dist: dist,
                        tribo: "",
                        aldeias: 1,
                        isBarbaro: true
                    });
                    return;
                }

                const pj = players[owner];
                if (!pj) return;

                if (pj.pontos < minP || pj.pontos > maxP) return;
                
                // Obter TAG da tribo do jogador
                const triboTag = getTribeTag(pj.aliado_id);
                
                // DEBUG: Log para verificar comparações
                if (soTribo) {
                    console.log('Comparando:', {
                        jogador: pj.nome,
                        triboId: pj.aliado_id,
                        triboTag: triboTag,
                        minhaTriboTag: minhaTriboTag,
                        match: triboTag === minhaTriboTag
                    });
                }
                
                // Filtro "apenas minha tribo"
                if (soTribo) {
                    // Se o jogador não tem tribo OU tem tribo diferente da minha
                    if (!triboTag || triboTag !== minhaTriboTag) {
                        return;
                    }
                }
                
                // ===== CORREÇÃO: COMPARAR TAGs CORRETAMENTE =====
                // Filtro de inclusão: deve incluir EXATAMENTE a TAG
                if (tribosInclude.length > 0) {
                    // Se não tem tribo OU a tag não está na lista de inclusão
                    if (!triboTag || !tribosInclude.includes(triboTag)) return;
                }
                
                // Filtro de exclusão: excluir se TAG estiver na lista
                if (tribosExclude.length > 0 && triboTag && tribosExclude.includes(triboTag)) {
                    return;
                }

                const dist = Math.sqrt(distQuad).toFixed(1);
                encontrados.push({
                    jogador: pj.nome,
                    pontos: pj.pontos,
                    coord: `${vx}|${vy}`,
                    dist: dist,
                    tribo: triboTag, // Agora mostra TAG completa
                    aldeias: pj.aldeias,
                    rank: pj.rank,
                    isBarbaro: false
                });
            });

            // Renderizar resultados
            loadingText.textContent = "";
            resultsCount.textContent = encontrados.length;

            if (encontrados.length === 0) {
                resultsDiv.innerHTML = "<div class='scanRow'><b>❌ Nenhum jogador encontrado com os filtros atuais.</b></div>";
                return;
            }

            encontrados.sort((a, b) => a.dist - b.dist);

            resultsDiv.innerHTML = "";
            encontrados.forEach(r => {
                const row = document.createElement("div");
                row.className = "scanRow";
                
                if (r.isBarbaro) {
                    row.innerHTML = `
                        <div>
                            <span class="player-name" style="color: #27ae60;">${r.jogador}</span>
                            <br>Aldeia: <span class="village-coord" onclick="copyToClipboard('${r.coord}')">${r.coord}</span>
                            <span class="village-distance">— ${r.dist} quadrantes</span>
                        </div>
                    `;
                } else {
                    row.innerHTML = `
                        <div>
                            <span class="player-name">${r.jogador}</span>
                            <span class="player-points">(${r.pontos.toLocaleString()} pts)</span>
                            ${r.tribo ? `<br><span class="player-tribe">[${r.tribo}]</span>` : '<br><span class="player-tribe" style="color: #95a5a6;">Sem tribo</span>'}
                            <br>Aldeia: <span class="village-coord" onclick="copyToClipboard('${r.coord}')">${r.coord}</span>
                            <span class="village-distance">— ${r.dist} quadrantes</span>
                            <br><span class="player-stats">Rank: ${r.rank} | Aldeias: ${r.aldeias}</span>
                        </div>
                    `;
                }
                resultsDiv.appendChild(row);
            });

        } catch (error) {
            loadingText.textContent = "";
            resultsDiv.innerHTML = `<div class='scanRow'><b>❌ Erro ao carregar dados: ${error.message}</b></div>`;
        }
    }

    // Função para copiar coordenadas
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            try {
                if (typeof UI !== 'undefined' && UI.SuccessMessage) {
                    UI.SuccessMessage(`Coordenada ${text} copiada!`);
                } else {
                    alert(`Coordenada ${text} copiada!`);
                }
            } catch (e) {
                alert(`Coordenada ${text} copiada!`);
            }
        }).catch(() => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            alert(`Coordenada ${text} copiada!`);
        });
    };

    document.getElementById("clearBtn").onclick = function() {
        document.getElementById("scannerResults").innerHTML = "";
        document.getElementById("resultsCount").textContent = "0";
        document.getElementById("loadingText").textContent = "";
    };

    document.getElementById("saveConfigBtn").onclick = function() {
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
        alert('✅ Configuração salva com sucesso!');
    };

    document.getElementById("loadConfigBtn").onclick = function() {
        const config = getStorageObject('savedConfig', null);
        if (config) {
            document.getElementById("scanCoord").value = config.coord;
            document.getElementById("scanRaio").value = config.raio;
            document.getElementById("scanMin").value = config.min;
            document.getElementById("scanMax").value = config.max;
            document.getElementById("scanBarbaros").checked = config.barbaros;
            document.getElementById("scanSoBarbaros").checked = config.soBarbaros;
            document.getElementById("scanSoTribo").checked = config.soTribo;
            document.getElementById("tribosInclude").value = config.tribosInclude;
            document.getElementById("tribosExclude").value = config.tribosExclude;
            alert('✅ Configuração carregada com sucesso!');
        } else {
            alert('⚠️ Nenhuma configuração salva encontrada!');
        }
    };

    document.getElementById("resetConfigBtn").onclick = function() {
        if (confirm('⚠️ Tem certeza que deseja resetar todas as configurações?')) {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('tw_scanner_')) {
                    localStorage.removeItem(key);
                }
            });
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
            alert('✅ Configurações resetadas!');
        }
    };

    document.getElementById("scanBtn").onclick = buscarJogadores;

    document.getElementById("scanCoord").addEventListener("keypress", function(e) {
        if (e.key === "Enter") buscarJogadores();
    });

})();
