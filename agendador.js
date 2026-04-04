// ==UserScript==
// @name         Tribal Wars - Agendador de Ataques (Ultimate)
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Agende ataques com precisão - VERSÃO ULTIMATE COM REPETIR IMEDIATO
// @author       Você
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONSTANTES - NOMES CORRETOS DAS UNIDADES EM PORTUGUÊS BR
    // ============================================
    const TROOP_LIST = [
        { id: 'spear', nome: 'Lanceiro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_spear.png' },
        { id: 'sword', nome: 'Espadachim', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_sword.png' },
        { id: 'axe', nome: 'Bárbaro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_axe.png' },
        { id: 'archer', nome: 'Arqueiro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_archer.png' },
        { id: 'spy', nome: 'Explorador', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_spy.png' },
        { id: 'light', nome: 'Cavalaria leve', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_light.png' },
        { id: 'marcher', nome: 'Arqueiro a cavalo', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_marcher.png' },
        { id: 'heavy', nome: 'Cavalaria pesada', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_heavy.png' },
        { id: 'ram', nome: 'Aríete', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_ram.png' },
        { id: 'catapult', nome: 'Catapulta', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_catapult.png' },
        { id: 'knight', nome: 'Paladino', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_knight.png' },
        { id: 'snob', nome: 'Nobre', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_snob.png' }
    ];
    const TROOP_IDS = TROOP_LIST.map(t => t.id);
    const TROOP_ICONS = Object.fromEntries(TROOP_LIST.map(t => [t.id, t.icon]));
    const TROOP_NAMES = Object.fromEntries(TROOP_LIST.map(t => [t.id, t.nome]));

    const world = location.hostname.split('.')[0];
    const VILLAGE_TXT_URL = `https://${world}.tribalwars.com.br/map/village.txt`;
    let _villageMap = {};

    // Chaves para localStorage
    const FORM_DATA_KEY = 'tws_form_data_v5';
    const ATTACKS_KEY = 'tws_ataques_v6';
    const TEMPLATES_KEY = 'tws_templates_v2';

    // ============================================
    // SISTEMA DE EVENTOS
    // ============================================
    const EventSystem = {
        _events: {},
        on: function(event, callback) {
            if (!this._events[event]) this._events[event] = [];
            this._events[event].push(callback);
            return this;
        },
        off: function(event, callback) {
            if (!this._events[event]) return this;
            if (!callback) {
                delete this._events[event];
            } else {
                const index = this._events[event].indexOf(callback);
                if (index > -1) this._events[event].splice(index, 1);
            }
            return this;
        },
        trigger: function(event, data) {
            if (!this._events[event]) return this;
            this._events[event].forEach(callback => callback(data));
            return this;
        }
    };

    // ============================================
    // FORMATTAÇÃO
    // ============================================
    const Format = {
        number: function(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        },
        timeSpan: function(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },
        date: function(timestamp) {
            const d = new Date(timestamp);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
        }
    };

    // ============================================
    // MENSAGENS TOAST
    // ============================================
    const Toast = {
        _container: null,
        _getContainer: function() {
            if (!this._container) {
                this._container = document.createElement('div');
                this._container.id = 'tws-toast-container';
                this._container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 100000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                document.body.appendChild(this._container);
            }
            return this._container;
        },
        _show: function(message, type, duration = 3000) {
            const toast = document.createElement('div');
            toast.className = `tws-toast tws-toast-${type}`;
            toast.style.cssText = `
                background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#ff9800'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-family: Arial, sans-serif;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                animation: slideInRight 0.3s ease;
                cursor: pointer;
            `;
            toast.innerHTML = message;
            toast.onclick = () => toast.remove();
            this._getContainer().appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },
        success: function(message, duration) { this._show(message, 'success', duration); },
        error: function(message, duration) { this._show(message, 'error', duration); },
        info: function(message, duration) { this._show(message, 'info', duration); }
    };

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // ============================================
    // CAIXA DE CONFIRMAÇÃO
    // ============================================
    const ConfirmationBox = {
        show: function(message, onConfirm, onCancel) {
            const fader = document.createElement('div');
            fader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 100001;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            const box = document.createElement('div');
            box.style.cssText = `
                background: #2a2a2a;
                border-radius: 10px;
                padding: 20px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 5px 25px rgba(0,0,0,0.3);
                border: 1px solid #ff9900;
            `;
            box.innerHTML = `
                <p style="color: #fff; margin-bottom: 20px; font-size: 14px;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="tws-confirm-no" style="background: #555; color: #fff; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Não</button>
                    <button id="tws-confirm-yes" style="background: #ff9900; color: #1a1a1a; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; font-weight: bold;">Sim</button>
                </div>
            `;
            fader.appendChild(box);
            document.body.appendChild(fader);
            document.getElementById('tws-confirm-yes').onclick = () => { fader.remove(); if (onConfirm) onConfirm(); };
            document.getElementById('tws-confirm-no').onclick = () => { fader.remove(); if (onCancel) onCancel(); };
        }
    };

    // ============================================
    // TOOLTIP
    // ============================================
    const Tooltip = {
        init: function() {
            document.addEventListener('mouseover', (e) => {
                const target = e.target.closest('[data-tooltip]');
                if (target) this.show(target, target.getAttribute('data-tooltip'));
            });
            document.addEventListener('mouseout', (e) => {
                const target = e.target.closest('[data-tooltip]');
                if (target) this.hide();
            });
        },
        show: function(element, text) {
            this.hide();
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'tws-tooltip';
            this.tooltip.style.cssText = `
                position: absolute;
                background: #333;
                color: #ff9900;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 100002;
                white-space: nowrap;
                border: 1px solid #ff9900;
            `;
            this.tooltip.textContent = text;
            document.body.appendChild(this.tooltip);
            const rect = element.getBoundingClientRect();
            this.tooltip.style.left = rect.left + (rect.width / 2) - (this.tooltip.offsetWidth / 2) + 'px';
            this.tooltip.style.top = rect.top - this.tooltip.offsetHeight - 5 + 'px';
        },
        hide: function() {
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }
        }
    };

    // ============================================
    // LOADING INDICATOR
    // ============================================
    const LoadingIndicator = {
        _element: null,
        show: function() {
            if (!this._element) {
                this._element = document.createElement('div');
                this._element.id = 'tws-loading';
                this._element.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.8);
                    color: #ff9900;
                    padding: 20px 30px;
                    border-radius: 10px;
                    z-index: 100003;
                    font-size: 16px;
                    font-weight: bold;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                `;
                this._element.innerHTML = '<div class="tws-spinner"></div> Enviando ataque...';
                document.body.appendChild(this._element);
                const spinnerStyle = document.createElement('style');
                spinnerStyle.textContent = `
                    .tws-spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid #ff9900;
                        border-top-color: transparent;
                        border-radius: 50%;
                        animation: tws-spin 0.8s linear infinite;
                    }
                    @keyframes tws-spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(spinnerStyle);
            }
            this._element.style.display = 'flex';
        },
        hide: function() {
            if (this._element) this._element.style.display = 'none';
        }
    };

    // ============================================
    // SCROLL CUSTOMIZADO
    // ============================================
    function initSlimScroll(container) {
        if (!container) return;
        container.style.overflowY = 'auto';
        container.style.maxHeight = '400px';
        container.style.scrollbarWidth = 'thin';
        container.style.scrollbarColor = '#ff9900 #333';
    }

    // ============================================
    // TEMPLATES DE TROPAS
    // ============================================
    let troopTemplates = [];

    function loadTemplates() {
        const saved = localStorage.getItem(TEMPLATES_KEY);
        if (saved) troopTemplates = JSON.parse(saved);
    }

    function saveTemplates() {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(troopTemplates));
    }

    function saveCurrentAsTemplate(name) {
        const tropas = {};
        TROOP_IDS.forEach(t => {
            const input = document.getElementById(t);
            if (input) tropas[t] = parseInt(input.value) || 0;
        });
        troopTemplates.push({ id: Date.now(), name: name, tropas: tropas });
        saveTemplates();
        renderTemplateList();
        Toast.success(`✅ Template "${name}" salvo com sucesso!`);
    }

    function loadTemplate(templateId) {
        const template = troopTemplates.find(t => t.id === templateId);
        if (!template) return;
        TROOP_IDS.forEach(t => {
            const input = document.getElementById(t);
            if (input && template.tropas[t] !== undefined) input.value = template.tropas[t];
        });
        Toast.success(`✅ Template "${template.name}" carregado!`);
    }

    function deleteTemplate(templateId) {
        ConfirmationBox.show('Tem certeza que deseja excluir este template?', () => {
            troopTemplates = troopTemplates.filter(t => t.id !== templateId);
            saveTemplates();
            renderTemplateList();
            Toast.success('✅ Template excluído!');
        });
    }

    function renderTemplateList() {
        const container = document.getElementById('tws-template-list');
        if (!container) return;
        if (troopTemplates.length === 0) {
            container.innerHTML = '<div style="color: #666; text-align: center; padding: 10px;">Nenhum template salvo</div>';
            return;
        }
        container.innerHTML = troopTemplates.map(t => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px; background: #333; margin-bottom: 5px; border-radius: 4px;">
                <span style="font-size: 12px; cursor: pointer;" onclick="window.loadTemplate(${t.id})">📋 ${escapeHtml(t.name)}</span>
                <button onclick="window.deleteTemplate(${t.id})" style="background: #990000; color: #fff; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">✖</button>
            </div>
        `).join('');
    }

    window.loadTemplate = loadTemplate;
    window.deleteTemplate = deleteTemplate;

    // ============================================
    // IMPORTAÇÃO BBCode
    // ============================================
    // ============================================
// IMPORTAÇÃO BBCode (COM INCREMENTO)
// ============================================
function importarBBCode() {
    const texto = prompt('Cole o BBCode dos ataques (formato do jogo):\n\nExemplo:\n[*][url="https://...?att_spear=100&att_sword=50"]500|500[/url] → 510|510 25/12/2024 15:30:00');
    if (!texto) return;

    // PERGUNTAR SE QUER INCREMENTAR OU IGNORAR DUPLICADAS
    const modo = confirm('Deseja adicionar ataques mesmo se já existirem?\n\n"OK" → Adicionar todos (pode criar duplicatas)\n"Cancelar" → Ignorar ataques já existentes');

    const linhas = texto.split('[*]').filter(l => l.trim());
    let importados = 0;
    let ignorados = 0;

    for (const linha of linhas) {
        // Extrair coordenadas
        const coords = linha.match(/(\d{1,4}\|\d{1,4})/g);
        if (!coords || coords.length < 2) continue;

        const origem = coords[0];
        const alvo = coords[1];

        // Extrair data/hora (com ou sem segundos)
        let dataMatch = linha.match(/(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}(?::\d{2})?)/);
        if (!dataMatch) continue;

        let datahora = dataMatch[1];
        // Garantir segundos
        if (datahora.split(':').length === 2) datahora += ':00';

        // Extrair tropas da URL
        const urlMatch = linha.match(/\[url=(.*?)\]/);
        const tropas = {};

        if (urlMatch) {
            const url = urlMatch[1];
            const params = new URLSearchParams(url.split('?')[1] || '');
            TROOP_IDS.forEach(t => {
                const valor = params.get(`att_${t}`);
                if (valor) tropas[t] = parseInt(valor);
            });
        }

        // Verificar se já existe ataque igual (apenas se NÃO for modo incremento)
        const ataques = carregarAtaques();
        const existe = ataques.some(a => a.origem === origem && a.alvo === alvo && a.datahora === datahora);

        if (!modo && existe) {
            ignorados++;
            continue;
        }

        // Criar novo ataque (com ID único, mesmo se duplicado)
        const novoAtaque = {
            id: Date.now() + Math.random() + importados,
            origem, alvo, datahora,
            ...tropas,
            enviado: false, travado: false, sucesso: null
        };
        ataques.push(novoAtaque);
        salvarAtaques(ataques);
        importados++;
    }

    if (importados > 0) {
        Toast.success(`✅ ${importados} ataques importados do BBCode!${ignorados > 0 ? ` (${ignorados} ignorados)` : ''}`);
    } else if (ignorados > 0) {
        Toast.info(`ℹ️ ${ignorados} ataques já existentes. Use "OK" no próximo prompt para adicionar mesmo assim.`);
    } else {
        Toast.error('❌ Nenhum ataque encontrado no BBCode!');
    }
}

    // ============================================
    // FORMATAR TROPAS PARA EXIBIÇÃO
    // ============================================
    function formatTroopsForDisplay(tropas) {
        const hasTroops = TROOP_IDS.some(t => (tropas[t] || 0) > 0);
        if (!hasTroops) return '';
        const troopsList = TROOP_IDS.filter(t => (tropas[t] || 0) > 0);
        if (troopsList.length === 0) return '';
        const displayTroops = troopsList.slice(0, 6);
        const hasMore = troopsList.length > 6;
        let troopsHtml = '<div class="troops-preview">';
        displayTroops.forEach(t => {
            const quantity = Format.number(tropas[t]);
            troopsHtml += `<span style="background: #333; padding: 2px 5px; border-radius: 3px; display: inline-flex; align-items: center; gap: 3px;">
                <img src="${TROOP_ICONS[t]}" style="width: 16px; height: 16px; vertical-align: middle;" title="${TROOP_NAMES[t]}">
                ${quantity}
            </span>`;
        });
        if (hasMore) troopsHtml += `<span style="background: #333; padding: 2px 5px; border-radius: 3px;">+${troopsList.length - 6}</span>`;
        troopsHtml += '</div>';
        return troopsHtml;
    }

    // ============================================
    // POPUP TEMPLATES
    // ============================================
    function showTemplatePopup() {
        let existing = document.getElementById('tws-template-popup');
        if (existing) {
            existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
            return;
        }
        const popup = document.createElement('div');
        popup.id = 'tws-template-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1e1e1e;
            border: 2px solid #ff9900;
            border-radius: 10px;
            padding: 20px;
            z-index: 100004;
            min-width: 300px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.5);
        `;
        popup.innerHTML = `
            <h4 style="color: #ff9900; margin: 0 0 15px 0;">📋 Templates de Tropas</h4>
            <div id="tws-template-list" style="margin-bottom: 15px; max-height: 300px; overflow-y: auto;"></div>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="tws-new-template-name" placeholder="Nome do template" style="flex: 1; background: #333; border: 1px solid #555; color: #fff; padding: 5px; border-radius: 4px;">
                <button id="tws-save-template" style="background: #006600; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Salvar Atual</button>
            </div>
            <button id="tws-close-popup" style="position: absolute; top: 5px; right: 10px; background: none; border: none; color: #fff; cursor: pointer; font-size: 18px;">✖</button>
        `;
        document.body.appendChild(popup);
        renderTemplateList();
        initSlimScroll(document.getElementById('tws-template-list'));
        document.getElementById('tws-save-template').onclick = () => {
            const name = document.getElementById('tws-new-template-name').value.trim();
            if (name) saveCurrentAsTemplate(name);
            else Toast.error('Digite um nome para o template!');
        };
        document.getElementById('tws-close-popup').onclick = () => popup.remove();
    }

    // ============================================
    // ENVIO IMEDIATO (para ataques no passado)
    // ============================================
    function enviarImediato(index) {
        const ataques = carregarAtaques();
        const ataque = ataques[index];

        if (!ataque) {
            Toast.error('Ataque não encontrado!');
            return;
        }

        // Montar mensagem com as tropas configuradas
        let tropasMsg = '';
        TROOP_IDS.forEach(t => {
            if (ataque[t] && ataque[t] > 0) {
                tropasMsg += `\n${TROOP_NAMES[t]}: ${Format.number(ataque[t])}`;
            }
        });

        ConfirmationBox.show(`Enviar ataque IMEDIATAMENTE?\n\n${ataque.origem} → ${ataque.alvo}${tropasMsg}`, async () => {
            LoadingIndicator.show();
            try {
                const sucesso = await executeAttack(ataque);
                const ataquesAtualizados = carregarAtaques();
                ataquesAtualizados[index].enviado = true;
                ataquesAtualizados[index].sucesso = sucesso;
                ataquesAtualizados[index].dataEnvio = new Date().toISOString();
                ataquesAtualizados[index].travado = false;
                salvarAtaques(ataquesAtualizados);
                if (sucesso) Toast.success(`✅ Ataque enviado com sucesso!`);
                else Toast.error(`❌ Falha no envio do ataque`);
            } catch (err) {
                Toast.error(`❌ Erro: ${err.message}`);
            } finally {
                LoadingIndicator.hide();
            }
        });
    }

    // ============================================
    // REPETIR ATAQUE (envia imediatamente)
    // ============================================
    window.repetirAtaque = async (index) => {
        const ataques = carregarAtaques();
        const ataqueOriginal = ataques[index];

        if (!ataqueOriginal) {
            Toast.error('Ataque não encontrado!');
            return;
        }

        // Montar mensagem com as tropas configuradas
        let tropasMsg = '';
        TROOP_IDS.forEach(t => {
            if (ataqueOriginal[t] && ataqueOriginal[t] > 0) {
                tropasMsg += `\n${TROOP_NAMES[t]}: ${Format.number(ataqueOriginal[t])}`;
            }
        });

        ConfirmationBox.show(`Repetir e enviar IMEDIATAMENTE?\n\n${ataqueOriginal.origem} → ${ataqueOriginal.alvo}${tropasMsg}`, async () => {
            LoadingIndicator.show();
            try {
                const sucesso = await executeAttack(ataqueOriginal);
                if (sucesso) {
                    Toast.success(`✅ Ataque repetido e enviado com sucesso!`);
                } else {
                    Toast.error(`❌ Falha no envio do ataque repetido`);
                }
            } catch (err) {
                Toast.error(`❌ Erro: ${err.message}`);
            } finally {
                LoadingIndicator.hide();
            }
        });
    };

    // ============================================
    // UTILITÁRIOS
    // ============================================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    async function safeFetch(url, options = {}, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok || res.status === 302) return res;
                if (i === retries) return res;
                await new Promise(r => setTimeout(r, 200));
            } catch (e) {
                if (i === retries) throw e;
                await new Promise(r => setTimeout(r, 200));
            }
        }
    }

    function safeTimeout(ms = 8000) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ms);
        return { controller, timeout };
    }

    // ============================================
    // VILLAGE.TXT LOADER
    // ============================================
    async function loadVillageTxt() {
        try {
            const res = await fetch(VILLAGE_TXT_URL, { credentials: 'same-origin' });
            if (!res.ok) throw new Error('Falha ao buscar village.txt');
            const text = await res.text();
            const map = {};
            for (const line of text.trim().split('\n')) {
                const [id, name, x, y, playerId] = line.split(',');
                map[`${x}|${y}`] = id;
            }
            _villageMap = map;
            console.log(`[TWS] Village.txt carregado: ${Object.keys(map).length} vilas`);
            return map;
        } catch (err) {
            console.error('[TWS] Erro ao carregar village.txt:', err);
            return {};
        }
    }

    // ============================================
    // VERIFICAR TROPAS DISPONÍVEIS
    // ============================================
    async function getVillageTroops(villageId) {
        try {
            const placeUrl = `${location.protocol}//${location.host}/game.php?village=${villageId}&screen=place`;
            const res = await fetch(placeUrl, { credentials: 'same-origin' });
            if (!res.ok) throw new Error('Falha ao carregar /place');
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const troops = {};
            TROOP_IDS.forEach(u => {
                let availableEl = doc.querySelector(`#units_entry_all_${u}`) || doc.querySelector(`#units_home_${u}`);
                let available = 0;
                if (availableEl) {
                    const txt = (availableEl.textContent || '').replace(/\./g, '').replace(/,/g, '').trim();
                    const m = txt.match(/(\d+)/g);
                    if (m) available = parseInt(m.join(''), 10);
                }
                troops[u] = available;
            });
            return troops;
        } catch (err) {
            console.error('[TWS] Erro getVillageTroops:', err);
            return null;
        }
    }

    function validateTroops(requested, available) {
        const errors = [];
        TROOP_IDS.forEach(u => {
            const req = Number(requested[u] || 0);
            const avail = Number(available[u] || 0);
            if (req > avail) errors.push(`${TROOP_NAMES[u]}: ${req}/${avail}`);
        });
        return errors;
    }

    // ============================================
    // DETECTAR CONFIRMAÇÃO
    // ============================================
    function isAttackConfirmed(htmlText, responseUrl) {
        if (responseUrl && responseUrl.includes('screen=info_command')) return true;
        if (/<tr class="command-row">/i.test(htmlText) && /data-command-id=/i.test(htmlText)) return true;
        const successPatterns = [
            /attack sent/i, /attack in queue/i, /enviado/i, /ataque enviado/i,
            /enfileirad/i, /A batalha começou/i, /march started/i, /comando enviado/i,
            /tropas enviadas/i, /foi enfileirado/i, /command sent/i, /comando foi criado/i
        ];
        if (successPatterns.some(p => p.test(htmlText))) return true;
        const errorPatterns = [/erro/i, /falha/i, /insuficiente/i, /not enough/i];
        const hasError = errorPatterns.some(p => p.test(htmlText));
        if (!hasError && htmlText.length > 500 && !htmlText.includes('screen=place')) return true;
        return false;
    }

    // ============================================
    // EXECUTAR ATAQUE
    // ============================================
    async function executeAttack(cfg) {
        const ATTACK_TIMEOUT = 5000;
        LoadingIndicator.show();
        const origemId = _villageMap[cfg.origem];
        if (!origemId) {
            LoadingIndicator.hide();
            throw new Error(`Vila origem ${cfg.origem} não encontrada`);
        }
        const [x, y] = (cfg.alvo || '').split('|');
        if (!x || !y) {
            LoadingIndicator.hide();
            throw new Error(`Alvo inválido: ${cfg.alvo}`);
        }
        const availableTroops = await getVillageTroops(origemId);
        if (availableTroops) {
            const errors = validateTroops(cfg, availableTroops);
            if (errors.length) {
                LoadingIndicator.hide();
                throw new Error(`Tropas insuficientes: ${errors.join(', ')}`);
            }
        }
        const placeUrl = `${location.protocol}//${location.host}/game.php?village=${origemId}&screen=place`;
        try {
            const { controller: c1, timeout: t1 } = safeTimeout(ATTACK_TIMEOUT);
            const getRes = await safeFetch(placeUrl, { credentials: 'same-origin', signal: c1.signal });
            clearTimeout(t1);
            if (!getRes.ok) throw new Error(`GET /place falhou: ${getRes.status}`);
            const html = await getRes.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            let form = doc.querySelector('#command-data-form') || doc.querySelector('form[action*="screen=place"]') || doc.forms[0];
            if (!form) throw new Error('Formulário não encontrado');
            const payloadObj = {};
            form.querySelectorAll('input, select, textarea').forEach(inp => {
                const name = inp.name;
                if (!name) return;
                if (inp.type === 'checkbox' || inp.type === 'radio') {
                    if (inp.checked) payloadObj[name] = inp.value || 'on';
                } else {
                    payloadObj[name] = inp.value || '';
                }
            });
            payloadObj['x'] = String(x);
            payloadObj['y'] = String(y);
            TROOP_IDS.forEach(u => payloadObj[u] = String(cfg[u] !== undefined ? cfg[u] : '0'));
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn && submitBtn.name) payloadObj[submitBtn.name] = submitBtn.value || '';
            const urlEncoded = Object.entries(payloadObj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
            let postUrl = form.getAttribute('action') || placeUrl;
            if (postUrl.startsWith('/')) postUrl = `${location.protocol}//${location.host}${postUrl}`;
            const { controller: c2, timeout: t2 } = safeTimeout(ATTACK_TIMEOUT);
            const postRes = await safeFetch(postUrl, {
                method: 'POST',
                credentials: 'same-origin',
                signal: c2.signal,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
                body: urlEncoded
            }, 1);
            clearTimeout(t2);
            if (!postRes.ok && postRes.status !== 302) throw new Error(`POST inicial falhou: ${postRes.status}`);
            const postText = await postRes.text();
            const postDoc = parser.parseFromString(postText, 'text/html');
            let confirmForm = postDoc.querySelector('form[action*="try=confirm"]') || postDoc.querySelector('#command-data-form') || postDoc.forms[0];
            if (confirmForm && postText.includes('try=confirm')) {
                const confirmPayload = {};
                confirmForm.querySelectorAll('input, select, textarea').forEach(inp => {
                    const name = inp.name;
                    if (!name) return;
                    if (inp.type === 'checkbox' || inp.type === 'radio') {
                        if (inp.checked) confirmPayload[name] = inp.value || 'on';
                    } else {
                        confirmPayload[name] = inp.value || '';
                    }
                });
                const confirmBtn = confirmForm.querySelector('#troop_confirm_submit, button[type="submit"], input[type="submit"]');
                if (confirmBtn && confirmBtn.name) confirmPayload[confirmBtn.name] = confirmBtn.value || '';
                const confirmEncoded = Object.entries(confirmPayload).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
                let confirmUrl = confirmForm.getAttribute('action') || postRes.url || placeUrl;
                if (confirmUrl.startsWith('/')) confirmUrl = `${location.protocol}//${location.host}${confirmUrl}`;
                const { controller: c3, timeout: t3 } = safeTimeout(ATTACK_TIMEOUT);
                const confirmRes = await safeFetch(confirmUrl, {
                    method: 'POST',
                    credentials: 'same-origin',
                    signal: c3.signal,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
                    body: confirmEncoded
                }, 1);
                clearTimeout(t3);
                const finalText = await confirmRes.text();
                LoadingIndicator.hide();
                return isAttackConfirmed(finalText, confirmRes.url);
            }
            LoadingIndicator.hide();
            return isAttackConfirmed(postText, postRes.url);
        } catch (err) {
            LoadingIndicator.hide();
            console.error('[TWS] executeAttack error:', err);
            throw err;
        }
    }

    // ============================================
    // ARMAZENAMENTO
    // ============================================
    function salvarAtaques(ataques) {
        localStorage.setItem(ATTACKS_KEY, JSON.stringify(ataques));
        renderizarLista();
    }

    function carregarAtaques() {
        const dados = localStorage.getItem(ATTACKS_KEY);
        return dados ? JSON.parse(dados) : [];
    }

    function salvarDadosFormulario() {
        const dados = {
            origem: document.getElementById('origem')?.value || '',
            alvo: document.getElementById('alvo')?.value || '',
            data: document.getElementById('data')?.value || '',
            hora: document.getElementById('hora')?.value || '00:00:00'
        };
        TROOP_IDS.forEach(t => {
            const input = document.getElementById(t);
            if (input) dados[t] = input.value;
        });
        localStorage.setItem(FORM_DATA_KEY, JSON.stringify(dados));
        Toast.success('✅ Dados do formulário salvos!');
    }

    function carregarDadosFormulario() {
        const dados = localStorage.getItem(FORM_DATA_KEY);
        if (!dados) return;
        try {
            const formData = JSON.parse(dados);
            if (formData.origem) document.getElementById('origem').value = formData.origem;
            if (formData.alvo) document.getElementById('alvo').value = formData.alvo;
            if (formData.data) document.getElementById('data').value = formData.data;
            if (formData.hora) document.getElementById('hora').value = formData.hora;
            TROOP_IDS.forEach(t => {
                if (formData[t] !== undefined) {
                    const input = document.getElementById(t);
                    if (input) input.value = formData[t];
                }
            });
        } catch (e) {
            console.error('[TWS] Erro ao carregar dados:', e);
        }
    }

    // ============================================
    // SCHEDULER
    // ============================================
    let schedulerInterval = null;
    const executando = new Set();

    function iniciarScheduler() {
        if (schedulerInterval) clearInterval(schedulerInterval);
        schedulerInterval = setInterval(async () => {
            const ataques = carregarAtaques();
            const agora = new Date();
            for (const ataque of ataques) {
                if (ataque.enviado || executando.has(ataque.id)) continue;
                const [dataPart, horaPart] = ataque.datahora.split(' ');
                const [dia, mes, ano] = dataPart.split('/');
                const [hora, minuto, segundo = '00'] = horaPart.split(':');
                const dataAgendada = new Date(ano, mes-1, dia, hora, minuto, segundo);
                const diferenca = dataAgendada - agora;
                if (Math.abs(diferenca) <= 1000) {
                    executando.add(ataque.id);
                    ataque.travado = true;
                    salvarAtaques(ataques);
                    (async () => {
                        try {
                            const sucesso = await executeAttack(ataque);
                            ataque.enviado = true;
                            ataque.sucesso = sucesso;
                            ataque.dataEnvio = new Date().toISOString();
                            if (sucesso) {
                                Toast.success(`✅ Ataque ${ataque.origem} → ${ataque.alvo} enviado!`);
                                EventSystem.trigger('attack_sent', ataque);
                            } else {
                                Toast.error(`❌ Falha no ataque ${ataque.origem} → ${ataque.alvo}`);
                            }
                        } catch (err) {
                            ataque.enviado = true;
                            ataque.sucesso = false;
                            ataque.erro = err.message;
                            Toast.error(`❌ Erro: ${err.message}`);
                        } finally {
                            ataque.travado = false;
                            executando.delete(ataque.id);
                            salvarAtaques(ataques);
                        }
                    })();
                }
            }
        }, 500);
    }

    // ============================================
    // INTERFACE VISUAL
    // ============================================
    let offsetX, offsetY, dragging = false;

    function criarInterface() {
        const painel = document.createElement('div');
        painel.id = 'ataques-painel';

        // Gerar grid de tropas com ícones
        const tropasGridHtml = TROOP_LIST.map(t => `
            <div class="tropa-item">
                <span class="tropa-label">
                    <img src="${t.icon}" style="width: 20px; height: 20px; vertical-align: middle;" title="${t.nome}">
                </span>
                <input type="number" id="${t.id}" value="0" min="0" step="1">
            </div>
        `).join('');

        painel.innerHTML = `
            <style>
                #ataques-painel {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    width: 520px;
                    background: #1e1e1e;
                    color: #fff;
                    border-radius: 10px;
                    z-index: 9999;
                    font-family: Arial, sans-serif;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.5);
                    border: 1px solid #333;
                }
                .painel-header {
                    background: #ff9900;
                    padding: 10px 15px;
                    border-radius: 10px 10px 0 0;
                    cursor: move;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .painel-header h3 {
                    margin: 0;
                    color: #1a1a1a;
                    font-size: 14px;
                }
                .painel-header button {
                    background: rgba(0,0,0,0.3);
                    color: white;
                    border: none;
                    padding: 2px 10px;
                    border-radius: 5px;
                    cursor: pointer;
                }
                .painel-conteudo {
                    padding: 15px;
                    max-height: 600px;
                    overflow-y: auto;
                }
                .campo {
                    margin-bottom: 10px;
                }
                .campo label {
                    display: block;
                    font-size: 11px;
                    margin-bottom: 3px;
                    color: #ff9900;
                }
                .campo input {
                    width: 100%;
                    padding: 6px;
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    border-radius: 4px;
                    box-sizing: border-box;
                }
                .linha-dupla {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                .tropas-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 10px;
                    background: #252525;
                    padding: 10px;
                    border-radius: 5px;
                    max-height: 250px;
                    overflow-y: auto;
                }
                .tropa-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #333;
                    padding: 5px 8px;
                    border-radius: 4px;
                }
                .tropa-label {
                    font-size: 11px;
                    color: #ff9900;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .tropa-item input {
                    width: 70px;
                    padding: 3px;
                    text-align: center;
                    background: #1a1a1a;
                    border: 1px solid #555;
                    color: #fff;
                    border-radius: 3px;
                }
                button {
                    background: #ff9900;
                    color: #1a1a1a;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 5px;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                button.danger {
                    background: #990000;
                    color: #fff;
                }
                button.success {
                    background: #006600;
                    color: #fff;
                }
                .ataque-item {
                    background: #252525;
                    padding: 8px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    border-left: 3px solid #ff9900;
                }
                .ataque-item.sent {
                    border-left-color: #00ff00;
                    opacity: 0.7;
                }
                .ataque-item.failed {
                    border-left-color: #ff0000;
                }
                .ataque-item.past {
                    border-left-color: #ffaa00;
                    background: #2a2a1a;
                }
                .status {
                    font-size: 10px;
                    color: #ff9900;
                    margin-top: 3px;
                }
                .miniatura {
                    text-align: center;
                    padding: 20px;
                    color: #666;
                }
                hr {
                    border-color: #333;
                    margin: 10px 0;
                }
                .botoes-linha {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                    margin-bottom: 10px;
                }
                [data-tooltip] {
                    cursor: help;
                    border-bottom: 1px dotted #666;
                }
                .troops-preview {
                    font-size: 10px;
                    margin-top: 4px;
                    color: #aaa;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-items: center;
                }
                .troops-preview span {
                    background: #333;
                    padding: 2px 5px;
                    border-radius: 3px;
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                }
                .btn-enviar-agora {
                    background: #ff6600;
                    color: #fff;
                    font-size: 10px;
                    padding: 2px 8px;
                    margin-left: 5px;
                    border-radius: 3px;
                    cursor: pointer;
                    border: none;
                }
                .btn-enviar-agora:hover {
                    background: #ff4400;
                }
                .btn-repetir {
                    background: #0066cc;
                    color: #fff;
                    font-size: 10px;
                    padding: 2px 8px;
                    margin-left: 5px;
                    border-radius: 3px;
                    cursor: pointer;
                    border: none;
                }
                .btn-repetir:hover {
                    background: #0055aa;
                }
            </style>

            <div class="painel-header" id="painel-header">
                <h3>⚔️ Agendador de Ataques</h3>
                <button id="minimizarBtn">−</button>
            </div>

            <div class="painel-conteudo" id="painel-conteudo">
                <div class="campo">
                    <label data-tooltip="Coordenadas da vila que vai enviar as tropas">🏠 Vila Origem</label>
                    <input type="text" id="origem" placeholder="Ex: 500|500">
                </div>

                <div class="campo">
                    <label data-tooltip="Coordenadas da vila que será atacada">🎯 Vila Alvo</label>
                    <input type="text" id="alvo" placeholder="Ex: 510|510">
                </div>

                <div class="linha-dupla">
                    <div class="campo">
                        <label data-tooltip="Data do ataque no formato DD/MM/AAAA">📅 Data</label>
                        <input type="text" id="data" placeholder="25/12/2024">
                    </div>
                    <div class="campo">
                        <label data-tooltip="Hora do ataque com segundos (HH:MM:SS)">⏰ Hora</label>
                        <input type="text" id="hora" placeholder="15:30:00" value="00:00:00">
                    </div>
                </div>

                <div class="tropas-grid">
                    ${tropasGridHtml}
                </div>

                <div class="botoes-linha">
                    <button id="agendarBtn" data-tooltip="Agendar ataque para data/hora informada">📅 Agendar</button>
                    <button id="importarBtn" class="success" data-tooltip="Importar ataques do BBCode">📋 Importar BBCode</button>
                    <button id="templatesBtn" class="success" data-tooltip="Gerenciar templates de tropas">💾 Templates</button>
                    <button id="salvarDadosBtn" class="success" data-tooltip="Salvar dados do formulário">💾 Salvar</button>
                    <button id="limparBtn" class="danger" data-tooltip="Remover TODOS os ataques">🗑️ Limpar Tudo</button>
                    <button id="limparConcluidosBtn" class="danger" data-tooltip="Remover apenas ataques concluídos">🧹 Limpar Concluídos</button>
                    <button id="destravarBtn" class="danger" data-tooltip="Destravar ataques travados">🔓 Destravar</button>
                </div>

                <hr>
                <h4 style="margin: 5px 0;">📋 Agendados</h4>
                <div id="listaAtaques"></div>
            </div>
        `;

        document.body.appendChild(painel);

        // Arrastável
        const header = document.getElementById('painel-header');
        const conteudo = document.getElementById('painel-conteudo');
        const minimizarBtn = document.getElementById('minimizarBtn');

        header.addEventListener('mousedown', (e) => {
            if (e.target === minimizarBtn) return;
            dragging = true;
            const rect = painel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (dragging) {
                const x = e.clientX - offsetX;
                const y = e.clientY - offsetY;
                const maxX = window.innerWidth - painel.offsetWidth;
                const maxY = window.innerHeight - painel.offsetHeight;
                painel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
                painel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
                painel.style.right = 'auto';
                painel.style.bottom = 'auto';
            }
        });

        document.addEventListener('mouseup', () => { dragging = false; });

        let minimizado = false;
        minimizarBtn.addEventListener('click', () => {
            conteudo.style.display = minimizado ? 'block' : 'none';
            minimizarBtn.textContent = minimizado ? '−' : '+';
            minimizado = !minimizado;
        });

        Tooltip.init();
    }

    function renderizarLista() {
        const container = document.getElementById('listaAtaques');
        if (!container) return;
        const ataques = carregarAtaques();
        const agora = new Date();

        if (ataques.length === 0) {
            container.innerHTML = '<div class="miniatura">Nenhum ataque agendado</div>';
            return;
        }

        container.innerHTML = ataques.map((ataque, index) => {
            const tropasHtml = formatTroopsForDisplay(ataque);

            // Verificar se é ataque no passado
            const [dataPart, horaPart] = ataque.datahora.split(' ');
            const [dia, mes, ano] = dataPart.split('/');
            const [hora, minuto, segundo = '00'] = horaPart.split(':');
            const dataAgendada = new Date(ano, mes-1, dia, hora, minuto, segundo);
            const isPast = !ataque.enviado && dataAgendada < agora;

            // Botão de repetir (aparece apenas quando enviado com sucesso)
            const repetirBtn = ataque.enviado && ataque.sucesso ?
                `<button class="btn-repetir" onclick="window.repetirAtaque(${index})">🔄 Repetir</button>` : '';

            return `
            <div class="ataque-item ${ataque.enviado ? 'sent' : ''} ${ataque.sucesso === false ? 'failed' : ''} ${isPast ? 'past' : ''}">
                <strong>${escapeHtml(ataque.origem)}</strong> → <strong>${escapeHtml(ataque.alvo)}</strong>
                ${repetirBtn}
                ${isPast ? `<button class="btn-enviar-agora" onclick="window.enviarImediato(${index})">▶ Enviar agora</button>` : ''}
                <br>
                📅 ${escapeHtml(ataque.datahora)}<br>
                ${tropasHtml}
                <span class="status">
                    ${ataque.enviado ?
                        (ataque.sucesso ? '✅ Enviado com sucesso' : `❌ Falhou: ${escapeHtml(ataque.erro || 'motivo desconhecido')}`) :
                        (isPast ? '⏰ Atrasado - Clique em "Enviar agora"' : (ataque.travado ? '⏳ Enviando...' : '⏰ Agendado'))}
                </span>
                ${!ataque.enviado ? `<div style="margin-top:5px;"><button onclick="window.removerAtaque(${index})" style="padding:2px 6px;font-size:10px;">Remover</button></div>` : ''}
            </div>
        `}).join('');

        initSlimScroll(container);
    }

    // Expor funções globalmente
    window.removerAtaque = (index) => {
        ConfirmationBox.show('Remover este ataque?', () => {
            const ataques = carregarAtaques();
            ataques.splice(index, 1);
            salvarAtaques(ataques);
            Toast.success('✅ Ataque removido!');
        });
    };

    window.enviarImediato = enviarImediato;

    function agendarAtaque() {
        const origem = document.getElementById('origem').value.trim();
        const alvo = document.getElementById('alvo').value.trim();
        const data = document.getElementById('data').value.trim();
        const hora = document.getElementById('hora').value.trim();

        if (!origem || !alvo || !data || !hora) {
            Toast.error('Preencha todos os campos!');
            return;
        }

        const datahora = `${data} ${hora}`;

        if (!/^\d{1,4}\|\d{1,4}$/.test(origem) || !/^\d{1,4}\|\d{1,4}$/.test(alvo)) {
            Toast.error('Coordenadas inválidas! Use: 500|500');
            return;
        }

        if (!/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(datahora)) {
            Toast.error('Data/hora inválida! Use: DD/MM/AAAA HH:MM:SS');
            return;
        }

        const tropas = {};
        TROOP_IDS.forEach(t => {
            const input = document.getElementById(t);
            tropas[t] = parseInt(input?.value || 0);
        });

        const novoAtaque = {
            id: Date.now() + Math.random(),
            origem,
            alvo,
            datahora,
            ...tropas,
            enviado: false,
            travado: false,
            sucesso: null
        };

        const ataques = carregarAtaques();
        ataques.push(novoAtaque);
        salvarAtaques(ataques);

        Toast.success(`✅ Ataque agendado para ${datahora}`);
        EventSystem.trigger('attack_scheduled', novoAtaque);
    }

    function limparTudo() {
        ConfirmationBox.show('⚠️ ATENÇÃO! Isso irá remover TODOS os ataques agendados (inclusive os não enviados). Continuar?', () => {
            salvarAtaques([]);
            Toast.success('🗑️ Todos os ataques foram removidos!');
        });
    }

    function limparConcluidos() {
        const ataques = carregarAtaques();
        const naoConcluidos = ataques.filter(a => !a.enviado);
        const removidos = ataques.length - naoConcluidos.length;
        salvarAtaques(naoConcluidos);
        Toast.success(`Removidos ${removidos} ataques concluídos`);
    }

    function destravarAtaques() {
        const ataques = carregarAtaques();
        let modificados = 0;
        for (const a of ataques) {
            if (a.travado && !a.enviado) {
                a.travado = false;
                a.enviado = true;
                a.sucesso = true;
                a.erro = null;
                modificados++;
            }
        }
        if (modificados > 0) {
            salvarAtaques(ataques);
            Toast.success(`✅ ${modificados} ataques travados foram destravados!`);
        } else {
            Toast.info('Nenhum ataque travado encontrado.');
        }
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    async function inicializar() {
        await loadVillageTxt();
        loadTemplates();
        criarInterface();
        carregarDadosFormulario();
        iniciarScheduler();
        renderizarLista();

        setTimeout(() => {
            document.getElementById('agendarBtn').onclick = agendarAtaque;
            document.getElementById('limparBtn').onclick = limparTudo;
            document.getElementById('limparConcluidosBtn').onclick = limparConcluidos;
            document.getElementById('salvarDadosBtn').onclick = salvarDadosFormulario;
            document.getElementById('destravarBtn').onclick = destravarAtaques;
            document.getElementById('templatesBtn').onclick = showTemplatePopup;
            document.getElementById('importarBtn').onclick = importarBBCode;
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }

})();
