// ==UserScript==
// @name         TW Auto Builder - CSS 3.0 Moderno
// @version      3.0
// @description  Construtor global com CSS 3.0 moderno e código otimizado
// @author       You
// @match        https://*.tribalwars.com.br/game.php*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

class TWB_AutoBuilder {
    constructor() {
        this.buildingsList = {
            'main': 'Edifício principal', 'barracks': 'Quartel', 'stable': 'Estábulo',
            'garage': 'Oficina', 'church': 'Igreja', 'watchtower': 'Torre de vigia',
            'snob': 'Academia', 'smith': 'Ferreiro', 'place': 'Praça de reunião',
            'statue': 'Estátua', 'market': 'Mercado', 'wood': 'Bosque',
            'stone': 'Poço de argila', 'iron': 'Mina de ferro', 'farm': 'Fazenda',
            'storage': 'Armazém', 'hide': 'Esconderijo', 'wall': 'Muralha'
        };

        this.settings = {
            enabled: true,
            checkInterval: 45000,
            allowQueue: true,
            maxQueueSlots: 5,
            priorityBuildings: Object.keys(this.buildingsList),
            maxLevels: Object.fromEntries(
                Object.keys(this.buildingsList).map(k => [k, 
                    k === 'main' || k === 'farm' || k === 'storage' || 
                    k === 'wood' || k === 'stone' || k === 'iron' ? 30 : 
                    k === 'barracks' || k === 'market' ? 25 :
                    k === 'stable' || k === 'smith' || k === 'wall' || k === 'watchtower' ? 20 :
                    k === 'garage' ? 15 : k === 'hide' ? 10 : 
                    k === 'church' ? 3 : 1
                ])
            ),
            enabledBuildings: {},
            operationMode: 'multivillage',
            multivillageInterval: 15000,
            maxConcurrentFetches: 3,
            maxRetries: 3,
            baseRetryDelay: 2000,
            jitterRange: 0.3,
            adaptiveInterval: {
                enabled: true,
                baseInterval: 15000,
                minInterval: 8000,
                maxInterval: 60000,
                errorMultiplier: 1.5,
                successMultiplier: 0.95
            }
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
            consecutiveErrors: 0,
            consecutiveSuccess: 0,
            totalErrors: 0,
            totalSuccess: 0,
            lastErrorTime: 0,
            totalConstructions: 0
        };

        this.iframe = null;
        this.currentBuild = null;
        this.init();
    }

    // ========== MÉTODOS CORE (MANTIDOS) ==========

    getCurrentVillageId() {
        const saved = localStorage.getItem('twb_selected_village');
        if (saved) return parseInt(saved);
        const m = window.location.href.match(/village=(\d+)/);
        return m ? parseInt(m[1]) : null;
    }

    async init() {
        console.log('🏗️ TW Auto Builder CSS 3.0 iniciado');
        this.createIframe();
        await this.loadSettings();
        await this.loadMyVillages();
        this.createPanel();
        this.loadRunningState();
    }

    async loadSettings() {
        // Configurações de edifícios
        Object.keys(this.buildingsList).forEach(id => {
            const saved = localStorage.getItem(`twb_build_${id}`);
            this.settings.enabledBuildings[id] = saved === null ? true : saved !== 'false';
        });

        const savedMax = localStorage.getItem('twb_build_maxLevels');
        if (savedMax) {
            try { 
                Object.assign(this.settings.maxLevels, JSON.parse(savedMax));
            } catch(e) {}
        }

        // Estado da UI
        this.state.selectedVillages = JSON.parse(localStorage.getItem('twb_selected_villages') || '[]');
        this.state.panelHidden = localStorage.getItem('twb_panel_state') === 'hidden';
        this.state.villagesCollapsed = localStorage.getItem('twb_villages_collapsed') === 'true';

        // Configurações de performance
        const savedConcurrent = localStorage.getItem('twb_max_concurrent');
        if (savedConcurrent) this.settings.maxConcurrentFetches = parseInt(savedConcurrent);
        
        const savedInterval = localStorage.getItem('twb_multivillage_interval');
        if (savedInterval) this.settings.multivillageInterval = parseInt(savedInterval);
    }

    async loadMyVillages() {
        try {
            const playerId = (window.game_data && window.game_data.player && window.game_data.player.id) ? window.game_data.player.id : null;
            const res = await fetch('/map/village.txt');
            const text = await res.text();
            
            this.state.myVillages = text.trim().split('\n').map(line => {
                const [id, name, x, y, player, points, bonus_id] = line.split(',');
                return {
                    id: parseInt(id),
                    name: decodeURIComponent(name.replace(/\+/g, ' ')),
                    x: parseInt(x),
                    y: parseInt(y),
                    player: parseInt(player),
                    points: parseInt(points),
                    bonus_id: bonus_id ? parseInt(bonus_id) : null
                };
            }).filter(v => playerId === null ? true : v.player === playerId)
              .sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
              
            this.state.villagesLoaded = true;
            this.log(`🏘️ ${this.state.myVillages.length} aldeias carregadas`);
        } catch (err) {
            console.error('Erro ao carregar aldeias', err);
            this.state.myVillages = [];
            this.state.villagesLoaded = true;
            this.log('❌ Erro ao carregar aldeias');
        }
    }

    // ========== SISTEMA DE CONSTRUÇÃO (OTIMIZADO) ==========

    createIframe() {
        const old = document.getElementById('twb-builder-iframe');
        if (old) old.remove();
        this.iframe = document.createElement('iframe');
        this.iframe.id = 'twb-builder-iframe';
        Object.assign(this.iframe.style, {
            position: 'fixed', width: '1px', height: '1px', border: 'none',
            opacity: '0', pointerEvents: 'none', zIndex: '-9999'
        });
        document.body.appendChild(this.iframe);
    }

    async fetchWithRetry(url, options = {}, retries = this.settings.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    credentials: 'include',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    ...options
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                this.recordSuccess();
                return await response.text();
                
            } catch (error) {
                this.recordError();
                if (attempt === retries) throw error;
                
                const delay = this.calculateBackoffDelay(attempt);
                this.log(`⚠️ Tentativa ${attempt}/${retries} falhou, retry em ${delay}ms`);
                await this.sleep(delay);
            }
        }
    }

    calculateBackoffDelay(attempt) {
        const baseDelay = this.settings.baseRetryDelay;
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = exponentialDelay * this.settings.jitterRange * (Math.random() * 2 - 1);
        return Math.min(exponentialDelay + jitter, 30000);
    }

    recordSuccess() {
        this.stats.consecutiveSuccess++;
        this.stats.consecutiveErrors = 0;
        this.stats.totalSuccess++;
    }

    recordError() {
        this.stats.consecutiveErrors++;
        this.stats.consecutiveSuccess = 0;
        this.stats.totalErrors++;
        this.stats.lastErrorTime = Date.now();
    }

    async executeWithConcurrency(tasks, maxConcurrent = this.settings.maxConcurrentFetches) {
        const results = [];
        const executing = new Set();
        
        for (const task of tasks) {
            if (!this.state.isRunning) break;
            
            if (executing.size >= maxConcurrent) {
                await Promise.race(executing);
            }
            
            const promise = task().finally(() => executing.delete(promise));
            executing.add(promise);
            results.push(promise);
        }
        
        return Promise.all(results);
    }

    async fetchVillageData(villageId) {
        try {
            const url = `/game.php?village=${villageId}&screen=main`;
            const html = await this.fetchWithRetry(url, { timeout: 10000 });
            
            return {
                buildings: this.parseBuildingsFromHTML(html),
                queueCount: this.parseQueueFromHTML(html)
            };
        } catch (error) {
            this.log(`❌ Erro fetch vila ${villageId}`);
            return { buildings: null, queueCount: 0 };
        }
    }

    async fetchMultipleVillagesData(villageIds) {
        const tasks = villageIds.map(vid => () => this.fetchVillageData(vid));
        this.log(`🔄 Buscando ${villageIds.length} aldeias`);
        
        const results = await this.executeWithConcurrency(tasks);
        return results.map((data, i) => ({
            villageId: villageIds[i],
            buildings: data.buildings,
            queueCount: data.queueCount
        }));
    }

    parseBuildingsFromHTML(html) {
        const buildings = {};
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        doc.querySelectorAll('tr[id^="main_buildrow_"]').forEach(row => {
            try {
                const buildingId = row.id.replace('main_buildrow_', '');
                if (!this.buildingsList[buildingId]) return;
                
                const levelText = row.querySelector('span[style*="font-size: 0.9em"]')?.textContent || '';
                const currentLevel = this.extractLevel(levelText);
                const buildButton = row.querySelector('.btn-build');
                const buildLink = buildButton?.getAttribute('href') || '';
                const errorMessage = row.querySelector('.inactive')?.textContent || '';
                const hasBuildButton = buildButton && buildButton.style.display !== 'none';
                const canBuildNow = hasBuildButton && !errorMessage.includes('Fazenda') && !errorMessage.includes('requer');
                const canQueue = hasBuildButton && this.settings.allowQueue && buildLink !== '';
                
                buildings[buildingId] = {
                    id: buildingId,
                    level: currentLevel,
                    can_build: canBuildNow,
                    can_queue: canQueue,
                    build_link: buildLink,
                    error: errorMessage,
                    name: this.buildingsList[buildingId],
                    enabled: this.settings.enabledBuildings[buildingId] !== false
                };
            } catch (e) {}
        });
        return buildings;
    }

    parseQueueFromHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.querySelectorAll('#buildqueue tr.lit, .build_order').length;
    }

    extractLevel(levelText) {
        if (!levelText || levelText.includes('não construído')) return 0;
        const m = levelText.match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
    }

    async buildViaIframe(building, village) {
        if (!building.build_link) {
            this.log(`❌ Sem link para ${building.name}`);
            return false;
        }

        while (this.currentBuild && this.state.isRunning) {
            await this.sleep(100);
        }

        try {
            this.currentBuild = { building, village };
            this.log(`🏗️ Construindo ${building.name} em ${village.name}`);
            
            this.iframe.src = 'about:blank';
            await this.sleep(100);
            
            this.iframe.src = building.build_link;
            const ok = await this.waitIframeLoad(8000);
            
            await this.sleep(800);
            this.iframe.src = 'about:blank';
            
            if (ok) {
                this.log(`✅ ${building.name} iniciado`);
                this.stats.totalConstructions++;
                return true;
            }
            return false;
        } catch (e) {
            this.log('❌ Erro na construção');
            return false;
        } finally {
            this.currentBuild = null;
        }
    }

    waitIframeLoad(timeout = 8000) {
        return new Promise((resolve) => {
            let done = false;
            const cleanup = () => {
                clearTimeout(to);
                this.iframe.removeEventListener('load', onload);
                this.iframe.removeEventListener('error', onerror);
            };
            const onload = () => { if (!done) { done = true; cleanup(); resolve(true); } };
            const onerror = () => { if (!done) { done = true; cleanup(); resolve(false); } };
            const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(false); } }, timeout);
            
            this.iframe.addEventListener('load', onload);
            this.iframe.addEventListener('error', onerror);
        });
    }

    findNextBuilding(buildings) {
        for (const id of this.settings.priorityBuildings) {
            const b = buildings[id];
            if (!b || !b.enabled) continue;
            const max = this.settings.maxLevels[id] ?? 0;
            const cur = b.level ?? 0;
            if (cur >= max) continue;
            const canBuild = b.can_build || (this.settings.allowQueue && b.can_queue);
            if (canBuild && b.build_link) return b;
        }
        return null;
    }

    calculateAdaptiveInterval() {
        if (!this.settings.adaptiveInterval.enabled) {
            return this.settings.multivillageInterval;
        }

        let interval = this.settings.adaptiveInterval.baseInterval;

        if (this.stats.consecutiveErrors > 0) {
            interval *= Math.pow(this.settings.adaptiveInterval.errorMultiplier, this.stats.consecutiveErrors);
        }
        
        if (this.stats.consecutiveSuccess > 3) {
            interval *= Math.pow(this.settings.adaptiveInterval.successMultiplier, Math.min(this.stats.consecutiveSuccess - 3, 10));
        }

        const jitter = interval * this.settings.jitterRange * (Math.random() * 2 - 1);
        interval += jitter;

        return Math.max(this.settings.adaptiveInterval.minInterval, 
                       Math.min(this.settings.adaptiveInterval.maxInterval, interval));
    }

    // ========== LOOP PRINCIPAL ==========

    async loopWorker() {
        if (!this.state.selectedVillages.length) {
            this.log('⚠️ Nenhuma aldeia marcada');
            this.stop();
            return;
        }

        this.log(`🔄 Executando ${this.state.selectedVillages.length} aldeias`);
        
        while (this.state.isRunning) {
            const startTime = Date.now();
            let constructionsStarted = 0;

            try {
                const villagesData = await this.fetchMultipleVillagesData(this.state.selectedVillages);
                
                for (const data of villagesData) {
                    if (!this.state.isRunning) break;
                    
                    const village = this.state.myVillages.find(v => v.id === data.villageId) || 
                                  {id: data.villageId, name: 'Aldeia ' + data.villageId};
                    
                    if (!data.buildings) {
                        this.log(`❌ Sem dados para ${village.name}`);
                        continue;
                    }
                    
                    const availableSlots = Math.max(0, this.settings.maxQueueSlots - (data.queueCount || 0));
                    if (availableSlots <= 0) {
                        this.log(`⏳ Fila cheia em ${village.name}`);
                        continue;
                    }
                    
                    const nextBuilding = this.findNextBuilding(data.buildings);
                    if (nextBuilding && await this.buildViaIframe(nextBuilding, village)) {
                        constructionsStarted++;
                        await this.sleep(1000);
                    }
                }
            } catch (error) {
                this.log(`❌ Erro no processamento`);
            }

            const adaptiveInterval = this.calculateAdaptiveInterval();
            const elapsed = Date.now() - startTime;
            const waitTime = Math.max(2000, adaptiveInterval - elapsed);
            
            this.log(`⏱️ Próxima verificação em ${Math.round(waitTime/1000)}s`);
            await this.sleep(waitTime);
        }
    }

    // ========== CONTROLES PRINCIPAIS ==========

    start() {
        if (this.state.isRunning) return;
        this.saveVillageSelection();
        if (!this.state.selectedVillages.length) {
            this.log('❗ Marque ao menos uma aldeia');
            return;
        }
        this.state.isRunning = true;
        this.updateUI();
        this.saveRunningState();
        this.loopWorker();
        this.log('▶️ Auto Builder iniciado');
    }

    stop() {
        if (!this.state.isRunning) return;
        this.state.isRunning = false;
        this.updateUI();
        this.saveRunningState();
        this.log('⏸️ Auto Builder parado');
    }

    toggle() { 
        this.state.isRunning ? this.stop() : this.start(); 
    }

    sleep(ms) { 
        return new Promise(r => setTimeout(r, ms)); 
    }

    // ========== INTERFACE CSS 3.0 MODERNA ==========

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
            <div class="twb-panel__header">
                <div class="twb-panel__title">
                    <span class="twb-panel__icon">⚡</span>
                    <span>Construtor Tribal v3.0</span>
                </div>
                <button class="twb-btn twb-btn--icon" data-action="toggle-panel">
                    ${this.state.panelHidden ? '◀' : '▶'}
                </button>
            </div>

            <div class="twb-panel__content">
                <!-- Status Card -->
                <div class="twb-status">
                    <div class="twb-status__indicator ${this.state.isRunning ? 'twb-status--running' : 'twb-status--stopped'}"></div>
                    <span class="twb-status__text">${this.state.isRunning ? 'EXECUTANDO' : 'PARADO'}</span>
                    <button class="twb-btn ${this.state.isRunning ? 'twb-btn--danger' : 'twb-btn--success'}" data-action="toggle">
                        ${this.state.isRunning ? '⏸️ Parar' : '▶️ Iniciar'}
                    </button>
                </div>

                <!-- Controles Rápidos -->
                <div class="twb-controls">
                    <button class="twb-btn twb-btn--secondary" data-action="mark-all">✓ Todas</button>
                    <button class="twb-btn twb-btn--secondary" data-action="unmark-all">✗ Nenhuma</button>
                    <button class="twb-btn twb-btn--secondary" data-action="toggle-villages">
                        ${this.state.villagesCollapsed ? '▶ Aldeias' : '▼ Aldeias'}
                    </button>
                </div>

                <!-- Lista de Aldeias -->
                <div class="twb-villages ${this.state.villagesCollapsed ? 'twb-villages--collapsed' : ''}">
                    <div class="twb-villages__list" id="twb-villages-list"></div>
                </div>

                <!-- Edifícios -->
                <div class="twb-buildings">
                    <div class="twb-buildings__grid" id="twb-buildings-grid"></div>
                </div>

                <!-- Logs -->
                <div class="twb-logs">
                    <div class="twb-logs__header">
                        <span>📜 Atividades</span>
                        <button class="twb-btn twb-btn--icon twb-btn--small" data-action="clear-logs">🗑️</button>
                    </div>
                    <div class="twb-logs__content" id="twb-logs-content"></div>
                </div>
            </div>

            <div class="twb-panel__footer">
                <div class="twb-settings">
                    <div class="twb-setting">
                        <label>Intervalo</label>
                        <input type="number" class="twb-input" data-setting="interval" 
                               value="${Math.floor(this.settings.multivillageInterval/1000)}" min="5">
                    </div>
                    <div class="twb-setting">
                        <label>Concorrência</label>
                        <input type="number" class="twb-input" data-setting="concurrency" 
                               value="${this.settings.maxConcurrentFetches}" min="1" max="5">
                    </div>
                </div>
                <button class="twb-btn twb-btn--primary" data-action="save">💾 Salvar</button>
            </div>
        `;
    }

    attachEvents() {
        const actions = {
            'toggle': () => this.toggle(),
            'toggle-panel': () => this.togglePanel(),
            'toggle-villages': () => this.toggleVillages(),
            'mark-all': () => this.markAllVillages(true),
            'unmark-all': () => this.markAllVillages(false),
            'save': () => this.saveSettings(),
            'clear-logs': () => this.clearLogs()
        };

        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => actions[btn.dataset.action]());
        });
    }

    renderVillages() {
        const container = document.getElementById('twb-villages-list');
        if (!container) return;

        if (!this.state.villagesLoaded) {
            container.innerHTML = '<div class="twb-empty">Carregando aldeias...</div>';
            return;
        }

        if (!this.state.myVillages.length) {
            container.innerHTML = '<div class="twb-empty">Nenhuma aldeia encontrada</div>';
            return;
        }

        container.innerHTML = this.state.myVillages.map(village => `
            <label class="twb-village">
                <input type="checkbox" value="${village.id}" 
                       ${this.state.selectedVillages.includes(village.id) ? 'checked' : ''}
                       onchange="window.twBuilder.toggleVillage(${village.id})">
                <span class="twb-village__name">${village.x}|${village.y} ${village.name}</span>
                <span class="twb-village__points">${village.points.toLocaleString()}</span>
            </label>
        `).join('');
    }

    renderBuildings() {
        const container = document.getElementById('twb-buildings-grid');
        if (!container) return;

        container.innerHTML = Object.entries(this.buildingsList).map(([id, name]) => {
            const maxLevel = this.settings.maxLevels[id] || 0;
            const enabled = this.settings.enabledBuildings[id] !== false;

            return `
                <div class="twb-building">
                    <label class="twb-building__label">
                        <input type="checkbox" ${enabled ? 'checked' : ''} 
                               onchange="window.twBuilder.toggleBuilding('${id}')">
                        <span>${name}</span>
                    </label>
                    <input type="number" class="twb-building__input" 
                           value="${maxLevel}" min="0" max="30"
                           onchange="window.twBuilder.setMaxLevel('${id}', this.value)">
                </div>
            `;
        }).join('');
    }

    toggleVillage(villageId) {
        const index = this.state.selectedVillages.indexOf(villageId);
        if (index > -1) {
            this.state.selectedVillages.splice(index, 1);
        } else {
            this.state.selectedVillages.push(villageId);
        }
        this.log(`Aldeias selecionadas: ${this.state.selectedVillages.length}`);
    }

    toggleBuilding(buildingId) {
        this.settings.enabledBuildings[buildingId] = !this.settings.enabledBuildings[buildingId];
    }

    setMaxLevel(buildingId, level) {
        this.settings.maxLevels[buildingId] = parseInt(level) || 0;
    }

    markAllVillages(select) {
        this.state.selectedVillages = select ? this.state.myVillages.map(v => v.id) : [];
        this.renderVillages();
        this.log(select ? 'Todas aldeias marcadas' : 'Todas aldeias desmarcadas');
    }

    togglePanel() {
        this.state.panelHidden = !this.state.panelHidden;
        document.getElementById('twb-builder').classList.toggle('twb-panel--hidden');
        document.querySelector('[data-action="toggle-panel"]').textContent = 
            this.state.panelHidden ? '◀' : '▶';
        localStorage.setItem('twb_panel_state', this.state.panelHidden ? 'hidden' : 'visible');
    }

    toggleVillages() {
        this.state.villagesCollapsed = !this.state.villagesCollapsed;
        document.querySelector('.twb-villages').classList.toggle('twb-villages--collapsed');
        document.querySelector('[data-action="toggle-villages"]').textContent = 
            this.state.villagesCollapsed ? '▶ Aldeias' : '▼ Aldeias';
        localStorage.setItem('twb_villages_collapsed', this.state.villagesCollapsed);
    }

    saveSettings() {
        // Salvar configurações de edifícios
        Object.keys(this.buildingsList).forEach(id => {
            const cb = document.querySelector(`input[onchange*="${id}"]`);
            if (cb) {
                this.settings.enabledBuildings[id] = cb.checked;
                localStorage.setItem(`twb_build_${id}`, cb.checked);
            }
        });

        localStorage.setItem('twb_build_maxLevels', JSON.stringify(this.settings.maxLevels));
        localStorage.setItem('twb_selected_villages', JSON.stringify(this.state.selectedVillages));

        // Salvar configurações de performance
        const intervalInput = document.querySelector('[data-setting="interval"]');
        const concInput = document.querySelector('[data-setting="concurrency"]');
        
        if (intervalInput) {
            this.settings.multivillageInterval = parseInt(intervalInput.value) * 1000;
            localStorage.setItem('twb_multivillage_interval', this.settings.multivillageInterval);
        }
        
        if (concInput) {
            this.settings.maxConcurrentFetches = parseInt(concInput.value);
            localStorage.setItem('twb_max_concurrent', this.settings.maxConcurrentFetches);
        }

        this.showSaveFeedback();
        this.log('💾 Configurações salvas');
    }

    saveVillageSelection() {
        localStorage.setItem('twb_selected_villages', JSON.stringify(this.state.selectedVillages));
    }

    loadRunningState() {
        if (localStorage.getItem('twb_running_state') === 'true') {
            this.start();
        }
    }

    saveRunningState() {
        localStorage.setItem('twb_running_state', this.state.isRunning.toString());
    }

    updateUI() {
        const statusText = document.querySelector('.twb-status__text');
        const statusIndicator = document.querySelector('.twb-status__indicator');
        const toggleBtn = document.querySelector('[data-action="toggle"]');
        
        if (statusText) statusText.textContent = this.state.isRunning ? 'EXECUTANDO' : 'PARADO';
        if (statusIndicator) {
            statusIndicator.className = `twb-status__indicator ${this.state.isRunning ? 'twb-status--running' : 'twb-status--stopped'}`;
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = this.state.isRunning ? '⏸️ Parar' : '▶️ Iniciar';
            toggleBtn.className = `twb-btn ${this.state.isRunning ? 'twb-btn--danger' : 'twb-btn--success'}`;
        }
    }

    showSaveFeedback() {
        const btn = document.querySelector('[data-action="save"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Salvo!';
        btn.classList.add('twb-btn--saved');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('twb-btn--saved');
        }, 2000);
    }

    log(message) {
        const logs = document.getElementById('twb-logs-content');
        if (logs) {
            const time = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.className = 'twb-log';
            entry.innerHTML = `<span class="twb-log__time">[${time}]</span> ${message}`;
            logs.prepend(entry);
            
            if (logs.children.length > 50) {
                logs.removeChild(logs.lastChild);
            }
        }
    }

    clearLogs() {
        const logs = document.getElementById('twb-logs-content');
        if (logs) logs.innerHTML = '';
    }

    // ========== CSS 3.0 MODERNO ==========

    injectStyles() {
        const styles = `
            .twb-panel {
                --primary: #3b82f6;
                --success: #10b981;
                --danger: #ef4444;
                --warning: #f59e0b;
                --dark: #1e293b;
                --darker: #0f172a;
                --light: #f8fafc;
                --gray: #64748b;
                --border: #334155;
                
                position: fixed;
                right: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 380px;
                background: var(--darker);
                border: 1px solid var(--border);
                border-radius: 16px 0 0 16px;
                box-shadow: 
                    -8px 0 32px rgba(0,0,0,0.5),
                    inset 1px 0 0 var(--border);
                z-index: 10000;
                font-family: 'Segoe UI', system-ui, sans-serif;
                color: var(--light);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            .twb-panel--hidden {
                transform: translateX(100%) translateY(-50%);
            }

            .twb-panel__header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: linear-gradient(135deg, var(--dark) 0%, var(--darker) 100%);
                border-radius: 16px 0 0 0;
                border-bottom: 1px solid var(--border);
            }

            .twb-panel__title {
                display: flex;
                align-items: center;
                gap: 12px;
                font-weight: 700;
                font-size: 18px;
                background: linear-gradient(135deg, #60a5fa, var(--primary));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .twb-panel__icon {
                font-size: 20px;
                filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
            }

            .twb-panel__content {
                padding: 20px;
                max-height: 65vh;
                overflow-y: auto;
                background: linear-gradient(180deg, var(--darker) 0%, rgba(30, 41, 59, 0.95) 100%);
            }

            .twb-status {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: var(--dark);
                border-radius: 12px;
                border: 1px solid var(--border);
                margin-bottom: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .twb-status__indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                position: relative;
            }

            .twb-status--running {
                background: var(--success);
                box-shadow: 0 0 12px var(--success);
                animation: pulse 2s infinite;
            }

            .twb-status--stopped {
                background: var(--danger);
                box-shadow: 0 0 8px var(--danger);
            }

            .twb-status__text {
                flex: 1;
                font-weight: 600;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .twb-controls {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
            }

            .twb-btn {
                padding: 10px 16px;
                border: none;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                gap: 6px;
                position: relative;
                overflow: hidden;
            }

            .twb-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                transition: left 0.5s;
            }

            .twb-btn:hover::before {
                left: 100%;
            }

            .twb-btn--primary {
                background: linear-gradient(135deg, var(--primary), #1d4ed8);
                color: white;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            .twb-btn--success {
                background: linear-gradient(135deg, var(--success), #047857);
                color: white;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }

            .twb-btn--danger {
                background: linear-gradient(135deg, var(--danger), #dc2626);
                color: white;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }

            .twb-btn--secondary {
                background: var(--dark);
                color: var(--light);
                border: 1px solid var(--border);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .twb-btn--icon {
                background: transparent;
                padding: 8px;
                border: 1px solid var(--border);
            }

            .twb-btn--small {
                padding: 6px 12px;
                font-size: 12px;
            }

            .twb-btn--saved {
                background: linear-gradient(135deg, var(--success), #047857) !important;
                transform: scale(0.95);
            }

            .twb-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            }

            .twb-btn:active {
                transform: translateY(0);
            }

            .twb-villages--collapsed .twb-villages__list {
                display: none;
            }

            .twb-villages__list {
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 16px;
                background: var(--dark);
                border-radius: 12px;
                border: 1px solid var(--border);
                padding: 8px;
            }

            .twb-village {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                margin-bottom: 4px;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1px solid transparent;
            }

            .twb-village:hover {
                background: rgba(255,255,255,0.08);
                border-color: var(--border);
                transform: translateX(4px);
            }

            .twb-village__name {
                flex: 1;
                font-size: 13px;
                font-weight: 500;
            }

            .twb-village__points {
                font-size: 11px;
                color: var(--gray);
                background: var(--darker);
                padding: 4px 8px;
                border-radius: 6px;
                font-weight: 600;
            }

            .twb-buildings__grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 16px;
            }

            .twb-building {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: var(--dark);
                border-radius: 8px;
                border: 1px solid var(--border);
                transition: all 0.2s ease;
            }

            .twb-building:hover {
                background: rgba(255,255,255,0.05);
                transform: translateY(-1px);
            }

            .twb-building__label {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                cursor: pointer;
                font-weight: 500;
            }

            .twb-building__input {
                width: 50px;
                padding: 6px;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: var(--darker);
                color: var(--light);
                text-align: center;
                font-size: 12px;
            }

            .twb-logs {
                background: var(--dark);
                border-radius: 12px;
                border: 1px solid var(--border);
                overflow: hidden;
            }

            .twb-logs__header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, var(--dark) 0%, var(--darker) 100%);
                font-size: 13px;
                font-weight: 600;
            }

            .twb-logs__content {
                max-height: 120px;
                overflow-y: auto;
                padding: 12px;
                font-size: 11px;
                font-family: 'JetBrains Mono', 'Fira Code', monospace;
                background: var(--darker);
            }

            .twb-log {
                padding: 8px 0;
                border-bottom: 1px solid var(--border);
                line-height: 1.4;
            }

            .twb-log__time {
                color: var(--gray);
                font-size: 10px;
            }

            .twb-panel__footer {
                padding: 16px 20px;
                background: var(--dark);
                border-top: 1px solid var(--border);
                border-radius: 0 0 0 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
            }

            .twb-settings {
                display: flex;
                gap: 12px;
                align-items: center;
            }

            .twb-setting {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .twb-setting label {
                font-size: 11px;
                color: var(--gray);
                font-weight: 600;
            }

            .twb-input {
                width: 60px;
                padding: 6px;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: var(--darker);
                color: var(--light);
                text-align: center;
                font-size: 12px;
            }

            .twb-empty {
                text-align: center;
                padding: 20px;
                color: var(--gray);
                font-style: italic;
            }

            /* Scrollbar Moderna */
            .twb-panel__content::-webkit-scrollbar,
            .twb-villages__list::-webkit-scrollbar,
            .twb-logs__content::-webkit-scrollbar {
                width: 6px;
            }

            .twb-panel__content::-webkit-scrollbar-thumb,
            .twb-villages__list::-webkit-scrollbar-thumb,
            .twb-logs__content::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, var(--primary), var(--success));
                border-radius: 3px;
            }

            .twb-panel__content::-webkit-scrollbar-track {
                background: var(--dark);
                border-radius: 3px;
            }

            /* Animações CSS 3.0 */
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }

            /* Responsividade */
            @media (max-height: 800px) {
                .twb-panel__content { max-height: 55vh; }
                .twb-villages__list { max-height: 150px; }
                .twb-logs__content { max-height: 100px; }
            }

            /* Melhorias de Acessibilidade */
            .twb-btn:focus-visible,
            .twb-input:focus-visible {
                outline: 2px solid var(--primary);
                outline-offset: 2px;
            }

            /* Dark Mode Support */
            @media (prefers-color-scheme: dark) {
                .twb-panel {
                    --light: #f1f5f9;
                    --gray: #94a3b8;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// Inicialização
const twBuilder = new TWB_AutoBuilder();
window.twBuilder = twBuilder;
