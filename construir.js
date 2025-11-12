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
            return '<div style="color: #f39c12; font-size: 11px;">Carregando aldeias...</div>';
        }

        if (this.myVillages.length === 0) {
            return '<div style="color: #e74c3c; font-size: 11px;">Nenhuma aldeia encontrada</div>';
        }

        let html = `
            <div style="margin-bottom: 10px;">
                <label style="display: block; font-weight: bold; margin-bottom: 5px; color: #3498db;">🏘️ Aldeia para Construir:</label>
                <select id="village-selector" style="
                    width: 100%; 
                    padding: 6px 8px; 
                    border: 1px solid #34495e; 
                    background: #2c3e50; 
                    color: white; 
                    border-radius: 4px; 
                    font-size: 11px;
                    cursor: pointer;
                " onchange="window.builder.changeVillage(this.value)">
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

        const panel = document.createElement('div');
        panel.id = 'tw-auto-builder-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 50px;
                right: 20px;
                width: 450px;
                background: #2c3e50;
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: Arial;
                font-size: 12px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-height: 90vh;
                overflow-y: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong>🏗️ TW Building Controller</strong>
                    <button onclick="window.builder.toggle()" style="padding: 4px 8px; font-size: 10px; cursor: pointer;">
                        ${this.isRunning ? '⏸️ Parar' : '▶️ Iniciar'}
                    </button>
                </div>
                
                <!-- SELETOR DE ALDEIAS -->
                ${this.createVillageSelector()}
                
                <!-- BOTÃO SALVAR -->
                <div style="margin-bottom: 10px;">
                    <button onclick="window.builder.saveVillageSettings()" style="
                        width: 100%; 
                        padding: 8px 12px; 
                        background: #27ae60; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        font-size: 12px; 
                        cursor: pointer;
                        font-weight: bold;
                    ">💾 Salvar Configurações para esta Aldeia</button>
                </div>
                
                <!-- CONFIGURAÇÕES GERAIS -->
                <div style="background: #34495e; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                    <div style="display: flex; gap: 15px; margin-bottom: 8px;">
                        <label style="display: flex; align-items: center;">
                            <input type="checkbox" ${this.settings.enabled ? 'checked' : ''} 
                                   onchange="window.builder.settings.enabled = this.checked"> Ativado
                        </label>
                        <label style="display: flex; align-items: center;">
                            <input type="checkbox" ${this.settings.allowQueue ? 'checked' : ''} 
                                   onchange="window.builder.settings.allowQueue = this.checked"> Permitir fila
                        </label>
                    </div>
                    <div style="display: flex; gap: 15px;">
                        <label style="display: flex; align-items: center;">
                            Slots: <input type="number" value="${this.settings.maxQueueSlots}" min="1" max="10"
                                   style="width: 40px; padding: 2px; margin-left: 5px;" 
                                   onchange="window.builder.settings.maxQueueSlots = parseInt(this.value)">
                        </label>
                        <label style="display: flex; align-items: center;">
                            Check: <input type="number" value="${this.settings.checkInterval / 1000}" 
                                   style="width: 40px; padding: 2px; margin-left: 5px;" 
                                   onchange="window.builder.settings.checkInterval = this.value * 1000">s
                        </label>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 8px;">
                        <button onclick="window.builder.toggleAllBuildings(true)" style="padding: 4px 8px; font-size: 10px; background: #27ae60; border: none; color: white; border-radius: 4px; cursor: pointer;">✅ Ativar Todos</button>
                        <button onclick="window.builder.toggleAllBuildings(false)" style="padding: 4px 8px; font-size: 10px; background: #e74c3c; border: none; color: white; border-radius: 4px; cursor: pointer;">❌ Desativar Todos</button>
                    </div>
                </div>
                
                <!-- LISTA DE EDIFFÍCIOS -->
                <div style="background: #34495e; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #3498db;">🏗️ Edifícios para Construir:</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; max-height: 200px; overflow-y: auto;">
                        ${Object.entries(this.buildingsList).map(([id, name]) => `
                            <label style="display: flex; align-items: center; padding: 3px 5px; border-radius: 3px; background: rgba(255,255,255,0.1);">
                                <input type="checkbox" id="tw-build-${id}" 
                                       ${this.settings.enabledBuildings[id] !== false ? 'checked' : ''}
                                       onchange="window.builder.saveBuildingSettings()">
                                <span style="margin-left: 6px; font-size: 11px;">${name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <!-- STATUS -->
                <div style="background: #34495e; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                    <div id="builder-status" style="font-size: 11px; color: #ecf0f1; margin-bottom: 5px;">
                        Status: ${this.isRunning ? '🟢 Rodando' : '🔴 Parado'}
                    </div>
                    
                    <div id="builder-action" style="font-size: 11px; margin: 5px 0; color: #3498db;">
                        Ação: <span id="current-action">Pronto</span>
                    </div>
                    
                    <div id="builder-last-build" style="font-size: 11px; margin: 5px 0; color: #f39c12;">
                        Última: <span id="last-build-info">Nenhuma</span>
                    </div>
                </div>
                
                <!-- LOGS -->
                <div style="background: #34495e; padding: 10px; border-radius: 6px;">
                    <div style="font-weight: bold; margin-bottom: 5px; color: #3498db;">📜 Logs:</div>
                    <div id="builder-logs" style="max-height: 150px; overflow-y: auto; font-size: 10px; background: #2c3e50; padding: 5px; border-radius: 4px;"></div>
                </div>
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

    // Função para atualizar o seletor de aldeias após carregamento
    updateVillageSelector() {
        const villageContainer = document.querySelector('#tw-auto-builder-panel div:has(#village-selector)');
        if (villageContainer && this.villagesLoaded) {
            villageContainer.outerHTML = this.createVillageSelector();
        }
    }

    log(message) {
        const logs = document.getElementById('builder-logs');
        if (logs) {
            const timestamp = new Date().toLocaleTimeString();
            logs.innerHTML = `<div>[${timestamp}] ${message}</div>` + logs.innerHTML;
            
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
        const button = document.querySelector('#tw-auto-builder-panel button');
        
        if (status) {
            status.innerHTML = `Status: ${this.isRunning ? '🟢 Rodando' : '🔴 Parado'}`;
        }
        if (button) {
            button.textContent = this.isRunning ? '⏸️ Parar' : '▶️ Iniciar';
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
