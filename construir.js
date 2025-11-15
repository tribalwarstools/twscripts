// ==UserScript==
// @name         TW Auto Builder - Global Multivillage (TW Dark) - Híbrido Otimizado
// @version      2.6
// @description  Construtor global otimizado: fetch paralelo controlado, iframe serializado, retry + backoff, jitter, intervalos adaptativos
// @author       You
// @match        https://*.tribalwars.com.br/game.php*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

class TWAutoBuilder {
    constructor() {
        this.buildingsList = {
            'main': 'Edifício principal', 'barracks': 'Quartel', 'stable': 'Estábulo',
            'garage': 'Oficina', 'church': 'Igreja', 'watchtower': 'Torre de vigia',
            'snob': 'Academia', 'smith': 'Ferreiro', 'place': 'Praça de reunião',
            'statue': 'Estátua', 'market': 'Mercado', 'wood': 'Bosque',
            'stone': 'Poço de argila', 'iron': 'Mina de ferro', 'farm': 'Fazenda',
            'storage': 'Armazém', 'hide': 'Esconderijo', 'wall': 'Muralha'
        };

        // Defaults otimizados
        this.settings = {
            enabled: true,
            checkInterval: 45000,
            allowQueue: true,
            maxQueueSlots: 5,
            priorityBuildings: Object.keys(this.buildingsList),
            maxLevels: {
                'main': 30, 'farm': 30, 'storage': 30, 'wood': 30, 'stone': 30, 'iron': 30,
                'barracks': 25, 'stable': 20, 'market': 25, 'smith': 20, 'wall': 20,
                'garage': 15, 'hide': 10, 'snob': 1, 'church': 3, 'watchtower': 20,
                'place': 1, 'statue': 1
            },
            enabledBuildings: {},
            operationMode: 'multivillage',
            multivillageInterval: 15 * 1000,
            // Novas configurações de otimização
            maxConcurrentFetches: 3,
            maxRetries: 3,
            baseRetryDelay: 2000,
            jitterRange: 0.3, // ±30% de jitter
            adaptiveInterval: {
                enabled: true,
                baseInterval: 15000,
                minInterval: 8000,
                maxInterval: 60000,
                errorMultiplier: 1.5,
                successMultiplier: 0.95
            }
        };

        this.isRunning = false;
        this.loopPromise = null;
        this.currentVillageId = this.getCurrentVillageId();
        this.iframe = null;
        this.myVillages = [];
        this.villagesLoaded = false;
        this.selectedVillagesList = [];
        this.villagesCollapsed = false;
        this.saveButtonState = 'normal';
        
        // Estatísticas para adaptive interval
        this.stats = {
            consecutiveErrors: 0,
            consecutiveSuccess: 0,
            totalErrors: 0,
            totalSuccess: 0,
            lastErrorTime: 0
        };

        // Controle de concorrência
        this.activeFetches = 0;
        this.fetchQueue = [];
        this.currentBuild = null;

        this.init();
    }

    getCurrentVillageId() {
        const saved = localStorage.getItem('tw_builder_selected_village');
        if (saved) return parseInt(saved);
        const m = window.location.href.match(/village=(\d+)/);
        return m ? parseInt(m[1]) : null;
    }

    async init() {
        console.log('🏗️ TW Auto Builder - Híbrido Otimizado iniciado');
        this.createIframe();
        this.loadBuildingSettings();
        await this.loadMyVillages();
        this.createControlPanel();
        this.loadRunningState();
    }

    // ========== PERSISTÊNCIA DE CONFIGURAÇÕES ==========

    loadBuildingSettings() {
        Object.keys(this.buildingsList).forEach(id => {
            const saved = localStorage.getItem(`tw_build_${id}`);
            this.settings.enabledBuildings[id] = saved === null ? true : saved !== 'false';
        });
        const savedMax = localStorage.getItem('tw_build_maxLevels');
        if (savedMax) {
            try { this.settings.maxLevels = {...this.settings.maxLevels, ...JSON.parse(savedMax)}; } catch(e){}
        }
        const savedSel = localStorage.getItem('tw_builder_selected_villages');
        if (savedSel) {
            try { this.selectedVillagesList = JSON.parse(savedSel); } catch(e){ this.selectedVillagesList = []; }
        } else this.selectedVillagesList = [];
        const savedInterval = localStorage.getItem('tw_builder_multivillage_interval');
        if (savedInterval) this.settings.multivillageInterval = parseInt(savedInterval);
        
        const savedPanelState = localStorage.getItem('tw_builder_panel_state');
        this.panelHidden = savedPanelState === 'hidden';
        
        const savedVillagesCollapsed = localStorage.getItem('tw_builder_villages_collapsed');
        this.villagesCollapsed = savedVillagesCollapsed === 'true';

        // Carregar configurações de concorrência
        const savedConcurrent = localStorage.getItem('tw_builder_max_concurrent');
        if (savedConcurrent) this.settings.maxConcurrentFetches = parseInt(savedConcurrent);
    }

    saveBuildingSettings() {
        Object.keys(this.buildingsList).forEach(buildingId => {
            const cb = document.querySelector(`#tw-build-${buildingId}`);
            if (cb) {
                this.settings.enabledBuildings[buildingId] = cb.checked;
                localStorage.setItem(`tw_build_${buildingId}`, cb.checked ? 'true' : 'false');
            }
            const input = document.querySelector(`#tw-max-${buildingId}`);
            if (input) {
                const val = parseInt(input.value) || this.settings.maxLevels[buildingId] || 0;
                this.settings.maxLevels[buildingId] = val;
            }
        });
        localStorage.setItem('tw_build_maxLevels', JSON.stringify(this.settings.maxLevels));
        this.log('💾 Níveis e ativação de edifícios salvos');
    }

    saveVillageSelection() {
        const selected = [];
        this.myVillages.forEach(v => {
            const cb = document.querySelector(`#tw-village-${v.id}`);
            if (cb && cb.checked) selected.push(v.id);
        });
        this.selectedVillagesList = selected;
        localStorage.setItem('tw_builder_selected_villages', JSON.stringify(this.selectedVillagesList));
        this.log(`💾 Aldeias selecionadas: ${this.selectedVillagesList.length}`);
    }

    loadRunningState() {
        const savedRunningState = localStorage.getItem('tw_builder_running_state');
        if (savedRunningState === 'true') {
            this.log('🔄 Retomando estado anterior: Iniciado');
            this.start();
        } else {
            this.log('⏸️ Retomando estado anterior: Parado');
            this.stop();
        }
    }

    saveRunningState() {
        localStorage.setItem('tw_builder_running_state', this.isRunning.toString());
        this.log(`💾 Estado salvo: ${this.isRunning ? 'Rodando' : 'Parado'}`);
    }

    // ========== SISTEMA DE CONCORRÊNCIA CONTROLADA ==========

    async executeWithConcurrency(tasks, maxConcurrent = this.settings.maxConcurrentFetches) {
        const results = [];
        const executing = new Set();
        
        for (let i = 0; i < tasks.length; i++) {
            if (!this.isRunning) break;
            
            const task = tasks[i];
            if (executing.size >= maxConcurrent) {
                await Promise.race(executing);
            }
            
            const promise = task().finally(() => {
                executing.delete(promise);
            });
            
            executing.add(promise);
            results.push(promise);
        }
        
        return Promise.all(results);
    }

    // ========== SISTEMA DE RETRY + BACKOFF EXPONENCIAL ==========

    async fetchWithRetry(url, options = {}, retries = this.settings.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    credentials: 'include',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    ...options
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                this.recordSuccess();
                return await response.text();
                
            } catch (error) {
                this.recordError();
                
                if (attempt === retries) {
                    throw error;
                }
                
                const delay = this.calculateBackoffDelay(attempt);
                this.log(`⚠️ Tentativa ${attempt}/${retries} falhou, retry em ${delay}ms: ${error.message}`);
                await this.sleep(delay);
            }
        }
    }

    calculateBackoffDelay(attempt) {
        const baseDelay = this.settings.baseRetryDelay;
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = exponentialDelay * this.settings.jitterRange * (Math.random() * 2 - 1);
        return Math.min(exponentialDelay + jitter, 30000); // Max 30s
    }

    // ========== SISTEMA DE INTERVALO ADAPTATIVO ==========

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

    calculateAdaptiveInterval() {
        if (!this.settings.adaptiveInterval.enabled) {
            return this.settings.multivillageInterval;
        }

        let interval = this.settings.adaptiveInterval.baseInterval;

        // Aumenta intervalo se houver erros consecutivos
        if (this.stats.consecutiveErrors > 0) {
            interval *= Math.pow(this.settings.adaptiveInterval.errorMultiplier, this.stats.consecutiveErrors);
        }
        
        // Diminui gradualmente se sucesso consecutivo
        if (this.stats.consecutiveSuccess > 3) {
            interval *= Math.pow(this.settings.adaptiveInterval.successMultiplier, Math.min(this.stats.consecutiveSuccess - 3, 10));
        }

        // Adiciona jitter
        const jitter = interval * this.settings.jitterRange * (Math.random() * 2 - 1);
        interval += jitter;

        // Limites
        interval = Math.max(this.settings.adaptiveInterval.minInterval, 
                           Math.min(this.settings.adaptiveInterval.maxInterval, interval));

        return Math.floor(interval);
    }

    // ========== CARREGAMENTO DE ALDEIAS ==========

    async loadMyVillages() {
        try {
            const playerId = (window.game_data && game_data.player && game_data.player.id) ? game_data.player.id : null;
            const res = await fetch('/map/village.txt');
            const text = await res.text();
            this.myVillages = text.trim().split('\n').map(line => {
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
            this.villagesLoaded = true;
            this.log(`🏘️ ${this.myVillages.length} aldeias carregadas`);
            this.renderVillageControls();
        } catch (err) {
            console.error('Erro ao carregar aldeias', err);
            this.myVillages = [];
            this.villagesLoaded = true;
            this.renderVillageControls();
        }
    }

    // ========== FETCH PARALELO OTIMIZADO ==========

    async fetchConstructionPage(villageId) {
        try {
            const url = `/game.php?village=${villageId}&screen=main`;
            const html = await this.fetchWithRetry(url, { timeout: 10000 });
            return this.parseBuildingsFromHTML(html);
        } catch (error) {
            this.log(`❌ Erro fetch construção vila ${villageId}: ${error.message}`);
            return null;
        }
    }

    async fetchQueueStatus(villageId) {
        try {
            const url = `/game.php?village=${villageId}&screen=main`;
            const html = await this.fetchWithRetry(url, { timeout: 8000 });
            return this.parseQueueFromHTML(html);
        } catch (error) {
            this.log(`❌ Erro fetch fila vila ${villageId}: ${error.message}`);
            return 0;
        }
    }

    parseBuildingsFromHTML(html) {
        const buildings = {};
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const rows = doc.querySelectorAll('tr[id^="main_buildrow_"]');
        rows.forEach(row => {
            try {
                const buildingId = row.id.replace('main_buildrow_', '');
                if (!this.buildingsList[buildingId]) return;
                
                const levelText = row.querySelector('span[style*="font-size: 0.9em"]')?.textContent || '';
                const currentLevel = this.extractLevel(levelText);
                const buildButton = row.querySelector('.btn-build');
                const buildLink = buildButton?.getAttribute('href') || '';
                const inactiveMessage = row.querySelector('.inactive');
                const errorMessage = inactiveMessage?.textContent || '';
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
            } catch (e) {
                // ignore
            }
        });
        return buildings;
    }

    parseQueueFromHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const queueItems = doc.querySelectorAll('#buildqueue tr.lit, .build_order');
        return queueItems.length;
    }

    extractLevel(levelText) {
        if (!levelText) return 0;
        if (levelText.includes('não construído')) return 0;
        const m = levelText.match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
    }

    // Busca paralela para múltiplas aldeias
    async fetchMultipleVillagesData(villageIds) {
        const constructionTasks = villageIds.map(vid => 
            () => this.fetchConstructionPage(vid)
        );
        
        const queueTasks = villageIds.map(vid => 
            () => this.fetchQueueStatus(vid)
        );

        this.log(`🔄 Buscando dados de ${villageIds.length} aldeias (concorrência: ${this.settings.maxConcurrentFetches})`);
        
        const [buildingsResults, queueResults] = await Promise.all([
            this.executeWithConcurrency(constructionTasks),
            this.executeWithConcurrency(queueTasks)
        ]);

        // Combinar resultados
        const results = [];
        for (let i = 0; i < villageIds.length; i++) {
            results.push({
                villageId: villageIds[i],
                buildings: buildingsResults[i],
                queueCount: queueResults[i]
            });
        }

        return results;
    }

    // ========== IFRAME SERIALIZADO + LIMPEZA ==========

    createIframe() {
        const old = document.getElementById('tw-builder-iframe');
        if (old) old.remove();
        this.iframe = document.createElement('iframe');
        this.iframe.id = 'tw-builder-iframe';
        this.iframe.style.cssText = 'position:fixed;width:1px;height:1px;border:none;opacity:0;pointer-events:none;z-index:-9999';
        document.body.appendChild(this.iframe);
    }

    async buildViaIframe(building, village) {
        if (!building.build_link) {
            this.log(`❌ Sem link para ${building.name} em ${village.name}`);
            return false;
        }

        // Serialização: espera build anterior terminar
        while (this.currentBuild) {
            await this.sleep(100);
            if (!this.isRunning) return false;
        }

        try {
            this.currentBuild = { building, village };
            this.log(`🏗️ Tentando construir ${building.name} (nível ${building.level}) em ${village.name}`);
            
            // Limpa iframe antes do uso
            this.iframe.src = 'about:blank';
            await this.sleep(100);
            
            // Executa comando
            this.iframe.src = building.build_link;
            const ok = await this.waitIframeLoad(8000);
            
            // Limpeza pós-uso
            await this.sleep(800);
            this.iframe.src = 'about:blank';
            
            if (ok) {
                this.log(`✅ Comando enviado: ${building.name} em ${village.name}`);
                return true;
            } else {
                this.log('❌ Timeout no iframe');
                return false;
            }
        } catch (e) {
            this.log('❌ Erro buildViaIframe: ' + e.message);
            return false;
        } finally {
            this.currentBuild = null;
        }
    }

    waitIframeLoad(timeout = 8000) {
        return new Promise((resolve) => {
            let done = false;
            const onload = () => {
                if (done) return;
                done = true;
                cleanup();
                resolve(true);
            };
            const onerror = () => {
                if (done) return;
                done = true;
                cleanup();
                resolve(false);
            };
            const to = setTimeout(() => {
                if (done) return;
                done = true;
                cleanup();
                resolve(false);
            }, timeout);
            const cleanup = () => {
                clearTimeout(to);
                this.iframe.removeEventListener('load', onload);
                this.iframe.removeEventListener('error', onerror);
            };
            this.iframe.addEventListener('load', onload);
            this.iframe.addEventListener('error', onerror);
        });
    }

    // ========== LÓGICA DE CONSTRUÇÃO ==========

    findNextBuilding(buildings) {
        for (const id of this.settings.priorityBuildings) {
            const b = buildings[id];
            if (!b) continue;
            if (!b.enabled) continue;
            const max = this.settings.maxLevels[id] ?? 0;
            const cur = b.level ?? 0;
            if (cur >= max) continue;
            const canBuild = b.can_build || (this.settings.allowQueue && b.can_queue);
            if (canBuild && b.build_link) return b;
        }
        return null;
    }

    // ========== LOOP PRINCIPAL OTIMIZADO ==========

    async loopWorker() {
        if (!this.selectedVillagesList || this.selectedVillagesList.length === 0) {
            this.log('⚠️ Nenhuma aldeia marcada — marque ao menos uma para iniciar.');
            this.isRunning = false;
            this.updateStatus();
            this.saveRunningState();
            return;
        }

        this.log(`🔄 Iniciando execução para ${this.selectedVillagesList.length} aldeias (Modo Híbrido Otimizado)`);
        
        while (this.isRunning) {
            const startTime = Date.now();
            let constructionsStarted = 0;
            let errorsCount = 0;

            try {
                // ✅ FETCH PARALELO para todas as aldeias
                const villagesData = await this.fetchMultipleVillagesData(this.selectedVillagesList);
                
                // Processa resultados sequencialmente
                for (const data of villagesData) {
                    if (!this.isRunning) break;
                    
                    const village = this.myVillages.find(v => v.id === data.villageId) || 
                                  {id: data.villageId, name: 'Aldeia ' + data.villageId};
                    
                    if (!data.buildings || Object.keys(data.buildings).length === 0) {
                        this.log(`❌ Sem dados de construção para ${village.name}`);
                        errorsCount++;
                        continue;
                    }
                    
                    const availableSlots = Math.max(0, this.settings.maxQueueSlots - (data.queueCount || 0));
                    if (availableSlots <= 0) {
                        this.log(`⏳ Fila cheia em ${village.name} (${data.queueCount}/${this.settings.maxQueueSlots})`);
                        continue;
                    }
                    
                    const nextBuilding = this.findNextBuilding(data.buildings);
                    if (nextBuilding) {
                        // ✅ IFRAME SERIALIZADO para comandos
                        const success = await this.buildViaIframe(nextBuilding, village);
                        if (success) {
                            constructionsStarted++;
                            this.log(`✅ ${nextBuilding.name} iniciado em ${village.name}`);
                        } else {
                            errorsCount++;
                        }
                        
                        // Pequena pausa entre construções na mesma aldeia
                        await this.sleep(1000);
                    } else {
                        this.log(`📭 Nenhuma construção disponível em ${village.name}`);
                    }
                }
                
            } catch (error) {
                this.log(`❌ Erro no processamento em lote: ${error.message}`);
                errorsCount++;
            }

            // Atualiza estatísticas e calcula intervalo adaptativo
            if (errorsCount > 0) {
                this.log(`⚠️ ${errorsCount} erro(s) nesta rodada`);
            }
            
            if (constructionsStarted > 0) {
                this.log(`🏗️ ${constructionsStarted} construção(ões) iniciadas`);
            }

            const adaptiveInterval = this.calculateAdaptiveInterval();
            const elapsed = Date.now() - startTime;
            const waitTime = Math.max(2000, adaptiveInterval - elapsed);
            
            this.log(`⏱️ Próxima verificação em ${Math.round(waitTime/1000)}s (adaptativo: ${Math.round(adaptiveInterval/1000)}s)`);
            
            await this.sleep(waitTime);
        }
        
        this.log('⏸️ Loop principal finalizado');
    }

    // ========== CONTROLES PRINCIPAIS ==========

    start() {
        if (this.isRunning) { this.log('⚠️ Já está rodando'); return; }
        this.saveVillageSelection();
        if (!this.selectedVillagesList || this.selectedVillagesList.length === 0) {
            this.log('❗ Marque ao menos uma aldeia antes de iniciar');
            return;
        }
        this.isRunning = true;
        this.updateStatus();
        this.saveRunningState();
        this.loopPromise = this.loopWorker();
        this.log('▶️ Auto Builder iniciado (Modo Híbrido Otimizado)');
    }

    stop() {
        if (!this.isRunning) { this.log('⚠️ Já está parado'); return; }
        this.isRunning = false;
        this.updateStatus();
        this.saveRunningState();
        this.log('⏸️ Auto Builder parado pelo usuário');
    }

    toggle() { this.isRunning ? this.stop() : this.start(); }

    sleep(ms) { 
        return new Promise(r => setTimeout(r, ms)); 
    }

    // ========== INTERFACE DO USUÁRIO ==========

    updateStatus() {
        const statusText = document.getElementById('builder-status-text');
        const toggleBtn = document.getElementById('twc-toggle-btn');
        if (statusText) statusText.textContent = this.isRunning ? 'Rodando' : 'Parado';
        if (toggleBtn) {
            toggleBtn.textContent = this.isRunning ? '⏸️ Parar' : '▶️ Iniciar';
            toggleBtn.className = `twc-button ${this.isRunning ? 'twc-button-stop' : 'twc-button-start'}`;
        }
    }

    updateSaveButtonState(state) {
        this.saveButtonState = state;
        const saveBtn = document.getElementById('twc-save-btn');
        if (!saveBtn) return;

        switch (state) {
            case 'saving':
                saveBtn.innerHTML = '⏳ Salvando...';
                saveBtn.className = 'twc-button twc-button-saving';
                saveBtn.disabled = true;
                break;
            case 'saved':
                saveBtn.innerHTML = '✅ Salvo!';
                saveBtn.className = 'twc-button twc-button-saved';
                saveBtn.disabled = false;
                setTimeout(() => {
                    if (this.saveButtonState === 'saved') {
                        this.updateSaveButtonState('normal');
                    }
                }, 2000);
                break;
            case 'normal':
            default:
                saveBtn.innerHTML = '💾 Salvar';
                saveBtn.className = 'twc-button twc-button-save';
                saveBtn.disabled = false;
                break;
        }
    }

    async handleSave() {
        this.updateSaveButtonState('saving');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.saveBuildingSettings();
        this.saveVillageSelection();
        
        const iv = document.getElementById('twc-interval-input');
        if (iv) {
            const v = parseInt(iv.value) || this.settings.multivillageInterval / 1000;
            this.settings.multivillageInterval = v * 1000;
            this.settings.adaptiveInterval.baseInterval = v * 1000;
            localStorage.setItem('tw_builder_multivillage_interval', String(this.settings.multivillageInterval));
        }
        
        // Salvar configurações de concorrência
        const concInput = document.getElementById('twc-concurrency-input');
        if (concInput) {
            this.settings.maxConcurrentFetches = parseInt(concInput.value) || 3;
            localStorage.setItem('tw_builder_max_concurrent', String(this.settings.maxConcurrentFetches));
        }
        
        this.log('💾 Configurações salvas');
        this.updateSaveButtonState('saved');
    }

    togglePanel() {
        const panel = document.getElementById('tw-auto-builder-panel');
        if (panel) {
            panel.classList.toggle('twc-hidden');
            this.panelHidden = panel.classList.contains('twc-hidden');
            localStorage.setItem('tw_builder_panel_state', this.panelHidden ? 'hidden' : 'visible');
            this.updateToggleTabText();
        }
    }

    updateToggleTabText() {
        const toggleTab = document.getElementById('twc-toggle-tab');
        if (toggleTab) {
            toggleTab.textContent = this.panelHidden ? 'Abrir' : 'Fechar';
        }
    }

    toggleVillages() {
        this.villagesCollapsed = !this.villagesCollapsed;
        localStorage.setItem('tw_builder_villages_collapsed', this.villagesCollapsed);
        this.updateVillagesSection();
    }

    updateVillagesSection() {
        const container = document.getElementById('twc-villages-container');
        const toggleBtn = document.getElementById('twc-villages-toggle');
        
        if (container && toggleBtn) {
            if (this.villagesCollapsed) {
                container.style.display = 'none';
                toggleBtn.textContent = '▶️ Aldeias';
            } else {
                container.style.display = 'block';
                toggleBtn.textContent = '▼ Aldeias';
            }
        }
    }

    createControlPanel() {
        const existing = document.getElementById('tw-auto-builder-panel');
        if (existing) existing.remove();
        this.injectStyles();
        const panel = document.createElement('div');
        panel.id = 'tw-auto-builder-panel';
        panel.className = 'twc-container';
        panel.innerHTML = this.getPanelHTML();
        document.body.appendChild(panel);

        if (this.panelHidden) {
            panel.classList.add('twc-hidden');
        }
        this.updateToggleTabText();
        this.updateVillagesSection();

        this.renderBuildingsControls();
        this.renderVillageControls();
        
        document.getElementById('twc-save-btn').onclick = () => this.handleSave();
        document.getElementById('twc-toggle-btn').onclick = () => this.toggle();
        document.getElementById('twc-markall-btn').onclick = () => { this.markAllVillages(true); };
        document.getElementById('twc-unmarkall-btn').onclick = () => { this.markAllVillages(false); };
        document.getElementById('twc-villages-toggle').onclick = () => this.toggleVillages();
        document.getElementById('twc-toggle-tab').onclick = () => this.togglePanel();
        
        const iv = document.getElementById('twc-interval-input');
        if (iv) iv.value = String(Math.floor(this.settings.multivillageInterval / 1000));
        
        const concInput = document.getElementById('twc-concurrency-input');
        if (concInput) concInput.value = String(this.settings.maxConcurrentFetches);
        
        this.updateStatus();
        this.updateSaveButtonState('normal');
    }

    getPanelHTML() {
        return `
            <div class="twc-toggle-tab" id="twc-toggle-tab">${this.panelHidden ? 'Abrir' : 'Fechar'}</div>
            <div class="twc-header">🏹 Construtor Tribal - Híbrido Otimizado</div>
            <div class="twc-grid">
                <div class="twc-column twc-column-left">
                    <div class="twc-section-title">🏗️ Edifícios (nível alvo)</div>
                    <div id="twc-edificios-controls"></div>
                </div>
                <div class="twc-column twc-column-right">
                    <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <button id="twc-villages-toggle" class="twc-villages-toggle-btn">${this.villagesCollapsed ? '▶️ Aldeias' : '▼ Aldeias'}</button>
                        <div style="display:flex;gap:6px;">
                            <button id="twc-markall-btn" class="twc-button twc-button-secondary">Marcar todos</button>
                            <button id="twc-unmarkall-btn" class="twc-button twc-button-secondary">Desmarcar</button>
                        </div>
                    </div>
                    <div id="twc-villages-container" class="scrollbar-custom" style="${this.villagesCollapsed ? 'display:none;' : ''} max-height:200px;overflow:auto;">
                        <div id="twc-villages-controls"></div>
                    </div>
                    <div class="twc-log-area">
                        <div class="twc-section-title">📜 Logs</div>
                        <div id="builder-logs" class="twc-log-container"></div>
                    </div>
                </div>
            </div>
            <div class="twc-controls-footer">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <div class="twc-status-item">Status: <strong id="builder-status-text">${this.isRunning ? 'Rodando' : 'Parado'}</strong></div>
                    <div class="twc-status-item">Intervalo: <input id="twc-interval-input" class="twc-input-small" type="number" min="5" value="${Math.floor(this.settings.multivillageInterval/1000)}">s</div>
                    <div class="twc-status-item">Concorrência: <input id="twc-concurrency-input" class="twc-input-small" type="number" min="1" max="5" value="${this.settings.maxConcurrentFetches}"></div>
                </div>
                <div class="twc-buttons">
                    <button id="twc-save-btn" class="twc-button twc-button-save">💾 Salvar</button>
                    <button id="twc-toggle-btn" class="twc-button ${this.isRunning ? 'twc-button-stop' : 'twc-button-start'}">${this.isRunning ? '⏸️ Parar' : '▶️ Iniciar'}</button>
                </div>
            </div>
        `;
    }

    renderBuildingsControls() {
        const container = document.getElementById('twc-edificios-controls');
        if (!container) return;
        
        const buildingsArray = Object.entries(this.buildingsList);
        const middleIndex = Math.ceil(buildingsArray.length / 2);
        const firstColumn = buildingsArray.slice(0, middleIndex);
        const secondColumn = buildingsArray.slice(middleIndex);
        
        let html = '<div class="twc-edificios-grid">';
        
        html += '<div class="twc-edificios-column">';
        firstColumn.forEach(([id, name]) => {
            const checked = this.settings.enabledBuildings[id] !== false ? 'checked' : '';
            const maxVal = this.settings.maxLevels[id] !== undefined ? this.settings.maxLevels[id] : '';
            html += `
                <div class="twc-edificio-row">
                    <label class="twc-edificio-label"><input type="checkbox" id="tw-build-${id}" ${checked}> ${name}</label>
                    <input type="number" id="tw-max-${id}" class="twc-input-small" min="0" value="${maxVal}">
                </div>
            `;
        });
        html += '</div>';
        
        html += '<div class="twc-edificios-column">';
        secondColumn.forEach(([id, name]) => {
            const checked = this.settings.enabledBuildings[id] !== false ? 'checked' : '';
            const maxVal = this.settings.maxLevels[id] !== undefined ? this.settings.maxLevels[id] : '';
            html += `
                <div class="twc-edificio-row">
                    <label class="twc-edificio-label"><input type="checkbox" id="tw-build-${id}" ${checked}> ${name}</label>
                    <input type="number" id="tw-max-${id}" class="twc-input-small" min="0" value="${maxVal}">
                </div>
            `;
        });
        html += '</div>';
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderVillageControls() {
        const container = document.getElementById('twc-villages-controls');
        if (!container) return;
        if (!this.villagesLoaded) {
            container.innerHTML = '<div class="twc-log-entry">Carregando aldeias...</div>';
            return;
        }
        if (this.myVillages.length === 0) {
            container.innerHTML = '<div class="twc-log-entry">Nenhuma aldeia encontrada</div>';
            return;
        }
        let html = '';
        this.myVillages.forEach(v => {
            const checked = this.selectedVillagesList.includes(v.id) ? 'checked' : '';
            html += `
                <label class="twc-village-row" style="display:flex;gap:8px;align-items:center;padding:6px;border-radius:6px;">
                    <input type="checkbox" id="tw-village-${v.id}" ${checked}>
                    <span class="twc-village-name">${v.x}|${v.y} - ${v.name} (${v.points.toLocaleString()} P)</span>
                </label>
            `;
        });
        container.innerHTML = html;
    }

    markAllVillages(state) {
        this.myVillages.forEach(v => {
            const cb = document.querySelector(`#tw-village-${v.id}`);
            if (cb) cb.checked = state;
        });
        this.saveVillageSelection();
    }

    log(message) {
        const logs = document.getElementById('builder-logs');
        if (logs) {
            const t = new Date().toLocaleTimeString();
            logs.innerHTML = `<div class="twc-log-entry">[${t}] ${message}</div>` + logs.innerHTML;
            const entries = logs.querySelectorAll('.twc-log-entry');
            if (entries.length > 300) entries[entries.length - 1].remove();
        }
        console.log('TWBuilder:', message);
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .twc-container {
                position: fixed; 
                right: 0; 
                bottom: 10px; 
                width: 720px; 
                z-index: 99999;
                font-family: Verdana, sans-serif !important;
                background: #2b1b0f !important;
                color: #f5deb3 !important;
                border: 2px solid #654321 !important; 
                border-right: none !important;
                border-radius: 8px 0 0 8px !important;
                box-shadow: 0 4px 18px rgba(0,0,0,0.7) !important; 
                padding: 10px !important;
                transition: transform 0.4s ease !important;
            }
            .twc-toggle-tab {
                position: absolute; left: -28px; top: 40%;
                background: #5c3a1e; border: 2px solid #654321; border-right: none;
                border-radius: 6px 0 0 6px; padding: 6px 4px; font-size: 14px;
                color: #ffd700; cursor: pointer; writing-mode: vertical-rl;
                text-orientation: mixed; user-select: none; box-shadow: -2px 0 6px rgba(0,0,0,0.5);
            }
            .twc-toggle-tab:hover { background: #7b5124; }
            .twc-hidden { transform: translateX(100%); }
            
            .twc-header{text-align:center;font-size:16px;font-weight:bold;padding:8px;margin-bottom:8px;}
            .twc-grid{display:grid;grid-template-columns:1fr 340px;gap:12px;align-items:start;}
            .twc-column{background:rgba(255,255,255,0.02);border-radius:8px;padding:10px;border:1px solid rgba(0,0,0,0.25);}
            .twc-section-title{font-weight:bold;color:#ffd700;margin-bottom:8px;font-size:13px;}
            
            .twc-edificios-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
            .twc-edificios-column{display:flex;flex-direction:column;gap:8px;}
            .twc-edificio-row{display:flex;justify-content:space-between;align-items:center;padding:6px;border-radius:6px;background:rgba(0,0,0,0.12);}
            .twc-edificio-label{display:flex;align-items:center;gap:8px;font-size:12px;}
            .twc-input-small{width:64px;padding:6px;border-radius:6px;border:1px solid rgba(0,0,0,0.4);background:rgba(0,0,0,0.18);color:#f5deb3;text-align:center;}
            
            .twc-villages-toggle-btn{background:none;border:none;color:#ffd700;cursor:pointer;font-weight:bold;padding:4px 8px;}
            .twc-villages-toggle-btn:hover{background:rgba(255,215,0,0.1);border-radius:4px;}
            
            .twc-village-row{display:flex;align-items:center;gap:8px;padding:6px;border-radius:6px;background:rgba(0,0,0,0.06);margin-bottom:4px;}
            .twc-village-name{font-size:12px;color:#f5deb3;}
            .twc-controls-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px;}
            .twc-buttons{display:flex;gap:8px;}
            
            .twc-button{
                padding: 8px 16px;
                border-radius: 8px;
                border: 1px solid rgba(0,0,0,0.35);
                font-weight: bold;
                cursor: pointer;
                color: #f5deb3;
                font-size: 12px;
                transition: all 0.3s ease;
                min-width: 80px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .twc-button:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }
            
            .twc-button-save {
                background: linear-gradient(135deg, #4a752c, #5a8c3a);
                border-color: #6b8c42;
            }
            .twc-button-save:hover:not(:disabled) {
                background: linear-gradient(135deg, #5a8c3a, #6a9c4a);
                box-shadow: 0 0 10px rgba(90, 140, 58, 0.4);
            }
            
            .twc-button-saving {
                background: linear-gradient(135deg, #8b7355, #9c8465);
                border-color: #a8957a;
                cursor: wait;
            }
            
            .twc-button-saved {
                background: linear-gradient(135deg, #2e8b57, #3cb371);
                border-color: #4cc381;
                box-shadow: 0 0 12px rgba(60, 179, 113, 0.5);
            }
            
            .twc-button-start {
                background: linear-gradient(135deg, #2e8b57, #3cb371);
                border-color: #4cc381;
            }
            .twc-button-start:hover {
                background: linear-gradient(135deg, #3cb371, #4cd381);
                box-shadow: 0 0 10px rgba(60, 179, 113, 0.4);
            }
            
            .twc-button-stop {
                background: linear-gradient(135deg, #b22222, #dc143c);
                border-color: #e52444;
            }
            .twc-button-stop:hover {
                background: linear-gradient(135deg, #dc143c, #ec244c);
                box-shadow: 0 0 10px rgba(220, 20, 60, 0.4);
            }
            
            .twc-button-secondary {
                background: linear-gradient(135deg, #7a4a20, #5a3215);
                border-color: #8a5a30;
                font-size: 11px;
                padding: 6px 12px;
            }
            .twc-button-secondary:hover {
                background: linear-gradient(135deg, #8a5a30, #6a4225);
                box-shadow: 0 0 8px rgba(122, 74, 32, 0.3);
            }
            
            .twc-log-area{margin-top:12px;}
            .twc-log-container{max-height:150px;overflow:auto;background:rgba(0,0,0,0.18);padding:8px;border-radius:6px;font-family:monospace;font-size:12px;}
            .twc-log-entry{margin-bottom:6px;padding:6px;border-radius:6px;background:rgba(255,255,255,0.02);}
            .scrollbar-custom::-webkit-scrollbar{width:8px;}
            .scrollbar-custom::-webkit-scrollbar-thumb{background:rgba(120,80,40,0.7);border-radius:6px;}
        `;
        document.head.appendChild(style);
    }
}

// instantiate and expose
const builder = new TWAutoBuilder();
window.builder = builder;
