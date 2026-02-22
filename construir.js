// ==UserScript==
// @name         TW Auto Builder - Data-Driven (Corrigido v1.8)
// @version      1.8
// @description  Automatizador de construções - versão final com URL nativa do jogo e validação completa
// @author       You
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

class TW_AutoBuilder {
    constructor() {
        this.buildingsList = {
            'main': 'Edifício principal',
            'barracks': 'Quartel',
            'stable': 'Estábulo',
            'garage': 'Oficina',
            'church': 'Igreja',
            'watchtower': 'Torre de vigia',
            'snob': 'Academia',
            'smith': 'Ferreiro',
            'place': 'Praça de reunião',
            'statue': 'Estátua',
            'market': 'Mercado',
            'wood': 'Bosque',
            'stone': 'Poço de argila',
            'iron': 'Mina de ferro',
            'farm': 'Fazenda',
            'storage': 'Armazém',
            'hide': 'Esconderijo',
            'wall': 'Muralha'
        };

        this.settings = {
            maxConcurrentFetches: 2,
            multivillageInterval: 15000,
            maxRetries: 3,
            baseRetryDelay: 2000,
            jitterRange: 0.3,
            maxQueueSlots: 2,
            villageDelay: 1000,
            autoStart: false,
            priorityBuildings: Object.keys(this.buildingsList),
            maxLevels: this.getDefaultMaxLevels(),
            enabledBuildings: {}
        };

        this.state = {
            isRunning: false,
            currentVillageId: this.getCurrentVillageId(),
            selectedVillages: [],
            myVillages: [],
            villagesLoaded: false,
            panelHidden: false,
            villagesCollapsed: false
        };

        this.stats = {
            totalConstructions: 0,
            totalErrors: 0,
            totalSuccess: 0
        };

        this._loopRunning = false;
        this._countdownInterval = null;

        this.init();
    }

    // ========== UTILITÁRIOS ==========

    getCurrentVillageId() {
        return window.game_data?.village?.id ||
               parseInt(new URLSearchParams(window.location.search).get('village')) ||
               null;
    }


    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message, type = 'info') {
        const logsContainer = document.getElementById('twb-logs-content');
        if (logsContainer) {
            const time = new Date().toLocaleTimeString();
            const icons = {
                'info': '📌',
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'build': '🏗️',
                'debug': '🔍'
            };
            const icon = icons[type] || '📌';

            const entry = document.createElement('div');
            entry.className = `twb-log twb-log--${type}`;
            entry.innerHTML = `<span class="twb-log__time">[${time}]</span> ${icon} ${message}`;

            logsContainer.insertBefore(entry, logsContainer.firstChild);

            while (logsContainer.children.length > 100) {
                logsContainer.removeChild(logsContainer.lastChild);
            }
        }
        console.log(`[TW AutoBuilder] ${message}`);
    }

    // ========== NÍVEIS MÁXIMOS PADRÃO ==========

    getDefaultMaxLevels() {
        const levels = {};
        Object.keys({
            'main':'','barracks':'','stable':'','garage':'','church':'',
            'watchtower':'','snob':'','smith':'','place':'','statue':'',
            'market':'','wood':'','stone':'','iron':'','farm':'',
            'storage':'','hide':'','wall':''
        }).forEach(k => {
            if (['main','farm','storage','wood','stone','iron'].includes(k)) levels[k] = 30;
            else if (['barracks','market'].includes(k)) levels[k] = 25;
            else if (['stable','smith','wall','watchtower'].includes(k)) levels[k] = 20;
            else if (k === 'garage') levels[k] = 15;
            else if (k === 'hide') levels[k] = 10;
            else if (k === 'church') levels[k] = 3;
            else levels[k] = 1;
        });
        return levels;
    }

    // ========== CARREGAR CONFIGURAÇÕES ==========

    async loadSettings() {
        Object.keys(this.buildingsList).forEach(id => {
            const saved = localStorage.getItem(`twb_build_${id}`);
            this.settings.enabledBuildings[id] = saved === null ? true : saved !== 'false';
        });

        const savedMax = localStorage.getItem('twb_build_maxLevels');
        if (savedMax) {
            try { Object.assign(this.settings.maxLevels, JSON.parse(savedMax)); } catch (e) {}
        }

        const savedOrder = localStorage.getItem('twb_build_order');
        if (savedOrder) {
            try { this.settings.priorityBuildings = JSON.parse(savedOrder); } catch (e) {}
        }

        this.state.selectedVillages = JSON.parse(localStorage.getItem('twb_selected_villages') || '[]');
        this.state.panelHidden = localStorage.getItem('twb_panel_state') === 'hidden';
        this.state.villagesCollapsed = localStorage.getItem('twb_villages_collapsed') === 'true';

        const savedConcurrent = localStorage.getItem('twb_max_concurrent');
        if (savedConcurrent) this.settings.maxConcurrentFetches = parseInt(savedConcurrent);

        const savedInterval = localStorage.getItem('twb_multivillage_interval');
        if (savedInterval) this.settings.multivillageInterval = parseInt(savedInterval);

        const savedQueueSlots = localStorage.getItem('twb_max_queue_slots');
        if (savedQueueSlots) this.settings.maxQueueSlots = parseInt(savedQueueSlots);

        const savedVillageDelay = localStorage.getItem('twb_village_delay');
        if (savedVillageDelay) this.settings.villageDelay = parseInt(savedVillageDelay);

        const savedAutoStart = localStorage.getItem('twb_auto_start');
        if (savedAutoStart) this.settings.autoStart = savedAutoStart === 'true';

        const savedStats = localStorage.getItem('twb_stats');
        if (savedStats) {
            try { Object.assign(this.stats, JSON.parse(savedStats)); } catch (e) {}
        }
    }

    saveSettings() {
        Object.keys(this.buildingsList).forEach(id => {
            const checkbox = document.querySelector(`input[data-building-id="${id}"]`);
            if (checkbox) {
                this.settings.enabledBuildings[id] = checkbox.checked;
                localStorage.setItem(`twb_build_${id}`, checkbox.checked);
            }
        });

        localStorage.setItem('twb_build_maxLevels', JSON.stringify(this.settings.maxLevels));
        localStorage.setItem('twb_build_order', JSON.stringify(this.settings.priorityBuildings));
        localStorage.setItem('twb_selected_villages', JSON.stringify(this.state.selectedVillages));

        const intervalInput = document.querySelector('[data-setting="interval"]');
        const concInput = document.querySelector('[data-setting="concurrency"]');
        const queueSlotsInput = document.querySelector('[data-setting="queue-slots"]');
        const autoStartCheck = document.querySelector('[data-setting="auto-start"]');
        const villageDelayInput = document.querySelector('[data-setting="village-delay"]');

        if (intervalInput) {
            this.settings.multivillageInterval = parseInt(intervalInput.value) * 1000;
            localStorage.setItem('twb_multivillage_interval', this.settings.multivillageInterval);
        }
        if (concInput) {
            this.settings.maxConcurrentFetches = parseInt(concInput.value);
            localStorage.setItem('twb_max_concurrent', this.settings.maxConcurrentFetches);
        }
        if (queueSlotsInput) {
            this.settings.maxQueueSlots = parseInt(queueSlotsInput.value);
            localStorage.setItem('twb_max_queue_slots', this.settings.maxQueueSlots);
        }
        if (autoStartCheck) {
            this.settings.autoStart = autoStartCheck.checked;
            localStorage.setItem('twb_auto_start', this.settings.autoStart);
        }
        if (villageDelayInput) {
            this.settings.villageDelay = parseInt(villageDelayInput.value) * 1000;
            localStorage.setItem('twb_village_delay', this.settings.villageDelay);
        }

        this.showSaveFeedback();
        this.log('Configurações salvas', 'success');
    }

    persistStats() {
        localStorage.setItem('twb_stats', JSON.stringify(this.stats));
        this.updateUI();
    }

    // ========== CARREGAR ALDEIAS ==========

    async loadMyVillages() {
        try {
            const playerId = window.game_data?.player?.id;
            if (!playerId) {
                this.log('Game_data não disponível', 'warning');
                this.state.myVillages = [];
                this.state.villagesLoaded = true;
                return;
            }

            const response = await fetch('/map/village.txt');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            const playerIdNum = parseInt(playerId);

            this.state.myVillages = text.trim().split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [id, name, x, y, player, points] = line.split(',');
                    return {
                        id: parseInt(id),
                        name: decodeURIComponent(name.replace(/\+/g, ' ')),
                        x: parseInt(x),
                        y: parseInt(y),
                        player: parseInt(player),
                        points: parseInt(points)
                    };
                })
                .filter(v => v.player === playerIdNum)
                .sort((a, b) => a.name.localeCompare(b.name));

            this.state.villagesLoaded = true;
            this.log(`${this.state.myVillages.length} aldeias carregadas`, 'success');
            this.renderVillages();

            if (this.settings.autoStart && localStorage.getItem('twb_running_state') === 'true') {
                if (this.state.selectedVillages.length > 0) {
                    this.log('▶️ Auto-start ativado', 'success');
                    this.start();
                } else {
                    this.log('Auto-start: nenhuma aldeia selecionada, abortado', 'warning');
                }
            }

        } catch (error) {
            console.error('Erro ao carregar aldeias:', error);
            this.log('Erro ao carregar aldeias', 'error');
            this.state.myVillages = [];
            this.state.villagesLoaded = true;
        }
    }

    // ========== COLETA DE DADOS ==========

    async fetchVillageData(villageId) {
        try {
            const url = `/game.php?village=${villageId}&screen=main`;
            const html = await this.fetchWithRetry(url, { timeout: 10000 });
            const parsed = this.extractBuildingsFromHTML(html);
            if (parsed) {
                return { buildings: parsed.buildings, rawHtml: html };
            }
            return null;
        } catch (error) {
            this.log(`Erro ao buscar dados da aldeia ${villageId}`, 'error');
            return null;
        }
    }

    // ========== PARSER ROBUSTO ==========

    extractObjectFromSource(source, varName) {
        const searchStr = `${varName} = `;
        const startIdx = source.indexOf(searchStr);
        if (startIdx === -1) return null;

        const objectStart = source.indexOf('{', startIdx + searchStr.length);
        if (objectStart === -1) return null;

        let depth = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;
        let inTemplateLiteral = false;

        for (let i = objectStart; i < source.length; i++) {
            const char = source[i];

            if (escaped) { escaped = false; continue; }
            if (char === '\\' && (inString || inTemplateLiteral)) { escaped = true; continue; }
            if (!inString && char === '`') { inTemplateLiteral = !inTemplateLiteral; continue; }
            if (inTemplateLiteral) continue;
            if (!inString && (char === '"' || char === "'")) { inString = true; stringChar = char; continue; }
            if (inString && char === stringChar) { inString = false; continue; }

            if (!inString) {
                if (char === '{') depth++;
                else if (char === '}') {
                    depth--;
                    if (depth === 0) return source.substring(objectStart, i + 1);
                }
            }
        }
        return null;
    }

    extractBuildingsFromHTML(html) {
        try {
            const rawObject = this.extractObjectFromSource(html, 'BuildingMain.buildings');

            if (!rawObject) {
                this.log('BuildingMain.buildings não encontrado no HTML', 'warning');
                return this.extractBuildingsFallback(html);
            }

            try {
                return this.processBuildingsData(JSON.parse(rawObject));
            } catch (_) {
                this.log('Parse direto falhou, aplicando limpeza...', 'debug');
            }

            let jsonString = rawObject;
            jsonString = jsonString.replace(/\/\/.*$/gm, '');
            jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
            jsonString = jsonString.replace(/:\s*function\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g, ': null');
            jsonString = jsonString.replace(/:\s*\([^)]*\)\s*=>\s*\{[^{}]*\}/g, ': null');
            jsonString = jsonString.replace(/:\s*\([^)]*\)\s*=>[^,}\]]+/g, ': null');
            jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
            jsonString = jsonString.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (m, inner) => `"${inner.replace(/"/g, '\\"')}"`);
            jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
            jsonString = jsonString
                .replace(/:\s*undefined\b/g, ': null')
                .replace(/:\s*NaN\b/g, ': null')
                .replace(/:\s*Infinity\b/g, ': null')
                .replace(/:\s*-Infinity\b/g, ': null');

            try {
                return this.processBuildingsData(JSON.parse(jsonString));
            } catch (parseError) {
                const pos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
                const ctx = jsonString.substring(Math.max(0, pos - 60), Math.min(jsonString.length, pos + 60));
                this.log(`Erro no JSON pos ${pos}: ...${ctx}...`, 'error');
                return this.extractBuildingsFallback(html);
            }

        } catch (error) {
            this.log(`Erro crítico no parser: ${error.message}`, 'error');
            return this.extractBuildingsFallback(html);
        }
    }

    processBuildingsData(buildingsData) {
        const buildings = {};
        Object.keys(this.buildingsList).forEach(id => {
            const b = buildingsData[id];
            if (b) {
                let errorMessage = b.error || null;

                if (b.forecast?.available === 'future') {
                    const when = new Date(b.forecast.when * 1000).toLocaleString();
                    errorMessage = `Recursos disponíveis ${when}`;
                }

                buildings[id] = {
                    id,
                    name: this.buildingsList[id],
                    level: this.safeParseInt(b.level, 0),
                    maxLevel: this.safeParseInt(b.max_level, 30),
                    canBuild: b.can_build === true,
                    error: errorMessage,
                    forecast: b.forecast || null,
                    order: b.order != null ? b.order : null,
                    cheap: b.cheap === true,
                    cheapPossible: b.cheap_possible === true,
                    buildTime: this.safeParseInt(b.build_time, 0),
                    enabled: this.settings.enabledBuildings[id] !== false
                };
            }
        });
        return { buildings };
    }

    safeParseInt(value, defaultValue) {
        if (value === null || value === undefined) return defaultValue;
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    extractBuildingsFallback(html) {
        this.log('Usando fallback: extraindo dados do HTML', 'warning');
        const buildings = {};
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('tr[id^="main_buildrow_"]').forEach(row => {
            try {
                const buildingId = row.id.replace('main_buildrow_', '');
                if (!this.buildingsList[buildingId]) return;

                const levelSpan = row.querySelector('span[style="font-size: 0.9em"]');
                const levelText = levelSpan?.textContent || '';
                let currentLevel = 0;
                if (!levelText.includes('não construído')) {
                    const match = levelText.match(/Nível (\d+)/);
                    currentLevel = match ? parseInt(match[1]) : 0;
                }

                const buildButton = row.querySelector('.btn-build:not([style*="display: none"])');
                const cheapButton = row.querySelector('.btn-bcr:not([style*="display: none"])');
                const errorSpan = row.querySelector('.inactive.center');
                const errorMessage = errorSpan?.textContent?.trim() || '';

                buildings[buildingId] = {
                    id: buildingId,
                    name: this.buildingsList[buildingId],
                    level: currentLevel,
                    maxLevel: this.settings.maxLevels[buildingId] || 30,
                    canBuild: !!buildButton || !!cheapButton,
                    error: errorMessage,
                    forecast: null,
                    order: null,
                    cheap: !!cheapButton,
                    cheapPossible: !!cheapButton,
                    buildTime: 0,
                    enabled: this.settings.enabledBuildings[buildingId] !== false
                };
            } catch (e) {
                console.error('Erro no fallback:', e);
            }
        });

        return { buildings };
    }

    // ========== CONTAGEM DA FILA ==========

    getQueueCount(buildings, htmlContent = null) {
        if (!buildings) return 0;

        const queueFromData = Object.values(buildings).filter(b => b.order != null).length;

        if (htmlContent) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');
                const queueItems = doc.querySelectorAll('#building_queue .queue-item');
                const inProgress = doc.querySelector('#building_queue .in_progress');

                if (queueItems.length > 0 || inProgress) {
                    return Math.max(queueFromData, queueItems.length || 1);
                }
            } catch (e) {
                console.error('Erro ao verificar fila no HTML:', e);
            }
        }

        if (window.location.search.includes('screen=main')) {
            const queueItems = document.querySelectorAll('#building_queue .queue-item');
            if (queueItems.length > 0) {
                return Math.max(queueFromData, queueItems.length);
            }
        }

        return queueFromData;
    }

    async confirmBuildStarted(villageId, buildingId) {
        await this.sleep(2000);
        const freshData = await this.fetchVillageData(villageId);
        if (!freshData?.buildings) return false;
        const building = freshData.buildings[buildingId];
        return building?.order != null;
    }

    // ========== VALIDAÇÃO COMPLETA DE IMPEDIMENTOS ==========

    canBuildNow(building) {
        if (!building || !building.enabled) return { can: false, reason: 'disabled' };
        if (building.level >= (this.settings.maxLevels[building.id] || 0)) return { can: false, reason: 'max_level' };
        if (!building.canBuild) return { can: false, reason: 'cannot_build' };

        if (building.forecast?.available === 'future') {
            return { can: false, reason: 'future_resources', details: building.error || building.forecast };
        }

        if (building.error) {
            const errorLower = building.error.toLowerCase();

            if (errorLower.includes('fila está cheia') || errorLower.includes('fila cheia')) {
                return { can: false, reason: 'queue_full' };
            }

            if (errorLower.includes('recursos insuficientes') ||
                errorLower.includes('recursos disponíveis') ||
                errorLower.includes('não tem recursos')) {
                return { can: false, reason: 'insufficient_resources' };
            }

            if (errorLower.includes('fazenda é pequena demais')) {
                return { can: false, reason: 'farm_too_small' };
            }

            if (errorLower.includes('armazém é muito pequeno')) {
                return { can: false, reason: 'storage_too_small' };
            }

            if (errorLower && !errorLower.includes('sucesso')) {
                return { can: false, reason: 'other_error', details: building.error };
            }
        }

        return { can: true };
    }

    // ========== EXECUÇÃO DE CONSTRUÇÃO ==========

    async executeBuild(building, village, rawHtml = null) {
        try {
            const buildingId = building.id;
            const villageId = village.id;

            // Extrai a URL de upgrade diretamente do HTML do jogo
            // Já contém ajaxaction= correto + CSRF embutido — sem necessidade de montar na mão
            const baseLink = rawHtml?.match(/upgrade_building_link\s*=\s*'([^']+)'/)?.[1];
            if (!baseLink) {
                this.log(`❌ ${building.name}: Link de upgrade não encontrado no HTML`, 'error');
                return { success: false, message: 'Link de upgrade não encontrado' };
            }

            const currentQueue = this.getQueueCount(building.buildings, rawHtml);
            if (currentQueue >= this.settings.maxQueueSlots) {
                this.log(`⏳ ${village.name}: Fila já está cheia (${currentQueue}/${this.settings.maxQueueSlots})`, 'info');
                return { success: false, message: 'queue_full', queueCount: currentQueue };
            }

            const validation = this.canBuildNow(building);
            if (!validation.can) {
                this.log(`⏳ ${building.name} em ${village.name}: ${validation.reason}`, 'info');
                return { success: false, message: validation.reason };
            }

            const upgradeUrl = `${baseLink}&id=${buildingId}`;
            this.log(`🏗️ Construindo ${building.name} em ${village.name}`, 'build');

            const response = await fetch(upgradeUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/javascript, */*'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const responseText = await response.text();
            let json = null;
            try { json = JSON.parse(responseText); } catch (_) {}

            if (json?.response?.error) {
                this.stats.totalErrors++;
                this.persistStats();
                this.log(`❌ ${building.name}: ${json.response.error}`, 'error');
                return { success: false, message: json.response.error };
            }

            await this.sleep(2000);
            const confirmStarted = await this.confirmBuildStarted(villageId, buildingId);

            if (confirmStarted) {
                this.stats.totalSuccess++;
                this.stats.totalConstructions++;
                this.persistStats();

                const queueNow = await this.getQueueCount(building.buildings, rawHtml);
                this.log(`✅ ${building.name} em ${village.name}: entrou na fila (agora ${queueNow}/${this.settings.maxQueueSlots})`, 'success');
                return { success: true, message: 'Construção iniciada' };
            } else {
                this.log(`⚠️ ${building.name} em ${village.name}: resposta positiva mas fila não aumentou`, 'warning');
                return { success: false, message: 'queue_not_increased' };
            }

        } catch (error) {
            this.stats.totalErrors++;
            this.persistStats();
            this.log(`❌ ${building.name}: ${error.message}`, 'error');
            return { success: false, message: error.message };
        }
    }

    // ========== LÓGICA DE DECISÃO MELHORADA ==========

    findNextBuilding(buildings) {
        for (const id of this.settings.priorityBuildings) {
            const building = buildings[id];
            const validation = this.canBuildNow(building);

            if (validation.can) {
                this.log(`🔍 ${building.name}: disponível para construir`, 'debug');
                return building;
            } else if (validation.reason !== 'disabled' && validation.reason !== 'max_level') {
                this.log(`🔍 ${building.name}: ${validation.reason}`, 'debug');
            }
        }
        return null;
    }

    // ========== FETCH COM RETRY ==========

    async fetchWithRetry(url, options = {}, retries = this.settings.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

            try {
                const response = await fetch(url, {
                    credentials: 'include',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.text();
            } catch (error) {
                clearTimeout(timeoutId);
                if (attempt === retries) throw error;

                const baseDelay = this.settings.baseRetryDelay;
                const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
                const jitter = exponentialDelay * this.settings.jitterRange * (Math.random() * 2 - 1);
                const delay = Math.min(exponentialDelay + jitter, 30000);

                this.log(`Tentativa ${attempt}/${retries} falhou, retry em ${Math.round(delay / 1000)}s`, 'warning');
                await this.sleep(delay);
            }
        }
    }

    // ========== PROCESSAMENTO DE ALDEIAS ==========

    async processVillage(villageId) {
        try {
            const village = this.state.myVillages.find(v => v.id === villageId) || {
                id: villageId,
                name: `Aldeia ${villageId}`
            };

            this.log(`🔍 Verificando ${village.name}...`, 'debug');

            const villageData = await this.fetchVillageData(villageId);

            if (!villageData || !villageData.buildings) {
                this.log(`Aldeia ${villageId}: Não foi possível obter dados`, 'error');
                return { built: false, reason: 'no_data' };
            }

            const { buildings, rawHtml } = villageData;

            const queueCount = this.getQueueCount(buildings, rawHtml);
            const availableSlots = this.settings.maxQueueSlots - queueCount;

            if (availableSlots <= 0) {
                this.log(`${village.name}: Fila cheia (${queueCount}/${this.settings.maxQueueSlots})`, 'info');
                return { built: false, reason: 'queue_full', queueCount };
            }

            const nextBuilding = this.findNextBuilding(buildings);

            if (nextBuilding) {
                nextBuilding.buildings = buildings;
                const result = await this.executeBuild(nextBuilding, village, rawHtml);

                if (result.success) {
                    return { built: true, building: nextBuilding.name, result };
                } else if (['queue_full', 'queue_not_increased'].includes(result.message)) {
                    return { built: false, reason: 'queue_full' };
                } else {
                    return { built: false, reason: result.message };
                }
            } else {
                this.log(`${village.name}: Nada para construir no momento`, 'info');
                return { built: false, reason: 'nothing_to_build' };
            }
        } catch (error) {
            this.log(`Erro ao processar aldeia ${villageId}: ${error.message}`, 'error');
            return { built: false, reason: 'error', error: error.message };
        }
    }

    // ========== EXECUÇÃO CONCORRENTE ==========

    async processVillagesWithConcurrency(villageIds) {
        const results = [];
        const executing = new Set();

        for (const villageId of villageIds) {
            if (!this.state.isRunning) break;

            while (executing.size >= this.settings.maxConcurrentFetches) {
                await Promise.race([...executing]);
            }

            const promise = this.processVillage(villageId).then(result => {
                executing.delete(promise);
                return result;
            });

            executing.add(promise);
            results.push(promise);
            await this.sleep(this.settings.villageDelay);
        }

        return Promise.all(results);
    }

    // ========== LOOP PRINCIPAL ==========

    startCountdown(seconds) {
        if (this._countdownInterval) clearInterval(this._countdownInterval);

        const el = document.getElementById('twb-countdown');
        if (!el) return;

        let remaining = seconds;
        el.textContent = `⏱️ Próxima: ${remaining}s`;

        this._countdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(this._countdownInterval);
                this._countdownInterval = null;
                if (el) el.textContent = '🔄 Verificando...';
            } else {
                if (el) el.textContent = `⏱️ Próxima: ${remaining}s`;
            }
        }, 1000);
    }

    stopCountdown() {
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
        const el = document.getElementById('twb-countdown');
        if (el) el.textContent = '';
    }

    async loopWorker() {
        if (this._loopRunning) return;
        this._loopRunning = true;

        try {
            this.log('🚀 Loop principal iniciado', 'success');

            while (this.state.isRunning) {
                const startTime = Date.now();

                if (this.state.selectedVillages.length === 0) {
                    this.log('Nenhuma aldeia selecionada', 'warning');
                    await this.sleep(10000);
                    continue;
                }

                this.log(`🔄 Processando ${this.state.selectedVillages.length} aldeias...`, 'info');
                this.stopCountdown();

                const results = await this.processVillagesWithConcurrency(this.state.selectedVillages);

                const built = results.filter(r => r?.built).length;
                if (built > 0) {
                    this.log(`✅ ${built} construção(ões) iniciada(s)`, 'success');
                }

                const elapsed = Date.now() - startTime;
                const waitTime = Math.max(5000, this.settings.multivillageInterval - elapsed);
                const waitSeconds = Math.round(waitTime / 1000);
                this.log(`⏱️ Próxima verificação em ${waitSeconds}s`, 'info');

                this.startCountdown(waitSeconds);
                await this.sleep(waitTime);
            }
        } catch (error) {
            console.error('Erro no loop:', error);
            this.log(`❌ Erro no loop: ${error.message}`, 'error');
        } finally {
            this._loopRunning = false;
            this.stopCountdown();
        }
    }

    // ========== CONTROLES ==========

    start() {
        if (this.state.isRunning || this._loopRunning) {
            this.log('Sistema já está em execução', 'warning');
            return;
        }
        if (this.state.selectedVillages.length === 0) {
            this.log('Selecione pelo menos uma aldeia', 'warning');
            return;
        }
        this.state.isRunning = true;
        this.updateUI();
        localStorage.setItem('twb_running_state', 'true');
        this.log('▶️ Sistema iniciado', 'success');
        this.loopWorker();
    }

    stop() {
        if (!this.state.isRunning) return;
        this.state.isRunning = false;
        this.stopCountdown();
        this.updateUI();
        localStorage.setItem('twb_running_state', 'false');
        this.log('⏸️ Sistema parado', 'warning');
    }

    toggle() {
        this.state.isRunning ? this.stop() : this.start();
    }

    // ========== INTERFACE (mantida igual) ==========

    createPanel() {
        this.injectStyles();

        const panel = document.createElement('div');
        panel.id = 'twb-builder';
        panel.className = `twb-panel ${this.state.panelHidden ? 'twb-panel--hidden' : ''}`;
        panel.innerHTML = this.getPanelHTML();
        document.body.appendChild(panel);

        this.attachEvents();
        this.renderVillages();
        this.renderBuildings();
        this.updateUI();
    }

    getPanelHTML() {
        return `
            <div id="twb-toggle-btn">☰</div>
            <div class="twb-panel__content-wrapper">
                <div class="twb-panel__header">
                    <div class="twb-panel__title">
                        <span class="twb-panel__icon">🏗️</span>
                        <span>Auto Builder v1.8</span>
                    </div>
                </div>

                <div class="twb-panel__content">
                    <div class="twb-section">
                        <div class="twb-section-title">⚙️ Status</div>
                        <div class="twb-status-line">
                            <span>
                                <span class="twb-status-indicator ${this.state.isRunning ? 'ativo' : 'inativo'}"></span>
                                <span id="twb-status-text">${this.state.isRunning ? 'Executando' : 'Parado'}</span>
                            </span>
                            <span>Total: <span id="twb-stat-total">${this.stats.totalConstructions}</span> | ✅<span id="twb-stat-ok">${this.stats.totalSuccess}</span> ❌<span id="twb-stat-err">${this.stats.totalErrors}</span></span>
                        </div>
                        <div id="twb-countdown" class="twb-countdown"></div>
                        <div style="display:flex;gap:5px;">
                            <button class="twb-btn ${this.state.isRunning ? 'inativo' : 'ativo'}" id="twb-toggle-btn-main" style="flex:1">
                                ${this.state.isRunning ? '⏸️ Parar' : '▶️ Iniciar'}
                            </button>
                            <button class="twb-btn" data-action="reset-stats" title="Resetar estatísticas">🔄</button>
                        </div>
                    </div>

                    <div class="twb-section">
                        <div class="twb-section-title">🏘️ Aldeias</div>
                        <div class="twb-controls">
                            <button class="twb-btn" data-action="mark-all">✓ Todas</button>
                            <button class="twb-btn" data-action="unmark-all">✗ Nenhuma</button>
                            <button class="twb-btn" data-action="toggle-villages">
                                ${this.state.villagesCollapsed ? '▼ Mostrar' : '▲ Ocultar'}
                            </button>
                        </div>
                        <div class="twb-villages ${this.state.villagesCollapsed ? 'twb-villages--collapsed' : ''}">
                            <div class="twb-villages__list" id="twb-villages-list">
                                <div class="twb-empty">Carregando...</div>
                            </div>
                        </div>
                    </div>

                    <div class="twb-section">
                        <div class="twb-section-title">🏛️ Edifícios</div>
                        <div class="twb-controls">
                            <button class="twb-btn" data-action="mark-all-buildings">✓ Todos</button>
                            <button class="twb-btn" data-action="unmark-all-buildings">✗ Nenhum</button>
                        </div>
                        <div class="twb-buildings">
                            <div class="twb-buildings__grid" id="twb-buildings-grid"></div>
                        </div>
                    </div>

                    <div class="twb-section">
                        <div class="twb-section-title">⚙️ Configurações</div>
                        <div class="twb-settings-grid">
                            <div class="twb-setting">
                                <label>Intervalo (s)</label>
                                <input type="number" class="twb-input" data-setting="interval"
                                       value="${Math.floor(this.settings.multivillageInterval / 1000)}" min="5" max="300">
                            </div>
                            <div class="twb-setting">
                                <label>Concorrência</label>
                                <input type="number" class="twb-input" data-setting="concurrency"
                                       value="${this.settings.maxConcurrentFetches}" min="1" max="5">
                            </div>
                            <div class="twb-setting">
                                <label>Slots na fila</label>
                                <input type="number" class="twb-input" data-setting="queue-slots"
                                       value="${this.settings.maxQueueSlots}" min="1" max="10">
                            </div>
                            <div class="twb-setting">
                                <label>Delay aldeias (s)</label>
                                <input type="number" class="twb-input" data-setting="village-delay"
                                       value="${Math.floor(this.settings.villageDelay / 1000)}" min="0" max="30">
                            </div>
                            <div class="twb-setting-checkbox">
                                <label>
                                    <input type="checkbox" data-setting="auto-start" ${this.settings.autoStart ? 'checked' : ''}>
                                    Auto-start
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="twb-section">
                        <div class="twb-section-title">
                            <span>📜 Logs</span>
                            <button class="twb-btn twb-btn-small" data-action="clear-logs">Limpar</button>
                        </div>
                        <div class="twb-logs">
                            <div class="twb-logs__content" id="twb-logs-content"></div>
                        </div>
                    </div>
                </div>

                <div class="twb-panel__footer">
                    <button class="twb-btn twb-btn-primary" data-action="save">💾 Salvar</button>
                </div>
            </div>
        `;
    }

    renderVillages() {
        const container = document.getElementById('twb-villages-list');
        if (!container) return;

        if (!this.state.villagesLoaded) {
            container.innerHTML = '<div class="twb-empty">Carregando aldeias...</div>';
            return;
        }

        if (this.state.myVillages.length === 0) {
            container.innerHTML = '<div class="twb-empty">Nenhuma aldeia encontrada</div>';
            return;
        }

        container.innerHTML = this.state.myVillages.map(village => `
            <label class="twb-village">
                <input type="checkbox"
                       data-village-id="${village.id}"
                       ${this.state.selectedVillages.includes(village.id) ? 'checked' : ''}>
                <span class="twb-village__name">${village.x}|${village.y} ${village.name}</span>
                <span class="twb-village__points">${village.points.toLocaleString()}</span>
            </label>
        `).join('');

        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const villageId = parseInt(e.target.dataset.villageId);
                this.toggleVillage(villageId);
            });
        });
    }

    renderBuildings() {
        const container = document.getElementById('twb-buildings-grid');
        if (!container) return;

        container.innerHTML = this.settings.priorityBuildings.map((id) => {
            const name = this.buildingsList[id];
            const maxLevel = this.settings.maxLevels[id] || 0;
            const enabled = this.settings.enabledBuildings[id] !== false;

            return `
                <div class="twb-building" data-building-id="${id}" draggable="true">
                    <div class="twb-building__drag-handle">⋮⋮</div>
                    <label class="twb-building__label">
                        <input type="checkbox"
                               data-building-id="${id}"
                               ${enabled ? 'checked' : ''}>
                        <span>${name}</span>
                    </label>
                    <input type="number"
                           class="twb-building__input"
                           data-building-max="${id}"
                           value="${maxLevel}"
                           min="0"
                           max="30"
                           title="Nível máximo">
                </div>
            `;
        }).join('');

        this.setupDragAndDrop();
        this.attachBuildingEvents();
    }

    setupDragAndDrop() {
        const container = document.getElementById('twb-buildings-grid');
        if (!container) return;

        let draggedItem = null;

        container.querySelectorAll('.twb-building').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('twb-building--dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.buildingId);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('twb-building--dragging');
                container.querySelectorAll('.twb-building').forEach(el => {
                    el.classList.remove('twb-building--drag-over');
                });
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (draggedItem !== item) {
                    container.querySelectorAll('.twb-building').forEach(el => {
                        el.classList.remove('twb-building--drag-over');
                    });
                    item.classList.add('twb-building--drag-over');
                }
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('twb-building--drag-over');
                if (draggedItem && draggedItem !== item) {
                    const allItems = [...container.querySelectorAll('.twb-building')];
                    const draggedIndex = allItems.indexOf(draggedItem);
                    const targetIndex = allItems.indexOf(item);
                    if (draggedIndex !== -1 && targetIndex !== -1) {
                        const [moved] = this.settings.priorityBuildings.splice(draggedIndex, 1);
                        this.settings.priorityBuildings.splice(targetIndex, 0, moved);
                        localStorage.setItem('twb_build_order', JSON.stringify(this.settings.priorityBuildings));
                        this.renderBuildings();
                        this.log('Ordem de construção atualizada e salva', 'info');
                    }
                }
            });
        });

        container.addEventListener('dragover', (e) => e.preventDefault());
    }

    attachBuildingEvents() {
        document.querySelectorAll('input[data-building-id]').forEach(input => {
            if (input.type === 'checkbox') {
                input.addEventListener('change', (e) => {
                    const buildingId = e.target.dataset.buildingId;
                    this.settings.enabledBuildings[buildingId] = e.target.checked;
                });
            }
        });

        document.querySelectorAll('input[data-building-max]').forEach(input => {
            input.addEventListener('change', (e) => {
                const buildingId = e.target.dataset.buildingMax;
                const level = parseInt(e.target.value) || 0;
                this.settings.maxLevels[buildingId] = Math.min(30, Math.max(0, level));
            });
        });
    }

    toggleVillage(villageId) {
        const index = this.state.selectedVillages.indexOf(villageId);
        if (index === -1) {
            this.state.selectedVillages.push(villageId);
        } else {
            this.state.selectedVillages.splice(index, 1);
        }
        this.log(`Aldeias selecionadas: ${this.state.selectedVillages.length}`, 'info');
    }

    markAllVillages(select) {
        this.state.selectedVillages = select ? this.state.myVillages.map(v => v.id) : [];
        this.renderVillages();
        this.log(select ? 'Todas aldeias marcadas' : 'Todas aldeias desmarcadas', 'info');
    }

    markAllBuildings(select) {
        Object.keys(this.buildingsList).forEach(id => {
            this.settings.enabledBuildings[id] = select;
            const checkbox = document.querySelector(`input[data-building-id="${id}"]`);
            if (checkbox) checkbox.checked = select;
        });
        this.log(select ? 'Todos edifícios marcados' : 'Todos edifícios desmarcados', 'info');
    }

    togglePanel() {
        this.state.panelHidden = !this.state.panelHidden;
        const panel = document.getElementById('twb-builder');
        if (panel) panel.classList.toggle('twb-panel--hidden');
        localStorage.setItem('twb_panel_state', this.state.panelHidden ? 'hidden' : 'visible');
    }

    toggleVillages() {
        this.state.villagesCollapsed = !this.state.villagesCollapsed;
        const villagesDiv = document.querySelector('.twb-villages');
        const toggleBtn = document.querySelector('[data-action="toggle-villages"]');
        if (villagesDiv) villagesDiv.classList.toggle('twb-villages--collapsed');
        if (toggleBtn) toggleBtn.textContent = this.state.villagesCollapsed ? '▼ Mostrar' : '▲ Ocultar';
        localStorage.setItem('twb_villages_collapsed', this.state.villagesCollapsed);
    }

    resetStats() {
        this.stats.totalConstructions = 0;
        this.stats.totalSuccess = 0;
        this.stats.totalErrors = 0;
        this.persistStats();
        this.log('Estatísticas resetadas', 'info');
    }

    attachEvents() {
        const actions = {
            'mark-all': () => this.markAllVillages(true),
            'unmark-all': () => this.markAllVillages(false),
            'mark-all-buildings': () => this.markAllBuildings(true),
            'unmark-all-buildings': () => this.markAllBuildings(false),
            'toggle-villages': () => this.toggleVillages(),
            'save': () => this.saveSettings(),
            'clear-logs': () => this.clearLogs(),
            'reset-stats': () => this.resetStats()
        };

        document.querySelectorAll('[data-action]').forEach(btn => {
            const action = btn.dataset.action;
            if (actions[action]) btn.addEventListener('click', actions[action]);
        });

        const mainToggle = document.getElementById('twb-toggle-btn-main');
        if (mainToggle) mainToggle.addEventListener('click', () => this.toggle());

        const toggleBtn = document.getElementById('twb-toggle-btn');
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.togglePanel());
    }

    updateUI() {
        const statusText = document.getElementById('twb-status-text');
        const statusIndicator = document.querySelector('.twb-status-indicator');
        const toggleBtn = document.getElementById('twb-toggle-btn-main');
        const statTotal = document.getElementById('twb-stat-total');
        const statOk = document.getElementById('twb-stat-ok');
        const statErr = document.getElementById('twb-stat-err');

        if (statusText) statusText.textContent = this.state.isRunning ? 'Executando' : 'Parado';
        if (statusIndicator) statusIndicator.className = `twb-status-indicator ${this.state.isRunning ? 'ativo' : 'inativo'}`;
        if (toggleBtn) {
            toggleBtn.innerHTML = this.state.isRunning ? '⏸️ Parar' : '▶️ Iniciar';
            toggleBtn.className = `twb-btn ${this.state.isRunning ? 'inativo' : 'ativo'}`;
        }
        if (statTotal) statTotal.textContent = this.stats.totalConstructions;
        if (statOk) statOk.textContent = this.stats.totalSuccess;
        if (statErr) statErr.textContent = this.stats.totalErrors;
    }

    showSaveFeedback() {
        const btn = document.querySelector('[data-action="save"]');
        if (!btn) return;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Salvo!';
        btn.classList.add('twb-btn-saved');
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('twb-btn-saved');
        }, 2000);
    }

    clearLogs() {
        const logs = document.getElementById('twb-logs-content');
        if (logs) logs.innerHTML = '';
    }

    // ========== ESTILOS ==========

    injectStyles() {
        if (document.getElementById('twb-styles')) return;

        const styles = `
            #twb-builder {
                position: fixed;
                top: 60px;
                left: 0;
                width: 450px;
                background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
                border: 2px solid #8b7355;
                border-left: none;
                border-radius: 0 10px 10px 0;
                box-shadow: 4px 4px 15px rgba(0,0,0,0.5);
                font-family: 'Segoe UI', Arial, sans-serif;
                color: #e0d6c0;
                z-index: 99999;
                transition: transform 0.3s ease;
            }
            #twb-builder.twb-panel--hidden { transform: translateX(-450px); }
            #twb-toggle-btn {
                position: absolute;
                top: 15px;
                right: -30px;
                width: 30px;
                height: 45px;
                background: linear-gradient(135deg, #8b7355 0%, #5d4a33 100%);
                border: 2px solid #8b7355;
                border-left: none;
                border-radius: 0 8px 8px 0;
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                box-shadow: 3px 3px 8px rgba(0,0,0,0.4);
            }
            #twb-toggle-btn:hover { background: linear-gradient(135deg, #9f8a6b 0%, #6b553d 100%); }
            .twb-panel__content-wrapper { width: 100%; }
            .twb-panel__header {
                padding: 15px 20px;
                background: linear-gradient(135deg, #8b7355 0%, #b99e7c 50%, #8b7355 100%);
                border-bottom: 2px solid #5d4a33;
                border-radius: 0 8px 0 0;
            }
            .twb-panel__title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: bold;
                color: #fff;
                text-shadow: 1px 1px 2px #000;
            }
            .twb-panel__icon { font-size: 20px; }
            .twb-panel__content { padding: 15px; max-height: 70vh; overflow-y: auto; }
            .twb-section {
                background: rgba(0,0,0,0.3);
                border: 1px solid #8b7355;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 15px;
            }
            .twb-section-title {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #e6d5b8;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .twb-status-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 8px 0;
                font-size: 13px;
            }
            .twb-status-indicator {
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-right: 8px;
                animation: pulse 2s infinite;
            }
            .twb-status-indicator.ativo { background: #4caf50; box-shadow: 0 0 8px #4caf50; }
            .twb-status-indicator.inativo { background: #f44336; box-shadow: 0 0 8px #f44336; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
            .twb-countdown {
                font-size: 12px;
                color: #ffb74d;
                min-height: 18px;
                margin: 4px 0 8px 0;
                font-family: 'Courier New', monospace;
            }
            .twb-btn {
                display: inline-block;
                padding: 6px 12px;
                margin: 2px;
                background: linear-gradient(135deg, #5d4a33 0%, #3f3221 100%);
                border: 1px solid #8b7355;
                border-radius: 5px;
                color: #e6d5b8;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s;
            }
            .twb-btn:hover {
                background: linear-gradient(135deg, #6e5a40 0%, #4f3f2b 100%);
                transform: translateY(-1px);
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
            .twb-btn.ativo { background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); border-color: #81c784; }
            .twb-btn.inativo { background: linear-gradient(135deg, #c62828 0%, #8b0000 100%); border-color: #ef5350; }
            .twb-btn-primary { background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%); border-color: #64b5f6; }
            .twb-btn-small { padding: 3px 8px; font-size: 11px; }
            .twb-btn-saved { background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%) !important; }
            .twb-controls { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
            .twb-villages__list {
                max-height: 200px;
                overflow-y: auto;
                background: rgba(0,0,0,0.4);
                border-radius: 5px;
                padding: 5px;
            }
            .twb-villages--collapsed .twb-villages__list { display: none; }
            .twb-village {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                margin-bottom: 3px;
                background: rgba(255,255,255,0.05);
                border-radius: 4px;
                cursor: pointer;
            }
            .twb-village:hover { background: rgba(255,255,255,0.1); }
            .twb-village__name { flex: 1; font-size: 12px; }
            .twb-village__points {
                font-size: 10px;
                color: #aaa;
                background: rgba(0,0,0,0.3);
                padding: 2px 4px;
                border-radius: 3px;
            }
            .twb-buildings__grid {
                display: flex;
                flex-direction: column;
                gap: 5px;
                max-height: 300px;
                overflow-y: auto;
                padding: 5px;
                background: rgba(0,0,0,0.2);
                border-radius: 5px;
            }
            .twb-building {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: rgba(0,0,0,0.4);
                border: 1px solid #5d4a33;
                border-radius: 5px;
                cursor: move;
            }
            .twb-building--dragging { opacity: 0.5; transform: scale(0.98); }
            .twb-building--drag-over { border: 2px dashed #e6d5b8; background: rgba(230,213,184,0.1); }
            .twb-building__drag-handle { color: #aaa; font-size: 18px; cursor: grab; padding: 0 5px; }
            .twb-building__label { flex: 1; display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
            .twb-building__input {
                width: 45px;
                padding: 4px;
                border: 1px solid #5d4a33;
                border-radius: 4px;
                background: rgba(0,0,0,0.5);
                color: #e6d5b8;
                text-align: center;
                font-size: 11px;
            }
            .twb-settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .twb-setting { display: flex; flex-direction: column; gap: 3px; }
            .twb-setting label { font-size: 11px; color: #aaa; }
            .twb-setting-checkbox { grid-column: span 2; display: flex; align-items: center; }
            .twb-input {
                width: 100%;
                padding: 5px;
                border: 1px solid #5d4a33;
                border-radius: 4px;
                background: rgba(0,0,0,0.5);
                color: #e6d5b8;
                font-size: 12px;
            }
            .twb-logs__content {
                max-height: 150px;
                overflow-y: auto;
                padding: 8px;
                background: rgba(0,0,0,0.5);
                border-radius: 5px;
                font-family: 'Courier New', monospace;
                font-size: 11px;
            }
            .twb-log { padding: 3px 0; border-bottom: 1px solid #3a3a3a; }
            .twb-log--success { color: #81c784; }
            .twb-log--error { color: #ef5350; }
            .twb-log--warning { color: #ffb74d; }
            .twb-log--build { color: #64b5f6; }
            .twb-log--debug { color: #ce93d8; }
            .twb-log__time { color: #888; font-size: 10px; margin-right: 5px; }
            .twb-panel__footer {
                padding: 12px 15px;
                background: rgba(0,0,0,0.3);
                border-top: 1px solid #5d4a33;
                display: flex;
                justify-content: flex-end;
            }
            .twb-empty { text-align: center; padding: 15px; color: #888; font-style: italic; font-size: 12px; }
            .twb-panel__content::-webkit-scrollbar,
            .twb-villages__list::-webkit-scrollbar,
            .twb-buildings__grid::-webkit-scrollbar,
            .twb-logs__content::-webkit-scrollbar { width: 6px; }
            .twb-panel__content::-webkit-scrollbar-thumb,
            .twb-villages__list::-webkit-scrollbar-thumb,
            .twb-buildings__grid::-webkit-scrollbar-thumb,
            .twb-logs__content::-webkit-scrollbar-thumb { background: #8b7355; border-radius: 3px; }
            .twb-panel__content::-webkit-scrollbar-track,
            .twb-villages__list::-webkit-scrollbar-track,
            .twb-buildings__grid::-webkit-scrollbar-track,
            .twb-logs__content::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
            @media (max-height: 700px) {
                .twb-panel__content { max-height: 60vh; }
                .twb-buildings__grid { max-height: 200px; }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'twb-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // ========== INICIALIZAÇÃO ==========

    async init() {
        console.log('🏗️ TW Auto Builder v1.8');
        await this.loadSettings();
        this.createPanel();
        await this.loadMyVillages();
        this.log('Sistema inicializado (v1.8)', 'success');
    }
}

if (typeof window.twBuilder === 'undefined') {
    window.twBuilder = new TW_AutoBuilder();
}
