// ==UserScript==
// @name         TW Auto Builder - Estilo Unificado v4.0
// @version      4.0.1
// @description  Construtor global com CSS moderno unificado
// @author       You
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
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
            maxConcurrentFetches: 2,
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
            villagesCollapsed: false,
            isInitialized: false
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

    // ========== MÉTODOS CORE ==========

    getCurrentVillageId() {
        const saved = localStorage.getItem('twb_selected_village');
        if (saved) return parseInt(saved);
        const m = window.location.href.match(/village=(\d+)/);
        return m ? parseInt(m[1]) : null;
    }

    async init() {
        console.log('🏗️ TW Auto Builder v4.0.1 iniciado');
        this.createIframe();
        await this.loadSettings();
        this.createPanel();
        this.loadRunningState();

        // Carregar aldeias em background
        this.loadMyVillages().then(() => {
            this.renderVillages();
            this.state.isInitialized = true;
            this.log('✅ Sistema inicializado completamente');
        }).catch(err => {
            console.error('Falha ao carregar aldeias:', err);
            this.log('❌ Falha ao carregar lista de aldeias');
            this.state.isInitialized = true;
        });
    }

    async loadSettings() {
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

        this.state.selectedVillages = JSON.parse(localStorage.getItem('twb_selected_villages') || '[]');
        this.state.panelHidden = localStorage.getItem('twb_panel_state') === 'hidden';
        this.state.villagesCollapsed = localStorage.getItem('twb_villages_collapsed') === 'true';

        const savedConcurrent = localStorage.getItem('twb_max_concurrent');
        if (savedConcurrent) this.settings.maxConcurrentFetches = parseInt(savedConcurrent);

        const savedInterval = localStorage.getItem('twb_multivillage_interval');
        if (savedInterval) this.settings.multivillageInterval = parseInt(savedInterval);
    }

    async loadMyVillages() {
        try {
            const playerId = (window.game_data && window.game_data.player && window.game_data.player.id) ? window.game_data.player.id : null;
            const res = await fetch('/map/village.txt');

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const text = await res.text();

            this.state.myVillages = text.trim().split('\n')
                .filter(line => line.trim())
                .map(line => {
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
                })
                .filter(v => playerId === null ? true : v.player === playerId)
                .sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

            this.state.villagesLoaded = true;
            this.log(`🏘️ ${this.state.myVillages.length} aldeias carregadas`);
        } catch (err) {
            console.error('Erro ao carregar aldeias', err);
            this.state.myVillages = [];
            this.state.villagesLoaded = true;
            throw err;
        }
    }

    // ========== SISTEMA DE CONSTRUÇÃO ==========

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

            while (executing.size >= maxConcurrent) {
                await Promise.race(executing);
                if (!this.state.isRunning) break;
            }

            if (!this.state.isRunning) break;

            const promise = task().finally(() => executing.delete(promise));
            executing.add(promise);
            results.push(promise);
        }

        await Promise.allSettled(Array.from(executing));
        return Promise.allSettled(results);
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
        return results.map((result, i) => {
            if (result.status === 'fulfilled') {
                return {
                    villageId: villageIds[i],
                    buildings: result.value.buildings,
                    queueCount: result.value.queueCount
                };
            } else {
                return {
                    villageId: villageIds[i],
                    buildings: null,
                    queueCount: 0
                };
            }
        });
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

        if (!this.state.isInitialized) {
            this.log('⚠️ Sistema ainda inicializando...');
            return;
        }

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

    // ========== INTERFACE ESTILO UNIFICADO ==========

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
                        <span>Construtor Automático</span>
                    </div>
                </div>

                <div class="twb-panel__content">
                    <div class="twb-section">
                        <div class="twb-section-title">⚙️ Status do Sistema</div>
                        <div class="twb-status-line">
                            <span>
                                <span class="twb-status-indicator ${this.state.isRunning ? 'ativo' : 'inativo'}"></span>
                                <span id="twb-status-text">${this.state.isRunning ? 'Executando' : 'Parado'}</span>
                            </span>
                        </div>
                        <button class="twb-btn ${this.state.isRunning ? 'inativo' : 'ativo'}" id="twb-toggle-btn-main">
                            ${this.state.isRunning ? '⏸️ Parar Sistema' : '▶️ Iniciar Sistema'}
                        </button>
                    </div>

                    <div class="twb-section">
                        <div class="twb-section-title">🏘️ Seleção de Aldeias</div>
                        <div class="twb-controls">
                            <button class="twb-btn" data-action="mark-all">✓ Todas</button>
                            <button class="twb-btn" data-action="unmark-all">✗ Nenhuma</button>
                            <button class="twb-btn" data-action="toggle-villages">
                                ${this.state.villagesCollapsed ? '▲' : '▼'} Expandir
                            </button>
                        </div>
                        <div class="twb-villages ${this.state.villagesCollapsed ? 'twb-villages--collapsed' : ''}">
                            <div class="twb-villages__list" id="twb-villages-list"></div>
                        </div>
                    </div>

                    <div class="twb-section">
                        <div class="twb-section-title">🏛️ Configuração de Edifícios</div>
                        <div class="twb-buildings">
                            <div class="twb-buildings__grid" id="twb-buildings-grid"></div>
                        </div>
                    </div>

                    <div class="twb-section">
                        <div class="twb-section-title">
                            <span>📜 Registro de Atividades</span>
                            <button class="twb-btn twb-btn-small" data-action="clear-logs">🗑️</button>
                        </div>
                        <div class="twb-logs">
                            <div class="twb-logs__content" id="twb-logs-content"></div>
                        </div>
                    </div>
                </div>

                <div class="twb-panel__footer">
                    <div class="twb-settings">
                        <div class="twb-setting">
                            <label>Intervalo (s)</label>
                            <input type="number" class="twb-input" data-setting="interval"
                                   value="${Math.floor(this.settings.multivillageInterval/1000)}" min="5">
                        </div>
                        <div class="twb-setting">
                            <label>Concorrência</label>
                            <input type="number" class="twb-input" data-setting="concurrency"
                                   value="${this.settings.maxConcurrentFetches}" min="1" max="5">
                        </div>
                    </div>
                    <button class="twb-btn twb-btn-primary" data-action="save">💾 Salvar</button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        const actions = {
            'toggle': () => this.toggle(),
            'toggle-villages': () => this.toggleVillages(),
            'mark-all': () => this.markAllVillages(true),
            'unmark-all': () => this.markAllVillages(false),
            'save': () => this.saveSettings(),
            'clear-logs': () => this.clearLogs()
        };

        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => actions[btn.dataset.action]());
        });

        const mainToggle = document.getElementById('twb-toggle-btn-main');
        if (mainToggle) {
            mainToggle.addEventListener('click', () => this.toggle());
        }

        const toggleBtn = document.getElementById('twb-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.togglePanel());
        }

        const panel = document.getElementById('twb-builder');
        if (panel) {
            panel.addEventListener('click', (e) => {
                if (this.state.panelHidden && e.target === panel) {
                    this.togglePanel();
                }
            });
        }
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
        const panel = document.getElementById('twb-builder');
        if (panel) {
            panel.classList.toggle('twb-panel--hidden');
        }
        localStorage.setItem('twb_panel_state', this.state.panelHidden ? 'hidden' : 'visible');
    }

    toggleVillages() {
        this.state.villagesCollapsed = !this.state.villagesCollapsed;
        document.querySelector('.twb-villages').classList.toggle('twb-villages--collapsed');
        document.querySelector('[data-action="toggle-villages"]').textContent =
            this.state.villagesCollapsed ? '▲ Expandir' : '▼ Recolher';
        localStorage.setItem('twb_villages_collapsed', this.state.villagesCollapsed);
    }

    saveSettings() {
        Object.keys(this.buildingsList).forEach(id => {
            const cb = document.querySelector(`input[onchange*="${id}"]`);
            if (cb) {
                this.settings.enabledBuildings[id] = cb.checked;
                localStorage.setItem(`twb_build_${id}`, cb.checked);
            }
        });

        localStorage.setItem('twb_build_maxLevels', JSON.stringify(this.settings.maxLevels));
        localStorage.setItem('twb_selected_villages', JSON.stringify(this.state.selectedVillages));

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
        const statusText = document.getElementById('twb-status-text');
        const statusIndicator = document.querySelector('.twb-status-indicator');
        const toggleBtn = document.getElementById('twb-toggle-btn-main');

        if (statusText) statusText.textContent = this.state.isRunning ? 'Executando' : 'Parado';
        if (statusIndicator) {
            statusIndicator.className = `twb-status-indicator ${this.state.isRunning ? 'ativo' : 'inativo'}`;
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = this.state.isRunning ? '⏸️ Parar Sistema' : '▶️ Iniciar Sistema';
            toggleBtn.className = `twb-btn ${this.state.isRunning ? 'inativo' : 'ativo'}`;
        }
    }

    showSaveFeedback() {
        const btn = document.querySelector('[data-action="save"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Salvo!';
        btn.classList.add('twb-btn-saved');

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('twb-btn-saved');
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

    // ========== CSS ESTILO UNIFICADO ==========

    injectStyles() {
        if (document.getElementById('twb-styles')) return;

        const styles = `
            /* ============================================ */
            /* PAINEL PRINCIPAL - ESTILO UNIFICADO */
            /* ============================================ */
            #twb-builder {
                position: fixed;
                top: 50px;
                left: 0;
                width: 400px;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border: 2px solid #654321;
                border-left: none;
                border-radius: 0 12px 12px 0;
                box-shadow: 4px 4px 16px rgba(0,0,0,0.6);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #f1e1c1;
                z-index: 99998;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform: translateX(0);
            }

            #twb-builder.twb-panel--hidden {
                transform: translateX(-400px);
                cursor: pointer;
            }

            #twb-builder.twb-panel--hidden:hover {
                transform: translateX(-400px);
            }

            /* ============================================ */
            /* BOTÃO TOGGLE LATERAL */
            /* ============================================ */
            #twb-toggle-btn {
                position: absolute;
                top: 10px;
                right: -32px;
                width: 32px;
                height: 50px;
                background: linear-gradient(135deg, #5c4023 0%, #3d2817 100%);
                border: 2px solid #654321;
                border-left: none;
                border-radius: 0 8px 8px 0;
                color: #f1e1c1;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                box-shadow: 3px 3px 8px rgba(0,0,0,0.5);
                transition: all 0.2s;
            }

            #twb-toggle-btn:hover {
                background: linear-gradient(135deg, #6d5029 0%, #4d3820 100%);
                transform: translateX(2px);
            }

            /* ============================================ */
            /* CONTEÚDO DO PAINEL */
            /* ============================================ */
            .twb-panel__content-wrapper {
                width: 100%;
            }

            .twb-panel__header {
                padding: 16px 20px;
                background: linear-gradient(135deg, #654321 0%, #8b6914 50%, #654321 100%);
                border-radius: 0 12px 0 0;
                border-bottom: 2px solid #654321;
            }

            .twb-panel__title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: bold;
                color: #d4b35d;
            }

            .twb-panel__icon {
                font-size: 20px;
            }

            .twb-panel__content {
                padding: 16px;
                max-height: 70vh;
                overflow-y: auto;
            }

            /* ============================================ */
            /* SEÇÕES */
            /* ============================================ */
            .twb-section {
                background: rgba(0,0,0,0.3);
                border: 1px solid #654321;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
            }

            .twb-section-title {
                font-size: 13px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #d4b35d;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }

            /* ============================================ */
            /* STATUS */
            /* ============================================ */
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

            .twb-status-indicator.ativo {
                background: #2ecc71;
                box-shadow: 0 0 8px #2ecc71;
            }

            .twb-status-indicator.inativo {
                background: #e74c3c;
                box-shadow: 0 0 8px #e74c3c;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            /* ============================================ */
            /* BOTÕES */
            /* ============================================ */
            .twb-btn {
                display: inline-block;
                padding: 8px 16px;
                margin: 4px 2px;
                background: linear-gradient(135deg, #5c4023 0%, #3d2817 100%);
                border: 1px solid #654321;
                border-radius: 6px;
                color: #f1e1c1;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                transition: all 0.2s;
                user-select: none;
            }

            .twb-btn:hover {
                background: linear-gradient(135deg, #6d5029 0%, #4d3820 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }

            .twb-btn:active {
                transform: translateY(0);
            }

            .twb-btn.ativo {
                background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%);
                border-color: #2ecc71;
            }

            .twb-btn.inativo {
                background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
                border-color: #e74c3c;
            }

            .twb-btn-primary {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border-color: #2563eb;
            }

            .twb-btn-small {
                padding: 4px 8px;
                font-size: 11px;
            }

            .twb-btn-saved {
                background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%) !important;
            }

            /* ============================================ */
            /* CONTROLES */
            /* ============================================ */
            .twb-controls {
                display: flex;
                gap: 6px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }

            .twb-controls .twb-btn {
                flex: 1;
                min-width: 80px;
            }

            /* ============================================ */
            /* ALDEIAS */
            /* ============================================ */
            .twb-villages {
                margin-top: 10px;
            }

            .twb-villages--collapsed .twb-villages__list {
                display: none;
            }

            .twb-villages__list {
                max-height: 180px;
                overflow-y: auto;
                background: rgba(0,0,0,0.4);
                border-radius: 6px;
                padding: 6px;
            }

            .twb-village {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 10px;
                margin-bottom: 4px;
                background: rgba(255,255,255,0.05);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .twb-village:hover {
                background: rgba(255,255,255,0.1);
                transform: translateX(4px);
            }

            .twb-village__name {
                flex: 1;
                font-size: 12px;
                font-weight: 500;
            }

            .twb-village__points {
                font-size: 10px;
                color: #95a5a6;
                background: rgba(0,0,0,0.3);
                padding: 3px 6px;
                border-radius: 4px;
            }

            /* ============================================ */
            /* EDIFÍCIOS */
            /* ============================================ */
            .twb-buildings__grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
            }

            .twb-building {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background: rgba(0,0,0,0.4);
                border-radius: 6px;
                border: 1px solid rgba(101, 67, 33, 0.3);
            }

            .twb-building__label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                cursor: pointer;
                flex: 1;
            }

            .twb-building__input {
                width: 45px;
                padding: 4px;
                border: 1px solid #654321;
                border-radius: 4px;
                background: rgba(0,0,0,0.5);
                color: #f1e1c1;
                text-align: center;
                font-size: 11px;
            }

            /* ============================================ */
            /* LOGS */
            /* ============================================ */
            .twb-logs {
                margin-top: 10px;
            }

            .twb-logs__content {
                max-height: 100px;
                overflow-y: auto;
                padding: 8px;
                background: rgba(0,0,0,0.5);
                border-radius: 6px;
                font-size: 11px;
                font-family: 'Courier New', monospace;
            }

            .twb-log {
                padding: 4px 0;
                border-bottom: 1px solid rgba(101, 67, 33, 0.3);
            }

            .twb-log:last-child {
                border-bottom: none;
            }

            .twb-log__time {
                color: #95a5a6;
                font-size: 10px;
                margin-right: 6px;
            }

            /* ============================================ */
            /* FOOTER */
            /* ============================================ */
            .twb-panel__footer {
                padding: 12px 16px;
                background: rgba(0,0,0,0.3);
                border-top: 1px solid #654321;
                border-radius: 0 0 0 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
            }

            .twb-settings {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .twb-setting {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .twb-setting label {
                font-size: 10px;
                color: #95a5a6;
                font-weight: 600;
            }

            .twb-input {
                width: 55px;
                padding: 5px;
                border: 1px solid #654321;
                border-radius: 4px;
                background: rgba(0,0,0,0.5);
                color: #f1e1c1;
                text-align: center;
                font-size: 11px;
            }

            /* ============================================ */
            /* ESTADOS */
            /* ============================================ */
            .twb-empty {
                text-align: center;
                padding: 16px;
                color: #95a5a6;
                font-style: italic;
                font-size: 12px;
            }

            /* ============================================ */
            /* SCROLLBAR */
            /* ============================================ */
            .twb-panel__content::-webkit-scrollbar,
            .twb-villages__list::-webkit-scrollbar,
            .twb-logs__content::-webkit-scrollbar {
                width: 6px;
            }

            .twb-panel__content::-webkit-scrollbar-thumb,
            .twb-villages__list::-webkit-scrollbar-thumb,
            .twb-logs__content::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #654321, #8b6914);
                border-radius: 3px;
            }

            .twb-panel__content::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.3);
                border-radius: 3px;
            }

            /* ============================================ */
            /* RESPONSIVIDADE */
            /* ============================================ */
            @media (max-height: 800px) {
                .twb-panel__content {
                    max-height: 60vh;
                }

                .twb-villages__list {
                    max-height: 140px;
                }

                .twb-logs__content {
                    max-height: 80px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'twb-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// ============================================
// INICIALIZAÇÃO SEGURA
// ============================================
if (typeof window.twBuilder === 'undefined') {
    const twBuilder = new TWB_AutoBuilder();
    window.twBuilder = twBuilder;
}

