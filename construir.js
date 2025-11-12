// ==UserScript==
// TW Auto Builder - IFRAME VERSION WITH BUILDING CONTROLS - FIXED
// ==/UserScript==

class TWAutoBuilder {
    constructor() {
        // PRIMEIRO definir buildingsList ANTES de qualquer outro uso
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

        // DEPOIS as settings que dependem do buildingsList
        this.settings = {
            enabled: true,
            checkInterval: 45000,
            priorityBuildings: Object.keys(this.buildingsList), // Usa as chaves do buildingsList
            maxLevels: {
                'main': 30, 'farm': 30, 'storage': 30, 
                'wood': 30, 'stone': 30, 'iron': 30,
                'barracks': 25, 'stable': 20, 'market': 25, 
                'smith': 20, 'wall': 20, 'garage': 15,
                'hide': 10, 'snob': 1, 'church': 3,
                'watchtower': 20, 'place': 1, 'statue': 1
            },
            allowQueue: true,
            maxQueueSlots: 5,
            enabledBuildings: {}, // Será preenchido no loadBuildingSettings
            selectedVillage: null // Aldeia selecionada no dropdown
        };
        
        this.isRunning = false;
        this.intervalId = null;
        this.currentVillageId = this.getCurrentVillageId();
        this.iframe = null;
        this.myVillages = []; // Array para armazenar as aldeias do jogador
        this.villagesLoaded = false; // Flag para controlar se as aldeias foram carregadas
        
        this.init();
    }

    async init() {
        console.log('🏗️ TW Auto Builder - CONTROLE DE EDIFFÍCIOS iniciado!');
        this.createIframe();
        this.loadBuildingSettings(); // CARREGAR ANTES de criar o painel
        
        // AGORA carregamos as aldeias ANTES de criar o painel
        await this.loadMyVillages();
        
        this.createControlPanel();
        this.start();
    }

    // CARREGAR ALDEIAS DO JOGADOR
    async loadMyVillages() {
        try {
            // Buscar dados do jogador
            const playerId = game_data.player.id;
            
            // Fazer requisição para o arquivo de aldeias
            const response = await fetch('/map/village.txt');
            const data = await response.text();
            
            // Processar as aldeias
            const allVillages = data.trim().split('\n').map(line => {
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
            });
            
            // Filtrar apenas as aldeias do jogador atual
            this.myVillages = allVillages
                .filter(village => village.player === playerId)
                .sort((a, b) => {
                    // Ordenar por nome
                    const nameA = a.name.toLowerCase();
                    const nameB = b.name.toLowerCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                    return 0;
                });
            
            this.villagesLoaded = true;
            console.log(`🏘️ ${this.myVillages.length} aldeias próprias carregadas`);
            
        } catch (error) {
            console.error('❌ Erro ao carregar aldeias:', error);
            this.myVillages = [];
            this.villagesLoaded = true;
        }
    }

    // CRIAR DROPDOWN DE ALDEIAS
    createVillageSelector() {
        if (!this.villagesLoaded) {
            return '<div class="twc-log-entry log-warning">Carregando aldeias...</div>';
        }

        if (this.myVillages.length === 0) {
            return '<div class="twc-log-entry log-error">Nenhuma aldeia encontrada</div>';
        }

        let html = `
            <div class="twc-controls-section">
                <div class="twc-section-title">🏘️ Aldeia para Construir</div>
                <select id="village-selector" class="twc-select" onchange="window.builder.changeVillage(this.value)">
                    <option value="">-- Selecione uma aldeia --</option>
        `;

        // Adicionar opções para cada aldeia
        this.myVillages.forEach(village => {
            const isSelected = this.settings.selectedVillage === village.id || 
                              (!this.settings.selectedVillage && village.id === this.currentVillageId);
            
            html += `
                <option value="${village.id}" ${isSelected ? 'selected' : ''}>
                    ${village.name} (${village.x}|${village.y}) - ${village.points.toLocaleString()} pontos
                </option>
            `;
        });

        html += `</select></div>`;

        return html;
    }

    // MUDAR ALDEIA SELECIONADA
    changeVillage(villageId) {
        if (!villageId) return;
        
        const village = this.myVillages.find(v => v.id == villageId);
        if (village) {
            this.settings.selectedVillage = village.id;
            this.currentVillageId = village.id;
            
            // Salvar configuração
            localStorage.setItem('tw_builder_selected_village', villageId);
            
            // Carregar configurações específicas da aldeia
            this.loadVillageSettings();
            
            this.log(`🏘️ Aldeia alterada para: ${village.name} (${village.x}|${village.y})`);
            
            // Recarregar a página de construção para a nova aldeia
            if (this.isRunning) {
                this.checkAndBuild();
            }
        }
    }

    // SALVAR CONFIGURAÇÕES ESPECÍFICAS DA ALDEIA
    saveVillageSettings() {
        if (!this.currentVillageId) {
            this.log('❌ Nenhuma aldeia selecionada para salvar');
            return;
        }

        const villageSettings = {
            enabledBuildings: {...this.settings.enabledBuildings},
            maxLevels: {...this.settings.maxLevels},
            priorityBuildings: [...this.settings.priorityBuildings],
            allowQueue: this.settings.allowQueue,
            maxQueueSlots: this.settings.maxQueueSlots
        };

        localStorage.setItem(`tw_builder_village_${this.currentVillageId}`, JSON.stringify(villageSettings));
        
        const village = this.myVillages.find(v => v.id === this.currentVillageId);
        this.log(`💾 Configurações salvas para: ${village ? village.name : 'Aldeia ' + this.currentVillageId}`);
    }

    // CARREGAR CONFIGURAÇÕES ESPECÍFICAS DA ALDEIA
    loadVillageSettings() {
        if (!this.currentVillageId) return;

        const savedSettings = localStorage.getItem(`tw_builder_village_${this.currentVillageId}`);
        
        if (savedSettings) {
            try {
                const villageSettings = JSON.parse(savedSettings);
                
                // Atualizar configurações com as salvas para esta aldeia
                if (villageSettings.enabledBuildings) {
                    this.settings.enabledBuildings = {...villageSettings.enabledBuildings};
                }
                if (villageSettings.maxLevels) {
                    this.settings.maxLevels = {...villageSettings.maxLevels};
                }
                if (villageSettings.priorityBuildings) {
                    this.settings.priorityBuildings = [...villageSettings.priorityBuildings];
                }
                if (villageSettings.allowQueue !== undefined) {
                    this.settings.allowQueue = villageSettings.allowQueue;
                }
                if (villageSettings.maxQueueSlots !== undefined) {
                    this.settings.maxQueueSlots = villageSettings.maxQueueSlots;
                }

                // Atualizar checkboxes na interface
                this.updateBuildingCheckboxes();
                
                const village = this.myVillages.find(v => v.id === this.currentVillageId);
                this.log(`📂 Configurações carregadas para: ${village ? village.name : 'Aldeia ' + this.currentVillageId}`);
                
            } catch (error) {
                console.error('❌ Erro ao carregar configurações da aldeia:', error);
            }
        } else {
            // Se não há configurações salvas para esta aldeia, usar padrão
            this.loadBuildingSettings();
            this.log('⚙️ Usando configurações padrão para esta aldeia');
        }
    }

    // ATUALIZAR CHECKBOXES NA INTERFACE
    updateBuildingCheckboxes() {
        Object.keys(this.buildingsList).forEach(buildingId => {
            const checkbox = document.querySelector(`#tw-build-${buildingId}`);
            if (checkbox) {
                checkbox.checked = this.settings.enabledBuildings[buildingId] !== false;
            }
        });
    }

    getCurrentVillageId() {
        // Primeiro tenta pegar da configuração salva
        const savedVillage = localStorage.getItem('tw_builder_selected_village');
        if (savedVillage) {
            return parseInt(savedVillage);
        }
        
        // Se não tiver salvo, pega da URL atual
        const url = window.location.href;
        const match = url.match(/village=(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    createIframe() {
        const existingIframe = document.getElementById('tw-builder-iframe');
        if (existingIframe) existingIframe.remove();

        this.iframe = document.createElement('iframe');
        this.iframe.id = 'tw-builder-iframe';
        this.iframe.style.cssText = `
            position: fixed;
            width: 1px;
            height: 1px;
            border: none;
            opacity: 0;
            pointer-events: none;
            z-index: -9999;
        `;
        document.body.appendChild(this.iframe);
    }

    // Carrega configurações salvas dos edifícios (padrão)
    loadBuildingSettings() {
        // Inicializa todos como true (ativados) por padrão
        Object.keys(this.buildingsList).forEach(buildingId => {
            const saved = localStorage.getItem(`tw_build_${buildingId}`);
            // Se não existe configuração salva, default é true
            this.settings.enabledBuildings[buildingId] = saved === null ? true : saved !== 'false';
        });
        
        console.log('✅ Configurações padrão carregadas:', this.settings.enabledBuildings);
    }

    // Salva configurações dos edifícios (para aldeia atual)
    saveBuildingSettings() {
        Object.keys(this.buildingsList).forEach(buildingId => {
            const checkbox = document.querySelector(`#tw-build-${buildingId}`);
            if (checkbox) {
                this.settings.enabledBuildings[buildingId] = checkbox.checked;
            }
        });
        
        // Salvar automaticamente as configurações para a aldeia atual
        this.saveVillageSettings();
    }

    async loadConstructionPage() {
        if (!this.currentVillageId) {
            this.log('❌ Não consegui detectar ID da vila');
            return null;
        }

        return new Promise((resolve) => {
            this.iframe.onload = () => {
                try {
                    const doc = this.iframe.contentDocument;
                    const buildings = this.parseBuildingsFromIframe(doc);
                    resolve(buildings);
                } catch (error) {
                    this.log(`❌ Erro ao carregar iframe: ${error.message}`);
                    resolve(null);
                }
            };

            this.iframe.onerror = () => {
                this.log('❌ Erro ao carregar página de construção');
                resolve(null);
            };

            this.iframe.src = `/game.php?village=${this.currentVillageId}&screen=main`;
        });
    }

    parseBuildingsFromIframe(doc) {
        const buildings = {};

        const rows = doc.querySelectorAll('tr[id^="main_buildrow_"]');
        
        rows.forEach(row => {
            try {
                const buildingId = row.id.replace('main_buildrow_', '');
                
                // Só processa se o edifício está na nossa lista
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
                    button_element: buildButton,
                    enabled: this.settings.enabledBuildings[buildingId] !== false
                };

            } catch (error) {
                this.log(`Erro ao analisar ${buildingId}: ${error.message}`);
            }
        });

        this.log(`📊 ${Object.keys(buildings).length} edifícios carregados`);
        return buildings;
    }

    extractLevel(levelText) {
        if (!levelText) return 0;
        if (levelText.includes('não construído')) return 0;
        const match = levelText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }

    async checkQueueStatus() {
        try {
            await this.loadConstructionPage();
            const doc = this.iframe.contentDocument;
            const queueItems = doc.querySelectorAll('#buildqueue tr.lit, .build_order');
            return queueItems.length;
        } catch (error) {
            const queueItems = document.querySelectorAll('#buildqueue tr.lit, .build_order');
            return queueItems.length;
        }
    }

    async buildViaIframe(building) {
        if (!building.build_link) {
            this.log(`❌ Sem link para ${building.name}`);
            return false;
        }

        try {
            this.log(`🏗️ Construindo: ${building.name} nível ${building.level + 1}`);
            
            this.iframe.onload = () => {
                this.log(`✅ Construção concluída: ${building.name}`);
            };

            this.iframe.src = building.build_link;
            await new Promise(resolve => setTimeout(resolve, 3000));
            return true;
            
        } catch (error) {
            this.log(`❌ Erro: ${error.message}`);
            return false;
        }
    }

    async checkAndBuild() {
        if (!this.settings.enabled) return;

        this.updateAction('🔄 Verificando...');
        
        const currentQueue = await this.checkQueueStatus();
        const availableSlots = Math.max(0, this.settings.maxQueueSlots - currentQueue);
        
        if (availableSlots <= 0) {
            this.updateAction(`⏳ Fila cheia (${currentQueue}/${this.settings.maxQueueSlots})`);
            return;
        }

        this.updateAction('🌐 Carregando construções...');
        const buildings = await this.loadConstructionPage();
        
        if (!buildings || Object.keys(buildings).length === 0) {
            this.updateAction('❌ Sem dados');
            return;
        }

        const nextBuilding = this.findNextBuilding(buildings);
        
        if (nextBuilding) {
            this.updateAction(`🎯 ${nextBuilding.name} nível ${nextBuilding.level + 1}`);
            
            const success = await this.buildViaIframe(nextBuilding);
            
            if (success) {
                this.updateAction(`✅ ${nextBuilding.name} iniciada`);
                this.updateLastBuild(nextBuilding.name, nextBuilding.level + 1);
            } else {
                this.updateAction(`❌ Falha`);
            }
        } else {
            this.updateAction('📭 Nenhuma construção');
            this.log('📭 Nenhuma construção disponível');
        }
    }

    findNextBuilding(buildings) {
        for (const buildingId of this.settings.priorityBuildings) {
            const building = buildings[buildingId];
            if (!building) continue;
            
            // Verifica se o edifício está habilitado
            if (!building.enabled) {
                this.log(`⏭️ ${building.name} desativado nos controles`);
                continue;
            }
            
            const maxLevel = this.settings.maxLevels[buildingId];
            const currentLevel = building.level || 0;
            
            if (currentLevel >= maxLevel) {
                this.log(`✅ ${building.name} no nível máximo (${currentLevel})`);
                continue;
            }

            const canBuild = building.can_build || (this.settings.allowQueue && building.can_queue);
            
            if (canBuild && building.build_link) {
                this.log(`🎯 ${building.name} nível ${currentLevel} → ${currentLevel + 1}`);
                return building;
            } else {
                this.log(`⏳ ${building.name} - ${building.error || 'indisponível'}`);
            }
        }
        return null;
    }

    createControlPanel() {
        const existingPanel = document.getElementById('tw-auto-builder-panel');
        if (existingPanel) existingPanel.remove();

        // VERIFICA se buildingsList existe antes de usar
        if (!this.buildingsList) {
            console.error('❌ buildingsList não definido!');
            return;
        }

        // Adicionar CSS do tema Tribal Wars
        this.injectStyles();

        const panel = document.createElement('div');
        panel.id = 'tw-auto-builder-panel';
        panel.className = 'twc-tribal-theme';
        panel.innerHTML = `
            <div class="twc-header">🏹 Construtor Tribal</div>
            
            <!-- SELETOR DE ALDEIAS -->
            ${this.createVillageSelector()}
            
            <!-- BOTÃO SALVAR -->
            <div class="twc-controls-section">
                <button onclick="window.builder.saveVillageSettings()" class="twc-button twc-button-start">
                    💾 Salvar Configurações para esta Aldeia
                </button>
            </div>
            
            <!-- CONFIGURAÇÕES GERAIS -->
            <div class="twc-controls-section">
                <div class="twc-section-title">⚙️ Configurações Gerais</div>
                <div class="twc-input-group">
                    <label>
                        <input type="checkbox" ${this.settings.enabled ? 'checked' : ''} 
                               onchange="window.builder.settings.enabled = this.checked"> Ativado
                    </label>
                    <label>
                        <input type="checkbox" ${this.settings.allowQueue ? 'checked' : ''} 
                               onchange="window.builder.settings.allowQueue = this.checked"> Permitir fila
                    </label>
                </div>
                <div class="twc-input-group">
                    <label>
                        Slots: <input type="number" value="${this.settings.maxQueueSlots}" min="1" max="10"
                               class="twc-input-small" 
                               onchange="window.builder.settings.maxQueueSlots = parseInt(this.value)">
                    </label>
                    <label>
                        Check: <input type="number" value="${this.settings.checkInterval / 1000}" 
                               class="twc-input-small" 
                               onchange="window.builder.settings.checkInterval = this.value * 1000">s
                    </label>
                </div>
                <div class="twc-buttons">
                    <button onclick="window.builder.toggleAllBuildings(true)" class="twc-button twc-button-start">✅ Ativar Todos</button>
                    <button onclick="window.builder.toggleAllBuildings(false)" class="twc-button twc-button-stop">❌ Desativar Todos</button>
                </div>
            </div>
            
            <!-- LISTA DE EDIFFÍCIOS -->
            <div class="twc-controls-section">
                <div class="twc-section-title">🏗️ Edifícios para Construir</div>
                <div id="twc-edificios" class="scrollbar-custom">
                    ${Object.entries(this.buildingsList).map(([id, name]) => `
                        <label>
                            <input type="checkbox" id="tw-build-${id}" 
                                   ${this.settings.enabledBuildings[id] !== false ? 'checked' : ''}
                                   onchange="window.builder.saveBuildingSettings()">
                            ${name}
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <!-- STATUS -->
            <div class="twc-controls-section">
                <div class="twc-section-title">📊 Status</div>
                <div id="builder-status" class="twc-status-item">
                    Status: ${this.isRunning ? '🟢 Rodando' : '🔴 Parado'}
                </div>
                
                <div id="builder-action" class="twc-status-item">
                    Ação: <span id="current-action">Pronto</span>
                </div>
                
                <div id="builder-last-build" class="twc-status-item">
                    Última: <span id="last-build-info">Nenhuma</span>
                </div>
                
                <div class="twc-buttons">
                    <button id="toggle-button" onclick="window.builder.toggle()" class="twc-button ${this.isRunning ? 'twc-button-stop' : 'twc-button-start'}">
                        ${this.isRunning ? '⏸️ Parar' : '▶️ Iniciar'}
                    </button>
                </div>
            </div>
            
            <!-- LOGS -->
            <div class="twc-controls-section">
                <div class="twc-section-title">📜 Logs</div>
                <div id="builder-logs" class="twc-log-container scrollbar-custom"></div>
            </div>
        `;

        document.body.appendChild(panel);
        
        // Carregar configurações da aldeia atual
        this.loadVillageSettings();
        
        // Atualizar o seletor se as aldeias ainda não estavam carregadas
        if (!this.villagesLoaded) {
            setTimeout(() => {
                this.updateVillageSelector();
            }, 1000);
        }
    }

    // INJETAR CSS DO TEMA
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
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

            #tw-auto-builder-panel {
                position: fixed;
                top: 50px;
                right: 20px;
                width: 450px;
                background: linear-gradient(145deg, var(--color-dark), #2c1e17);
                color: var(--color-light);
                border: 3px solid var(--color-accent);
                font-family: 'Trebuchet MS', sans-serif;
                font-size: 13px;
                padding: 15px;
                z-index: 10000;
                border-radius: var(--border-radius);
                box-shadow: var(--shadow);
                max-height: 90vh;
                overflow-y: auto;
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
                font-size: 11px;
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
                gap: 15px;
                margin: 8px 0;
                flex-wrap: wrap;
            }

            .twc-input-group label {
                display: flex;
                align-items: center;
                gap: 5px;
                font-weight: bold;
                color: var(--color-accent);
                font-size: 12px;
            }

            .twc-input-small {
                width: 40px;
                text-align: center;
                background: var(--color-dark);
                border: 1px solid var(--color-primary);
                color: var(--color-light);
                border-radius: 4px;
                padding: 4px;
            }

            .twc-select {
                width: 100%;
                padding: 6px 8px;
                background: var(--color-dark);
                border: 1px solid var(--color-primary);
                color: var(--color-light);
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
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

            .twc-status-item {
                font-size: 11px;
                margin: 5px 0;
                padding: 4px 8px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                border-left: 3px solid var(--color-accent);
            }

            .twc-log-container {
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

            .twc-log-entry {
                margin: 2px 0;
                padding: 2px 4px;
                border-radius: 3px;
                font-size: 10px;
            }

            .log-success { background: rgba(143, 188, 143, 0.2); }
            .log-warning { background: rgba(218, 165, 32, 0.2); }
            .log-error { background: rgba(205, 92, 92, 0.2); }
            .log-info { background: rgba(205, 133, 63, 0.2); }

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
        document.head.appendChild(style);
    }

    // Função para atualizar o seletor de aldeias após carregamento
    updateVillageSelector() {
        const villageContainer = document.querySelector('#tw-auto-builder-panel .twc-controls-section:has(#village-selector)');
        if (villageContainer && this.villagesLoaded) {
            villageContainer.outerHTML = this.createVillageSelector();
        }
    }

    log(message) {
        const logs = document.getElementById('builder-logs');
        if (logs) {
            const timestamp = new Date().toLocaleTimeString();
            let type = 'info';
            if (message.includes('✅') || message.includes('sucesso')) type = 'success';
            if (message.includes('❌') || message.includes('Erro')) type = 'error';
            if (message.includes('⚠️') || message.includes('atenção')) type = 'warning';
            
            logs.innerHTML = `<div class="twc-log-entry log-${type}">[${timestamp}] ${message}</div>` + logs.innerHTML;
            
            const logEntries = logs.getElementsByTagName('div');
            if (logEntries.length > 15) {
                logs.removeChild(logEntries[logEntries.length - 1]);
            }
        }
        console.log(`🏗️ ${message}`);
    }

    updateAction(message) {
        const actionElement = document.getElementById('current-action');
        if (actionElement) {
            actionElement.textContent = message;
        }
    }

    updateLastBuild(buildingName, level) {
        const lastBuildElement = document.getElementById('last-build-info');
        if (lastBuildElement) {
            lastBuildElement.textContent = `${buildingName} nível ${level}`;
            setTimeout(() => {
                if (lastBuildElement.textContent.includes(buildingName)) {
                    lastBuildElement.textContent = 'Nenhuma';
                }
            }, 30000);
        }
    }

    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
        this.updateStatus();
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            if (this.settings.enabled) {
                this.checkAndBuild();
            }
        }, this.settings.checkInterval);
        
        this.log('✅ Auto Builder iniciado');
        this.updateStatus();
        this.updateAction('Monitorando...');
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.log('⏸️ Auto Builder parado');
        this.updateStatus();
        this.updateAction('Parado');
    }

    updateStatus() {
        const status = document.getElementById('builder-status');
        const button = document.getElementById('toggle-button');
        
        if (status) {
            status.innerHTML = `Status: ${this.isRunning ? '🟢 Rodando' : '🔴 Parado'}`;
        }
        if (button) {
            button.textContent = this.isRunning ? '⏸️ Parar' : '▶️ Iniciar';
            button.className = this.isRunning ? 'twc-button twc-button-stop' : 'twc-button twc-button-start';
        }
    }

    // Comando para selecionar/deselecionar todos
    toggleAllBuildings(enable) {
        Object.keys(this.buildingsList).forEach(buildingId => {
            const checkbox = document.querySelector(`#tw-build-${buildingId}`);
            if (checkbox) {
                checkbox.checked = enable;
            }
        });
        this.saveBuildingSettings();
        this.log(enable ? '✅ Todos edifícios ativados' : '❌ Todos edifícios desativados');
    }
}

// Inicializa o auto builder
const builder = new TWAutoBuilder();

console.log(`
🏗️ TW Auto Builder - CONTROLE COMPLETO
✅ Controle individual de cada edifício
✅ Funciona em qualquer tela
✅ Configurações salvas automaticamente
✅ Seletor de aldeias próprias
✅ Configurações específicas por aldeia

Comandos:
- builder.start()/builder.stop()
- builder.toggleAllBuildings(true) - Ativar todos
- builder.toggleAllBuildings(false) - Desativar todos
- builder.saveVillageSettings() - Salvar configurações
- builder.settings.maxQueueSlots = 5
`);

window.builder = builder;
