// ==UserScript==
// @name         TW Auto Builder - Global Multivillage (TW Dark)
// @version      2.4
// @description  Construtor global: roda em qualquer tela, constrói apenas aldeias marcadas, respeita edifícios e níveis. Painel TW-dark.
// @author       You
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
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

        // Defaults
        this.settings = {
            enabled: true,
            // checkInterval isn't used as setInterval now - loop controls timing via multivillageInterval
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
            // Force multivillage/global by default
            operationMode: 'multivillage',
            multivillageInterval: 15 * 1000, // 15s default between villages (you can edit)
        };

        this.isRunning = false;
        this.loopPromise = null;
        this.currentVillageId = this.getCurrentVillageId();
        this.iframe = null;
        this.myVillages = [];
        this.villagesLoaded = false;

        // list of village ids selected in UI to be processed
        this.selectedVillagesList = [];

        // Estado do recolhível de aldeias
        this.villagesCollapsed = false;

        this.init();
    }

    getCurrentVillageId = () => {
        const saved = localStorage.getItem('tw_builder_selected_village');
        if (saved) return parseInt(saved);
        const m = window.location.href.match(/village=(\d+)/);
        return m ? parseInt(m[1]) : null;
    }

    async init() {
        console.log('🏗️ TW Auto Builder - Global iniciado');
        this.createIframe();
        this.loadBuildingSettings();
        await this.loadMyVillages();
        this.createControlPanel();
        // Don't auto start the loop immediately until user presses start.
        // But if you want auto-start, uncomment next line:
        // this.start();
    }

    // Load player's villages from map/village.txt (same approach as before)
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
            // render villages in panel if already present
            this.renderVillageControls();
        } catch (err) {
            console.error('Erro ao carregar aldeias', err);
            this.myVillages = [];
            this.villagesLoaded = true;
            this.renderVillageControls();
        }
    }

    // ---------- SETTINGS persistence ----------
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
        
        // Load panel state
        const savedPanelState = localStorage.getItem('tw_builder_panel_state');
        this.panelHidden = savedPanelState === 'hidden';
        
        // Load villages collapsed state
        const savedVillagesCollapsed = localStorage.getItem('tw_builder_villages_collapsed');
        this.villagesCollapsed = savedVillagesCollapsed === 'true';
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

    // ---------- iframe utilities ----------
    createIframe() {
        const old = document.getElementById('tw-builder-iframe');
        if (old) old.remove();
        this.iframe = document.createElement('iframe');
        this.iframe.id = 'tw-builder-iframe';
        this.iframe.style.cssText = 'position:fixed;width:1px;height:1px;border:none;opacity:0;pointer-events:none;z-index:-9999';
        document.body.appendChild(this.iframe);
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

    // ---------- parsing & building ----------
    async loadConstructionPageForVillage(villageId) {
        if (!villageId) return null;
        return new Promise(async (resolve) => {
            try {
                this.iframe.src = `/game.php?village=${villageId}&screen=main`;
                const ok = await this.waitIframeLoad(9000);
                if (!ok) {
                    this.log(`❌ Falha ao carregar vila ${villageId} no iframe`);
                    return resolve(null);
                }
                try {
                    const doc = this.iframe.contentDocument;
                    const buildings = this.parseBuildingsFromIframe(doc);
                    resolve(buildings);
                } catch (err) {
                    this.log('❌ Erro ao parsear documento do iframe: ' + err.message);
                    resolve(null);
                }
            } catch (err) {
                this.log('❌ Erro loadConstructionPageForVillage: ' + err.message);
                resolve(null);
            }
        });
    }

    parseBuildingsFromIframe(doc) {
        const buildings = {};
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

    extractLevel(levelText) {
        if (!levelText) return 0;
        if (levelText.includes('não construído')) return 0;
        const m = levelText.match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
    }

    async checkQueueStatusForVillage(villageId) {
        // relies on loading construction page in iframe (which we already load before)
        try {
            // ensure page is loaded for the village in iframe
            // after loading construction page, we can query iframe document
            const doc = this.iframe.contentDocument;
            if (!doc) return 0;
            const queueItems = doc.querySelectorAll('#buildqueue tr.lit, .build_order');
            return queueItems.length;
        } catch (e) {
            return 0;
        }
    }

    async buildViaIframe(building) {
        if (!building.build_link) {
            this.log(`❌ Sem link para ${building.name}`);
            return false;
        }
        try {
            this.log(`🏗️ Tentando construir ${building.name} (atual: ${building.level})`);
            // navigate iframe to build link (this triggers build or queue, depending on link)
            this.iframe.src = building.build_link;
            // wait a bit for build to be processed (page may redirect)
            await this.waitIframeLoad(8000);
            // short delay to let server-side action update queue
            await new Promise(r => setTimeout(r, 1200));
            this.log(`✅ Comando enviado: ${building.name}`);
            return true;
        } catch (e) {
            this.log('❌ Erro buildViaIframe: ' + e.message);
            return false;
        }
    }

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

    // ---------- Main multivillage loop ----------
    async loopWorker() {
        if (!this.selectedVillagesList || this.selectedVillagesList.length === 0) {
            this.log('⚠️ Nenhuma aldeia marcada — marque ao menos uma para iniciar.');
            this.isRunning = false;
            this.updateStatus();
            return;
        }

        this.log(`🔄 Iniciando execução para ${this.selectedVillagesList.length} aldeias`);
        while (this.isRunning) {
            for (let i = 0; i < this.selectedVillagesList.length; i++) {
                if (!this.isRunning) break;
                const vid = this.selectedVillagesList[i];
                const village = this.myVillages.find(v => v.id === vid) || {id:vid, name: 'Aldeia ' + vid};
                this.log(`🏘️ Processando ${village.name} (${i+1}/${this.selectedVillagesList.length})`);
                // load construction page for this village in iframe
                const buildings = await this.loadConstructionPageForVillage(vid);
                if (!buildings || Object.keys(buildings).length === 0) {
                    this.log(`❌ Não há dados de construção para ${village.name}`);
                    // wait interval and continue
                    await this.sleep(this.settings.multivillageInterval);
                    continue;
                }
                // respect queue slots
                const queueCount = await this.checkQueueStatusForVillage(vid);
                const availableSlots = Math.max(0, this.settings.maxQueueSlots - queueCount);
                if (availableSlots <= 0) {
                    this.log(`⏳ Fila cheia em ${village.name} (${queueCount}/${this.settings.maxQueueSlots})`);
                    await this.sleep(this.settings.multivillageInterval);
                    continue;
                }
                // find next building according to priorities and maxLevels
                const next = this.findNextBuilding(buildings);
                if (next) {
                    // try building (one per village per cycle)
                    const ok = await this.buildViaIframe(next);
                    if (ok) {
                        this.log(`✅ ${next.name} iniciado em ${village.name}`);
                    } else {
                        this.log(`❌ Falha ao iniciar ${next.name} em ${village.name}`);
                    }
                } else {
                    this.log(`📭 Nenhuma construção disponível em ${village.name} (ou todos no nível alvo)`);
                }
                // wait configured interval before next village
                await this.sleep(this.settings.multivillageInterval);
            }
            // After finishing the full list, small pause before repeating full cycle
            await this.sleep(Math.max(1000, Math.floor(this.settings.multivillageInterval / 2)));
        }
        this.log('⏸️ Loop principal finalizado');
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ---------- control API ----------
    start() {
        if (this.isRunning) { this.log('⚠️ Já está rodando'); return; }
        // refresh selected villages from UI if present
        this.saveVillageSelection();
        if (!this.selectedVillagesList || this.selectedVillagesList.length === 0) {
            this.log('❗ Marque ao menos uma aldeia antes de iniciar');
            return;
        }
        this.isRunning = true;
        this.updateStatus();
        this.loopPromise = this.loopWorker(); // don't await, let it run
        this.log('▶️ Auto Builder iniciado (modo global)');
    }

    stop() {
        if (!this.isRunning) { this.log('⚠️ Já está parado'); return; }
        this.isRunning = false;
        this.updateStatus();
        this.log('⏸️ Auto Builder parado pelo usuário');
    }

    toggle() { this.isRunning ? this.stop() : this.start(); }

    updateStatus() {
        const statusText = document.getElementById('builder-status-text');
        const toggleBtn = document.getElementById('twc-toggle-btn');
        if (statusText) statusText.textContent = this.isRunning ? 'Rodando' : 'Parado';
        if (toggleBtn) {
            toggleBtn.textContent = this.isRunning ? '⏸️ Parar' : '▶️ Iniciar';
            toggleBtn.className = `twc-button ${this.isRunning ? 'twc-button-stop' : 'twc-button-start'}`;
        }
    }

    // ---------- Panel toggle functionality ----------
    togglePanel() {
        const panel = document.getElementById('tw-auto-builder-panel');
        if (panel) {
            panel.classList.toggle('tws-hidden');
            this.panelHidden = panel.classList.contains('tws-hidden');
            localStorage.setItem('tw_builder_panel_state', this.panelHidden ? 'hidden' : 'visible');
            this.updateToggleTabText();
        }
    }

    updateToggleTabText() {
        const toggleTab = document.getElementById('tws-toggle-tab');
        if (toggleTab) {
            toggleTab.textContent = this.panelHidden ? 'Abrir' : 'Fechar';
        }
    }

    // ---------- Villages collapse functionality ----------
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

    // ---------- UI / Panel ----------
    createControlPanel() {
        const existing = document.getElementById('tw-auto-builder-panel');
        if (existing) existing.remove();
        this.injectStyles();
        const panel = document.createElement('div');
        panel.id = 'tw-auto-builder-panel';
        panel.className = 'tws-container';
        panel.innerHTML = this.getPanelHTML();
        document.body.appendChild(panel);

        // Initialize panel state
        if (this.panelHidden) {
            panel.classList.add('tws-hidden');
        }
        this.updateToggleTabText();
        this.updateVillagesSection();

        this.renderBuildingsControls();
        this.renderVillageControls();
        
        // button handlers
        document.getElementById('twc-save-btn').onclick = () => {
            this.saveBuildingSettings();
            this.saveVillageSelection();
            // persist interval input if exists
            const iv = document.getElementById('twc-interval-input');
            if (iv) {
                const v = parseInt(iv.value) || this.settings.multivillageInterval / 1000;
                this.settings.multivillageInterval = v * 1000;
                localStorage.setItem('tw_builder_multivillage_interval', String(this.settings.multivillageInterval));
            }
            this.log('💾 Configurações salvas');
        };
        document.getElementById('twc-toggle-btn').onclick = () => this.toggle();
        document.getElementById('twc-markall-btn').onclick = () => { this.markAllVillages(true); };
        document.getElementById('twc-unmarkall-btn').onclick = () => { this.markAllVillages(false); };
        document.getElementById('twc-villages-toggle').onclick = () => this.toggleVillages();
        
        // Panel toggle handler
        document.getElementById('tws-toggle-tab').onclick = () => this.togglePanel();
        
        // interval input change live update
        const iv = document.getElementById('twc-interval-input');
        if (iv) iv.value = String(Math.floor(this.settings.multivillageInterval / 1000));
        this.updateStatus();
    }

    getPanelHTML() {
        return `
            <div class="tws-toggle-tab" id="tws-toggle-tab">${this.panelHidden ? 'Abrir' : 'Fechar'}</div>
            <div class="twc-header">🏹 Construtor Tribal - Global</div>
            <div class="twc-grid">
                <div class="twc-column twc-column-left">
                    <div class="twc-section-title">🏗️ Edifícios (nível alvo)</div>
                    <div id="twc-edificios-controls"></div>
                </div>
                <div class="twc-column twc-column-right">
                    <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <button id="twc-villages-toggle" class="twc-villages-toggle-btn">${this.villagesCollapsed ? '▶️ Aldeias' : '▼ Aldeias'}</button>
                        <div style="display:flex;gap:6px;">
                            <button id="twc-markall-btn" class="twc-button">Marcar todos</button>
                            <button id="twc-unmarkall-btn" class="twc-button">Desmarcar</button>
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
                <div style="display:flex;gap:8px;align-items:center;">
                    <div class="twc-status-item">Status: <strong id="builder-status-text">${this.isRunning ? 'Rodando' : 'Parado'}</strong></div>
                    <div class="twc-status-item">Intervalo(vil): <input id="twc-interval-input" class="twc-input-small" type="number" min="5" value="${Math.floor(this.settings.multivillageInterval/1000)}">s</div>
                </div>
                <div class="twc-buttons">
                    <button id="twc-save-btn" class="twc-button twc-button-start">💾 Salvar</button>
                    <button id="twc-toggle-btn" class="twc-button ${this.isRunning ? 'twc-button-stop' : 'twc-button-start'}">${this.isRunning ? '⏸️ Parar' : '▶️ Iniciar'}</button>
                </div>
            </div>
        `;
    }

    renderBuildingsControls() {
        const container = document.getElementById('twc-edificios-controls');
        if (!container) return;
        
        // Dividir edifícios em duas colunas
        const buildingsArray = Object.entries(this.buildingsList);
        const middleIndex = Math.ceil(buildingsArray.length / 2);
        const firstColumn = buildingsArray.slice(0, middleIndex);
        const secondColumn = buildingsArray.slice(middleIndex);
        
        let html = '<div class="twc-edificios-grid">';
        
        // Primeira coluna
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
        
        // Segunda coluna
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
            .tws-container {
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
            .tws-toggle-tab {
                position: absolute; left: -28px; top: 40%;
                background: #5c3a1e; border: 2px solid #654321; border-right: none;
                border-radius: 6px 0 0 6px; padding: 6px 4px; font-size: 14px;
                color: #ffd700; cursor: pointer; writing-mode: vertical-rl;
                text-orientation: mixed; user-select: none; box-shadow: -2px 0 6px rgba(0,0,0,0.5);
            }
            .tws-toggle-tab:hover { background: #7b5124; }
            .tws-hidden { transform: translateX(100%); }
            
            .twc-header{text-align:center;font-size:16px;font-weight:bold;padding:8px;margin-bottom:8px;}
            .twc-grid{display:grid;grid-template-columns:1fr 340px;gap:12px;align-items:start;}
            .twc-column{background:rgba(255,255,255,0.02);border-radius:8px;padding:10px;border:1px solid rgba(0,0,0,0.25);}
            .twc-section-title{font-weight:bold;color:#ffd700;margin-bottom:8px;font-size:13px;}
            
            /* Layout de duas colunas para edifícios */
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
            .twc-button{padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,0.35);font-weight:bold;cursor:pointer;color:#f5deb3;background:linear-gradient(135deg,#7a4a20,#5a3215);font-size:12px;}
            .twc-button-start{background:linear-gradient(135deg,#2e8b57,#3cb371);}
            .twc-button-stop{background:linear-gradient(135deg,#b22222,#dc143c);}
            .twc-log-area{margin-top:12px;}
            .twc-log-container{max-height:150px;overflow:auto;background:rgba(0,0,0,0.18);padding:8px;border-radius:6px;font-family:monospace;font-size:12px;}
            .twc-log-entry{margin-bottom:6px;padding:6px;border-radius:6px;background:rgba(255,255,255,0.02);}
            .scrollbar-custom::-webkit-scrollbar{width:8px;}
            .scrollbar-custom::-webkit-scrollbar-thumb{background:rgba(120,80,40,0.7);border-radius:6px;}
            input[type="checkbox"]{accent-color:#c08b4b;transform:scale(1.05);}
        `;
        document.head.appendChild(style);
    }
}

// instantiate and expose
const builder = new TWAutoBuilder();
window.builder = builder;
