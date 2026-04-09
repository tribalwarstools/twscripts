// ==UserScript==
// @name         Tribal Wars - Coordenador de Ataques
// @namespace    http://tampermonkey.net/
// @version      8.1
// @description  Coordene ataques múltiplos ou emparelhados 1:1 com VELOCIDADES REAIS DA API
// @author       Você
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // VELOCITY MANAGER - BUSCA VELOCIDADES REAIS DA API
    // ============================================

    const VelocityManager = {
        _cachedSpeeds: null,
        _worldInfo: null,
        _lastUpdate: null,

        /**
         * Busca velocidades REAIS da API do jogo
         */
        async fetchRealSpeeds() {
            const world = location.hostname.split('.')[0];
            const apiUrl = `https://${world}.tribalwars.com.br/interface.php?func=get_unit_info`;

            try {
                console.log(`[Velocity] 🔍 Buscando velocidades da API: ${apiUrl}`);

                const response = await fetch(apiUrl, { credentials: 'same-origin' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const xmlText = await response.text();

                // Parsear o XML
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                // Verificar se houve erro no parse
                if (xmlDoc.querySelector('parsererror')) {
                    throw new Error('Erro ao parsear XML');
                }

                const speeds = {};

                // Lista completa de unidades
                const units = ['spear', 'sword', 'axe', 'archer', 'spy',
                              'light', 'marcher', 'heavy', 'ram', 'catapult',
                              'knight', 'snob'];

                units.forEach(unit => {
                    const unitElem = xmlDoc.querySelector(unit);
                    if (unitElem) {
                        const speedElem = unitElem.querySelector('speed');
                        if (speedElem) {
                            speeds[unit] = parseFloat(speedElem.textContent);
                        }
                    }
                });

                if (Object.keys(speeds).length === 0) {
                    throw new Error('Nenhuma velocidade encontrada no XML');
                }

                console.log(`[Velocity] ✅ Velocidades obtidas da API (${Object.keys(speeds).length} unidades):`);
                console.table(Object.entries(speeds).reduce((obj, [k, v]) => {
                    obj[k] = `${v} min/campo`;
                    return obj;
                }, {}));

                // Salvar em cache
                this._cachedSpeeds = speeds;
                this._worldInfo = {
                    world: world,
                    speeds: speeds,
                    lastUpdate: Date.now(),
                    source: 'API'
                };
                this._lastUpdate = Date.now();

                // Salvar no localStorage
                this.saveToLocalStorage(speeds, world);

                return speeds;

            } catch (error) {
                console.error('[Velocity] ❌ Erro ao buscar da API:', error);

                // Tentar carregar do localStorage
                const cached = this.loadFromLocalStorage(world);
                if (cached) {
                    console.log('[Velocity] 📦 Usando cache do localStorage');
                    this._cachedSpeeds = cached;
                    this._worldInfo = {
                        world: world,
                        speeds: cached,
                        lastUpdate: this._lastUpdate,
                        source: 'CACHE'
                    };
                    return cached;
                }

                // Fallback para valores padrão
                console.log('[Velocity] ⚠️ Usando velocidades padrão (fallback)');
                return this.getFallbackSpeeds();
            }
        },

        /**
         * Salva velocidades no localStorage
         */
        saveToLocalStorage(speeds, world) {
            try {
                const cache = {
                    world: world,
                    speeds: speeds,
                    timestamp: Date.now()
                };
                localStorage.setItem('twc_velocity_cache', JSON.stringify(cache));
                console.log('[Velocity] 💾 Velocidades salvas no localStorage');
            } catch (e) {
                console.warn('[Velocity] Erro ao salvar cache:', e);
            }
        },

        /**
         * Carrega velocidades do localStorage
         */
        loadFromLocalStorage(world) {
            try {
                const saved = localStorage.getItem('twc_velocity_cache');
                if (saved) {
                    const cache = JSON.parse(saved);
                    // Cache válido por 24 horas
                    if (cache.world === world && (Date.now() - cache.timestamp) < 86400000) {
                        return cache.speeds;
                    }
                }
            } catch (e) {
                console.warn('[Velocity] Erro ao carregar cache:', e);
            }
            return null;
        },

        /**
         * Velocidades padrão (fallback)
         */
        getFallbackSpeeds() {
            return {
                spear: 18, sword: 22, axe: 18, archer: 18, spy: 9,
                light: 10, marcher: 10, heavy: 11, ram: 30, catapult: 30,
                knight: 10, snob: 35
            };
        },

        /**
         * Obtém velocidades (com cache)
         */
        async getVelocidades() {
            if (this._cachedSpeeds && this._lastUpdate && (Date.now() - this._lastUpdate) < 3600000) {
                console.log('[Velocity] 📦 Usando cache em memória');
                return this._cachedSpeeds;
            }
            return await this.fetchRealSpeeds();
        },

        /**
         * Obtém velocidades para o Farm Core
         */
        getVelocidadesParaFarmCore() {
            return this._cachedSpeeds;
        },

        /**
         * Obtém informações do mundo
         */
        getWorldInfo() {
            return this._worldInfo;
        },

        /**
         * Força atualização
         */
        async forceRefresh() {
            console.log('[Velocity] 🔄 Forçando atualização...');
            this._cachedSpeeds = null;
            this._lastUpdate = null;
            return await this.fetchRealSpeeds();
        },

        /**
         * Obtém velocidade específica de uma unidade
         */
        getUnitSpeed(unit) {
            if (this._cachedSpeeds && this._cachedSpeeds[unit]) {
                return this._cachedSpeeds[unit];
            }
            return this.getFallbackSpeeds()[unit] || 18;
        }
    };

    // ============================================
    // CONSTANTES DO SCRIPT
    // ============================================
    const UNIDADES = {
        spear: { nome: 'Lanceiro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_spear.png' },
        sword: { nome: 'Espadachim', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_sword.png' },
        axe: { nome: 'Bárbaro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_axe.png' },
        archer: { nome: 'Arqueiro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_archer.png' },
        spy: { nome: 'Explorador', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_spy.png' },
        light: { nome: 'Cavalaria leve', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_light.png' },
        marcher: { nome: 'Arqueiro a cavalo', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_marcher.png' },
        heavy: { nome: 'Cavalaria pesada', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_heavy.png' },
        ram: { nome: 'Aríete', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_ram.png' },
        catapult: { nome: 'Catapulta', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_catapult.png' },
        knight: { nome: 'Paladino', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_knight.png' },
        snob: { nome: 'Nobre', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_snob.png' }
    };
    const UNIDADES_IDS = Object.keys(UNIDADES);

    // Velocidades que serão preenchidas pelo VelocityManager
    let velocidadesUnidades = {};

    let painelAtivo = false;
    let painelElemento = null;
    let popupVelocidadesAtivo = false;

    // ============================================
    // MENSAGENS TOAST
    // ============================================
    const Toast = {
        _container: null,
        _getContainer: function() {
            if (!this._container) {
                this._container = document.createElement('div');
                this._container.id = 'twc-toast-container';
                this._container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000000;
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
        success: function(message) { this._show(message, 'success'); },
        error: function(message) { this._show(message, 'error'); },
        info: function(message) { this._show(message, 'info'); }
    };

    if (!document.querySelector('#twc-animations')) {
        const style = document.createElement('style');
        style.id = 'twc-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // POPUP DE VELOCIDADES (z-index aumentado)
    // ============================================
    function mostrarPopupVelocidades() {
        if (popupVelocidadesAtivo) return;

        const worldInfo = VelocityManager.getWorldInfo();
        const mundo = worldInfo ? worldInfo.world : (location.hostname.split('.')[0] || 'desconhecido');
        const fonte = worldInfo ? (worldInfo.source === 'API' ? '✅ API DO JOGO' : '📦 CACHE LOCAL') : '⚙️ PADRÃO';
        const ultimaAtualizacao = worldInfo && worldInfo.lastUpdate ? new Date(worldInfo.lastUpdate).toLocaleString() : 'nunca';

        const fader = document.createElement('div');
        fader.id = 'twc-velocidades-fader';
        fader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 1000000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.2s ease;
        `;

        const popup = document.createElement('div');
        popup.id = 'twc-velocidades-popup';
        popup.style.cssText = `
            background: #1e1e1e;
            border: 2px solid #ff9900;
            border-radius: 10px;
            width: 450px;
            max-width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 5px 25px rgba(0,0,0,0.5);
            animation: fadeIn 0.2s ease;
            z-index: 1000001;
        `;

        let velocidadesHtml = '';
        for (const [id, data] of Object.entries(UNIDADES)) {
            const velocidade = velocidadesUnidades[id] || '?';
            velocidadesHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #333;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="${data.icon}" style="width: 24px; height: 24px;">
                        <span style="color: #ff9900; font-weight: bold;">${data.nome}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #fff; font-weight: bold; min-width: 50px; text-align: center;">${velocidade}</span>
                        <span style="color: #aaa; font-size: 11px;">min/campo</span>
                    </div>
                </div>
            `;
        }

        popup.innerHTML = `
            <div style="padding: 15px; border-bottom: 1px solid #ff9900; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #ff9900;">⚙️ Velocidades das Unidades</h3>
                <button id="twc-fechar-velocidades" style="background: #990000; color: white; border: none;
                        padding: 5px 12px; border-radius: 5px; cursor: pointer;">✕</button>
            </div>
            <div style="padding: 10px; background: #252525; margin: 10px; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span>🌍 Mundo: <strong>${mundo}</strong></span>
                    <span>📡 Fonte: ${fonte}</span>
                </div>
                <div style="font-size: 10px; color: #666; margin-top: 5px;">
                    🕐 Última atualização: ${ultimaAtualizacao}
                </div>
            </div>
            <div style="padding: 10px;">
                ${velocidadesHtml}
            </div>
            <div style="padding: 15px; border-top: 1px solid #333; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="twc-vel-detectar" style="background: #2980b9; color: white; border: none;
                        padding: 8px 16px; border-radius: 5px; cursor: pointer;">🔍 Buscar do Jogo</button>
                <button id="twc-vel-fechar" style="background: #ff9900; color: #1a1a1a; border: none;
                        padding: 8px 16px; border-radius: 5px; cursor: pointer; font-weight: bold;">Fechar</button>
            </div>
        `;

        fader.appendChild(popup);
        document.body.appendChild(fader);
        popupVelocidadesAtivo = true;

        fader.addEventListener('click', (e) => {
            if (e.target === fader) fecharPopupVelocidades();
        });

        document.getElementById('twc-fechar-velocidades').addEventListener('click', fecharPopupVelocidades);
        document.getElementById('twc-vel-fechar').addEventListener('click', fecharPopupVelocidades);

        document.getElementById('twc-vel-detectar').addEventListener('click', async () => {
            Toast.info('🔍 Buscando velocidades do jogo...');
            const novasVelocidades = await VelocityManager.forceRefresh();
            if (novasVelocidades) {
                for (const [id, vel] of Object.entries(novasVelocidades)) {
                    if (velocidadesUnidades[id] !== undefined) {
                        velocidadesUnidades[id] = vel;
                    }
                }
                Toast.success(`✅ Velocidades atualizadas do mundo ${mundo}!`);
                fecharPopupVelocidades();
                // Recarregar o popup para mostrar novos valores
                setTimeout(() => mostrarPopupVelocidades(), 100);
            } else {
                Toast.error('❌ Não foi possível buscar velocidades do jogo');
            }
        });
    }

    function fecharPopupVelocidades() {
        const fader = document.getElementById('twc-velocidades-fader');
        if (fader) fader.remove();
        popupVelocidadesAtivo = false;
    }

    // ============================================
    // FUNÇÕES AUXILIARES
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

    function validarCoordenada(coord) {
        const coordSanitizada = coord.replace(/\s+/g, '');
        return /^\d{1,3}\|\d{1,3}$/.test(coordSanitizada);
    }

    function sanitizarCoordenada(coord) {
        const coordSanitizada = coord.replace(/\s+/g, '');
        if (!validarCoordenada(coordSanitizada)) {
            throw new Error(`Coordenada inválida: ${coord}`);
        }
        return coordSanitizada;
    }

    function validarDataHora(dataHoraStr) {
        return /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/.test(dataHoraStr);
    }

    function parseDataHora(dataHoraStr) {
        if (!validarDataHora(dataHoraStr)) {
            throw new Error(`Formato de data inválido: ${dataHoraStr}`);
        }
        const [data, tempo] = dataHoraStr.split(' ');
        const [dia, mes, ano] = data.split('/').map(Number);
        const [hora, minuto, segundo] = tempo.split(':').map(Number);
        const date = new Date(ano, mes - 1, dia, hora, minuto, segundo);
        if (isNaN(date.getTime())) {
            throw new Error(`Data inválida: ${dataHoraStr}`);
        }
        return date;
    }

    function formatarDataHora(data) {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const hora = String(data.getHours()).padStart(2, '0');
        const minuto = String(data.getMinutes()).padStart(2, '0');
        const segundo = String(data.getSeconds()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
    }

    function calcularDistancia(coord1, coord2) {
        const [x1, y1] = coord1.split('|').map(Number);
        const [x2, y2] = coord2.split('|').map(Number);
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    function getUnidadeMaisLenta(tropas) {
        let unidadeMaisLenta = null;
        let maiorVelocidade = -1;

        for (const [unidade, quantidade] of Object.entries(tropas)) {
            if (quantidade > 0) {
                const velocidade = velocidadesUnidades[unidade];
                if (velocidade > maiorVelocidade) {
                    maiorVelocidade = velocidade;
                    unidadeMaisLenta = unidade;
                }
            }
        }
        return unidadeMaisLenta;
    }

    function calcularTempoViagem(origem, destino, unidade, bonusSinal = 0) {
        const distancia = calcularDistancia(origem, destino);
        const velocidadeBase = velocidadesUnidades[unidade];
        const fatorBonus = 1 + (bonusSinal / 100);
        const tempoMinutos = distancia * velocidadeBase / fatorBonus;
        return tempoMinutos * 60000;
    }

    function calcularHorarioLancamento(origem, destino, horaChegada, tropas, bonusSinal = 0) {
        const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
        if (!unidadeMaisLenta) return null;
        const tempoViagem = calcularTempoViagem(origem, destino, unidadeMaisLenta, bonusSinal);
        const chegadaDate = parseDataHora(horaChegada);
        const lancamentoDate = new Date(chegadaDate.getTime() - tempoViagem);
        return formatarDataHora(lancamentoDate);
    }

    function calcularHorarioChegada(origem, destino, horaLancamento, tropas, bonusSinal = 0) {
        const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
        if (!unidadeMaisLenta) return null;
        const tempoViagem = calcularTempoViagem(origem, destino, unidadeMaisLenta, bonusSinal);
        const lancamentoDate = parseDataHora(horaLancamento);
        const chegadaDate = new Date(lancamentoDate.getTime() + tempoViagem);
        return formatarDataHora(chegadaDate);
    }

    // ============================================
    // CARREGAR VILLAGE.TXT
    // ============================================
    let villageMap = {};

    async function loadVillageTxt() {
        try {
            const res = await fetch('/map/village.txt');
            if (!res.ok) throw new Error('Falha ao buscar village.txt');
            const text = await res.text();
            const map = {};
            for (const line of text.trim().split('\n')) {
                const [id, name, x, y, playerId] = line.split(',');
                map[`${x}|${y}`] = id;
            }
            villageMap = map;
            console.log(`[TWC] Village.txt carregado: ${Object.keys(map).length} vilas`);
            return map;
        } catch (err) {
            console.error('[TWC] Erro ao carregar village.txt:', err);
            return {};
        }
    }

    // ============================================
    // CONFIGURAÇÕES (localStorage)
    // ============================================
    const STORAGE_KEY = 'twc_coordenador_config';

    function salvarConfiguracao(config) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('[TWC] Erro ao salvar:', e);
        }
    }

    function carregarConfiguracao() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('[TWC] Erro ao carregar:', e);
        }
        return null;
    }

    // ============================================
    // GERAÇÃO DE BBCODE
    // ============================================

    function getTropas() {
        const tropas = {};
        UNIDADES_IDS.forEach(id => {
            const input = document.getElementById(`tropas_${id}`);
            tropas[id] = parseInt(input?.value || 0);
        });
        return tropas;
    }

    function getNomeUnidade(id) {
        return UNIDADES[id]?.nome || id;
    }

    // MODO MÚLTIPLO: Produto cartesiano (todas combinações)
    async function gerarBBCodeMultiplo() {
        try {
            const destinosRaw = document.getElementById('twc_destinos').value.trim();
            const origensRaw = document.getElementById('twc_origens').value.trim();
            const tipoCalculo = document.getElementById('twc_tipoCalculo').value;
            const bonusSinal = parseInt(document.getElementById('twc_bonusSinal').value) || 0;
            const incrementarSegundos = document.getElementById('twc_incrementarSegundos').checked;
            const valorIncremento = parseInt(document.getElementById('twc_valorIncremento').value) || 5;
            const ordenacao = document.getElementById('twc_ordenacao').value;
            const tropas = getTropas();

            if (!destinosRaw || !origensRaw) {
                Toast.error('❌ Informe origens e destinos!');
                return;
            }

            const destinos = destinosRaw.split(/\s+/).map(sanitizarCoordenada).filter(Boolean);
            const origens = origensRaw.split(/\s+/).map(sanitizarCoordenada).filter(Boolean);

            const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
            if (!unidadeMaisLenta) {
                Toast.error('❌ Selecione pelo menos uma tropa!');
                return;
            }

            let horaBase = tipoCalculo === 'chegada'
                ? document.getElementById('twc_horaChegada').value.trim()
                : document.getElementById('twc_horaLancamento').value.trim();

            if (!horaBase || !validarDataHora(horaBase)) {
                Toast.error('❌ Informe uma data/hora válida!');
                return;
            }

            const combinacoes = [];
            for (const o of origens) {
                const vid = villageMap[o];
                if (!vid) continue;
                const [x, y] = o.split('|');

                for (const d of destinos) {
                    let horaLancamento, horaChegada;

                    if (tipoCalculo === 'chegada') {
                        horaLancamento = calcularHorarioLancamento(o, d, horaBase, tropas, bonusSinal);
                        horaChegada = horaBase;
                    } else {
                        horaLancamento = horaBase;
                        horaChegada = calcularHorarioChegada(o, d, horaBase, tropas, bonusSinal);
                    }

                    combinacoes.push({
                        origem: o, destino: d, horaLancamento, horaChegada,
                        distancia: calcularDistancia(o, d),
                        timestampLancamento: parseDataHora(horaLancamento).getTime(),
                        timestampChegada: parseDataHora(horaChegada).getTime(),
                        vid, x, y
                    });
                }
            }

            if (combinacoes.length === 0) {
                Toast.error('❌ Nenhuma combinação válida!');
                return;
            }

            switch(ordenacao) {
                case 'lancamento': combinacoes.sort((a, b) => a.timestampLancamento - b.timestampLancamento); break;
                case 'chegada': combinacoes.sort((a, b) => a.timestampChegada - b.timestampChegada); break;
                case 'distancia': combinacoes.sort((a, b) => a.distancia - b.distancia); break;
            }

            if (incrementarSegundos) {
                let segundoIncremento = 0;
                combinacoes.forEach((comb, index) => {
                    if (index > 0) {
                        segundoIncremento += valorIncremento;
                        const lancamentoDate = parseDataHora(comb.horaLancamento);
                        const chegadaDate = parseDataHora(comb.horaChegada);
                        lancamentoDate.setSeconds(lancamentoDate.getSeconds() + segundoIncremento);
                        chegadaDate.setSeconds(chegadaDate.getSeconds() + segundoIncremento);
                        comb.horaLancamento = formatarDataHora(lancamentoDate);
                        comb.horaChegada = formatarDataHora(chegadaDate);
                    }
                });
            }

            let out = `[table][**]Unidade[||]Origem[||]Destino[||]Lançamento[||]Chegada[||]Enviar[/**]\n`;
            for (const comb of combinacoes) {
                const qs = UNIDADES_IDS.map(id => `att_${id}=${tropas[id] || 0}`).join('&');
                const link = `https://${location.host}/game.php?village=${comb.vid}&screen=place&x=${comb.x}&y=${comb.y}&${qs}`;
                out += `[*][unit]${unidadeMaisLenta}[/unit] [|] ${comb.origem} [|] ${comb.destino} [|] ${comb.horaLancamento} [|] ${comb.horaChegada} [|] [url=${link}]ENVIAR[/url]\n`;
            }
            out += `[/table]`;

            document.getElementById('twc_saida').value = out;
            Toast.success(`✅ ${combinacoes.length} ataque(s) gerado(s) (Modo Múltiplo)!`);

        } catch (error) {
            Toast.error(`❌ Erro: ${error.message}`);
        }
    }

    // MODO SIMPLES: Emparelhamento 1:1
    async function gerarBBCodeSimples() {
        try {
            const destinosRaw = document.getElementById('twc_destinos').value.trim();
            const origensRaw = document.getElementById('twc_origens').value.trim();
            const tipoCalculo = document.getElementById('twc_tipoCalculo').value;
            const bonusSinal = parseInt(document.getElementById('twc_bonusSinal').value) || 0;
            const incrementarSegundos = document.getElementById('twc_incrementarSegundos').checked;
            const valorIncremento = parseInt(document.getElementById('twc_valorIncremento').value) || 5;
            const tropas = getTropas();

            if (!destinosRaw || !origensRaw) {
                Toast.error('❌ Informe origens e destinos!');
                return;
            }

            const origens = origensRaw.split(/\s+/).map(sanitizarCoordenada).filter(Boolean);
            const destinos = destinosRaw.split(/\s+/).map(sanitizarCoordenada).filter(Boolean);

            if (origens.length === 0 || destinos.length === 0) {
                Toast.error('❌ Nenhuma coordenada válida!');
                return;
            }

            const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
            if (!unidadeMaisLenta) {
                Toast.error('❌ Selecione pelo menos uma tropa!');
                return;
            }

            let horaBase = tipoCalculo === 'chegada'
                ? document.getElementById('twc_horaChegada').value.trim()
                : document.getElementById('twc_horaLancamento').value.trim();

            if (!horaBase || !validarDataHora(horaBase)) {
                Toast.error('❌ Informe uma data/hora válida!');
                return;
            }

            const quantidadePares = Math.min(origens.length, destinos.length);
            const combinacoes = [];

            for (let i = 0; i < quantidadePares; i++) {
                const origem = origens[i];
                const destino = destinos[i];

                const vid = villageMap[origem];
                if (!vid) {
                    Toast.error(`⚠️ Vila origem ${origem} não encontrada no village.txt`);
                    continue;
                }
                const [x, y] = origem.split('|');

                let horaLancamento, horaChegada;

                if (tipoCalculo === 'chegada') {
                    horaLancamento = calcularHorarioLancamento(origem, destino, horaBase, tropas, bonusSinal);
                    horaChegada = horaBase;
                } else {
                    horaLancamento = horaBase;
                    horaChegada = calcularHorarioChegada(origem, destino, horaBase, tropas, bonusSinal);
                }

                combinacoes.push({
                    origem, destino, horaLancamento, horaChegada,
                    distancia: calcularDistancia(origem, destino),
                    vid, x, y
                });
            }

            if (combinacoes.length === 0) {
                Toast.error('❌ Nenhum par válido!');
                return;
            }

            if (incrementarSegundos) {
                let segundoIncremento = 0;
                combinacoes.forEach((comb, index) => {
                    if (index > 0) {
                        segundoIncremento += valorIncremento;
                        const lancamentoDate = parseDataHora(comb.horaLancamento);
                        const chegadaDate = parseDataHora(comb.horaChegada);
                        lancamentoDate.setSeconds(lancamentoDate.getSeconds() + segundoIncremento);
                        chegadaDate.setSeconds(chegadaDate.getSeconds() + segundoIncremento);
                        comb.horaLancamento = formatarDataHora(lancamentoDate);
                        comb.horaChegada = formatarDataHora(chegadaDate);
                    }
                });
            }

            let out = `[table][**]Unidade[||]Origem[||]Destino[||]Lançamento[||]Chegada[||]Enviar[/**]\n`;
            for (const comb of combinacoes) {
                const qs = UNIDADES_IDS.map(id => `att_${id}=${tropas[id] || 0}`).join('&');
                const link = `https://${location.host}/game.php?village=${comb.vid}&screen=place&x=${comb.x}&y=${comb.y}&${qs}`;
                out += `[*][unit]${unidadeMaisLenta}[/unit] [|] ${comb.origem} [|] ${comb.destino} [|] ${comb.horaLancamento} [|] ${comb.horaChegada} [|] [url=${link}]ENVIAR[/url]\n`;
            }
            out += `[/table]`;

            document.getElementById('twc_saida').value = out;
            Toast.success(`✅ ${combinacoes.length} ataque(s) gerado(s) (Modo Simples - emparelhamento 1:1)!`);

        } catch (error) {
            Toast.error(`❌ Erro: ${error.message}`);
        }
    }

    // ============================================
    // CRIAÇÃO DO PAINEL
    // ============================================
    let offsetX, offsetY, dragging = false;
    let minimizado = false; // Movido para fora da função para ser global

    function criarInterface() {
        if (painelElemento) {
            painelElemento.style.display = 'flex';
            return;
        }

        painelElemento = document.createElement('div');
        painelElemento.id = 'twc-painel';

        const tropasGridHtml = UNIDADES_IDS.map(id => `
            <div class="tropa-item">
                <span class="tropa-label">
                    <img src="${UNIDADES[id].icon}" style="width: 20px; height: 20px; vertical-align: middle;" title="${UNIDADES[id].nome}">
                </span>
                <input type="number" id="tropas_${id}" value="0" min="0" step="1" style="width: 60px; padding: 3px; text-align: center;">
            </div>
        `).join('');

        painelElemento.innerHTML = `
            <style>
                #twc-painel {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    width: 560px;
                    background: #1e1e1e;
                    color: #fff;
                    border-radius: 10px;
                    z-index: 999999;
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
                .campo input, .campo select {
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
                button.primary {
                    background: #2980b9;
                    color: #fff;
                }
                .botoes-linha {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                    margin-bottom: 10px;
                }
                hr {
                    border-color: #333;
                    margin: 10px 0;
                }
                [data-tooltip] {
                    cursor: help;
                    border-bottom: 1px dotted #666;
                }
                textarea {
                    width: 100%;
                    padding: 6px;
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    border-radius: 4px;
                    box-sizing: border-box;
                    font-family: monospace;
                    font-size: 11px;
                    resize: vertical;
                }
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }
                .checkbox-label input {
                    width: auto;
                    margin: 0;
                }
                .info-text {
                    font-size: 10px;
                    color: #888;
                    margin-top: 5px;
                    text-align: center;
                }
            </style>

            <div class="painel-header" id="twc-painel-header">
                <h3>🗺️ Coordenador de Ataques TW</h3>
                <div>
                    <button id="twc-minimizarBtn">−</button>
                    <button id="twc-fecharBtn" style="background:#990000; margin-left:5px;">✕</button>
                </div>
            </div>

            <div class="painel-conteudo" id="twc-painel-conteudo">
                <div class="campo">
                    <label data-tooltip="Coordenadas separadas por espaço">🏠 Vilas Origem</label>
                    <input type="text" id="twc_origens" placeholder="Ex: 500|500 501|501">
                </div>

                <div class="campo">
                    <label data-tooltip="Coordenadas separadas por espaço">🎯 Vilas Destino</label>
                    <input type="text" id="twc_destinos" placeholder="Ex: 510|510 511|511">
                </div>

                <div class="info-text">
                    💡 <strong>Modo Múltiplo:</strong> todas combinações | <strong>Modo Simples:</strong> emparelhamento 1:1
                </div>

                <div class="linha-dupla">
                    <div class="campo">
                        <label>📅 Tipo de Cálculo</label>
                        <select id="twc_tipoCalculo">
                            <option value="chegada">Por Hora de Chegada</option>
                            <option value="lancamento">Por Hora de Lançamento</option>
                        </select>
                    </div>
                    <div class="campo">
                        <label>📈 Bônus Sinal (%)</label>
                        <input type="number" id="twc_bonusSinal" value="0" min="0" max="100">
                    </div>
                </div>

                <div class="linha-dupla">
                    <div class="campo">
                        <label>🔀 Ordenação (Múltiplo)</label>
                        <select id="twc_ordenacao">
                            <option value="digitacao">Por Ordem de Digitação</option>
                            <option value="lancamento">Por Horário de Lançamento</option>
                            <option value="chegada">Por Horário de Chegada</option>
                            <option value="distancia">Por Distância</option>
                        </select>
                    </div>
                    <div class="campo">
                        <label class="checkbox-label">
                            <input type="checkbox" id="twc_incrementarSegundos">
                            ⏱️ Incrementar por ataque
                        </label>
                        <div style="display:flex; gap:5px; margin-top:5px;">
                            <input type="number" id="twc_valorIncremento" value="5" min="1" max="60" style="width:70px;">
                            <span style="font-size:11px;">segundo(s)</span>
                        </div>
                    </div>
                </div>

                <div id="twc_campoChegada">
                    <div class="campo">
                        <label>⏰ Hora de Chegada</label>
                        <input type="text" id="twc_horaChegada" placeholder="DD/MM/AAAA HH:MM:SS">
                    </div>
                </div>

                <div id="twc_campoLancamento" style="display:none;">
                    <div class="campo">
                        <label>🚀 Hora de Lançamento</label>
                        <input type="text" id="twc_horaLancamento" placeholder="DD/MM/AAAA HH:MM:SS">
                    </div>
                </div>

                <div class="tropas-grid">
                    ${tropasGridHtml}
                </div>

                <div class="botoes-linha">
                    <button id="twc_limparTropas" class="danger">🗑️ Limpar Tropas</button>
                    <button id="twc_velocidadesBtn" class="success">⚙️ Velocidades</button>
                </div>

                <hr>

                <div class="botoes-linha">
                    <button id="twc_gerarMultiploBtn" class="primary">🌐 Gerar BBCode (Múltiplo)</button>
                    <button id="twc_gerarSimplesBtn" class="success">🎯 Gerar BBCode (Simples 1:1)</button>
                    <button id="twc_copiarBtn">📄 Copiar</button>
                    <button id="twc_salvarBtn">💾 Salvar Config</button>
                </div>

                <div class="campo">
                    <label>📊 Resultado:</label>
                    <textarea id="twc_saida" rows="8" placeholder="O BBCode gerado aparecerá aqui..."></textarea>
                </div>
            </div>
        `;

        document.body.appendChild(painelElemento);
        painelAtivo = true;

        // ============================================
        // EVENTOS
        // ============================================

        const header = document.getElementById('twc-painel-header');
        const conteudo = document.getElementById('twc-painel-conteudo');
        const minimizarBtn = document.getElementById('twc-minimizarBtn');
        const fecharBtn = document.getElementById('twc-fecharBtn');

        header.addEventListener('mousedown', (e) => {
            if (e.target === minimizarBtn || e.target === fecharBtn) return;
            dragging = true;
            const rect = painelElemento.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (dragging && painelElemento) {
                const x = e.clientX - offsetX;
                const y = e.clientY - offsetY;
                const maxX = window.innerWidth - painelElemento.offsetWidth;
                const maxY = window.innerHeight - painelElemento.offsetHeight;
                painelElemento.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
                painelElemento.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
                painelElemento.style.right = 'auto';
                painelElemento.style.bottom = 'auto';
            }
        });

        document.addEventListener('mouseup', () => { dragging = false; });

        // Carregar estado minimizado do localStorage
        const savedMinimized = localStorage.getItem('twc_painel_minimizado');
        if (savedMinimized === 'true') {
            minimizado = true;
            conteudo.style.display = 'none';
            minimizarBtn.textContent = '+';
        } else {
            minimizado = false;
            conteudo.style.display = 'block';
            minimizarBtn.textContent = '−';
        }

        minimizarBtn.addEventListener('click', () => {
            minimizado = !minimizado;
            conteudo.style.display = minimizado ? 'none' : 'block';
            minimizarBtn.textContent = minimizado ? '+' : '−';
            // Salvar estado minimizado
            localStorage.setItem('twc_painel_minimizado', minimizado);
        });

        fecharBtn.addEventListener('click', () => {
            painelElemento.remove();
            painelElemento = null;
            painelAtivo = false;
        });

        document.getElementById('twc_tipoCalculo').addEventListener('change', (e) => {
            const isChegada = e.target.value === 'chegada';
            document.getElementById('twc_campoChegada').style.display = isChegada ? 'block' : 'none';
            document.getElementById('twc_campoLancamento').style.display = isChegada ? 'none' : 'block';
        });

        document.getElementById('twc_limparTropas').addEventListener('click', () => {
            UNIDADES_IDS.forEach(id => {
                const input = document.getElementById(`tropas_${id}`);
                if (input) input.value = '0';
            });
            Toast.success('✅ Tropas limpas!');
        });

        document.getElementById('twc_velocidadesBtn').addEventListener('click', () => {
            mostrarPopupVelocidades();
        });

        document.getElementById('twc_gerarMultiploBtn').addEventListener('click', gerarBBCodeMultiplo);
        document.getElementById('twc_gerarSimplesBtn').addEventListener('click', gerarBBCodeSimples);

        document.getElementById('twc_copiarBtn').addEventListener('click', () => {
            const saida = document.getElementById('twc_saida');
            if (!saida.value.trim()) {
                Toast.error('❌ Nada para copiar!');
                return;
            }
            saida.select();
            navigator.clipboard.writeText(saida.value).then(() => {
                Toast.success('✅ BBCode copiado!');
            }).catch(() => {
                document.execCommand('copy');
                Toast.success('✅ BBCode copiado!');
            });
        });

        document.getElementById('twc_salvarBtn').addEventListener('click', salvarConfiguracoesAtuais);

        carregarConfiguracoesSalvas();
    }

    function salvarConfiguracoesAtuais() {
        const config = {
            destinos: document.getElementById('twc_destinos').value,
            origens: document.getElementById('twc_origens').value,
            tipoCalculo: document.getElementById('twc_tipoCalculo').value,
            bonusSinal: document.getElementById('twc_bonusSinal').value,
            ordenacao: document.getElementById('twc_ordenacao').value,
            horaChegada: document.getElementById('twc_horaChegada').value,
            horaLancamento: document.getElementById('twc_horaLancamento').value,
            incrementarSegundos: document.getElementById('twc_incrementarSegundos').checked,
            valorIncremento: document.getElementById('twc_valorIncremento').value,
            tropas: getTropas(),
            velocidades: velocidadesUnidades,
            minimizado: minimizado // Salvar estado minimizado
        };
        salvarConfiguracao(config);
        Toast.success('✅ Configurações salvas!');
    }

    function carregarConfiguracoesSalvas() {
        const config = carregarConfiguracao();
        if (!config) return;

        if (config.destinos) document.getElementById('twc_destinos').value = config.destinos;
        if (config.origens) document.getElementById('twc_origens').value = config.origens;
        if (config.tipoCalculo) document.getElementById('twc_tipoCalculo').value = config.tipoCalculo;
        if (config.bonusSinal) document.getElementById('twc_bonusSinal').value = config.bonusSinal;
        if (config.ordenacao) document.getElementById('twc_ordenacao').value = config.ordenacao;
        if (config.horaChegada) document.getElementById('twc_horaChegada').value = config.horaChegada;
        if (config.horaLancamento) document.getElementById('twc_horaLancamento').value = config.horaLancamento;
        if (config.incrementarSegundos !== undefined) {
            document.getElementById('twc_incrementarSegundos').checked = config.incrementarSegundos;
        }
        if (config.valorIncremento) document.getElementById('twc_valorIncremento').value = config.valorIncremento;

        if (config.tropas) {
            for (const [id, valor] of Object.entries(config.tropas)) {
                const input = document.getElementById(`tropas_${id}`);
                if (input) input.value = valor;
            }
        }

        if (config.velocidades) {
            velocidadesUnidades = { ...velocidadesUnidades, ...config.velocidades };
        }

        // Carregar estado minimizado
        if (config.minimizado !== undefined) {
            minimizado = config.minimizado;
            const conteudo = document.getElementById('twc-painel-conteudo');
            const minimizarBtn = document.getElementById('twc-minimizarBtn');
            if (conteudo && minimizarBtn) {
                conteudo.style.display = minimizado ? 'none' : 'block';
                minimizarBtn.textContent = minimizado ? '+' : '−';
            }
        }

        document.getElementById('twc_tipoCalculo').dispatchEvent(new Event('change'));
        Toast.info('📂 Configurações carregadas!');
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    async function inicializar() {
        if (painelAtivo) return;

        // Inicializar Velocity Manager - buscar velocidades REAIS da API
        Toast.info('🔍 Buscando velocidades do mundo...');
        const velocidadesReais = await VelocityManager.getVelocidades();

        if (velocidadesReais) {
            for (const [id, vel] of Object.entries(velocidadesReais)) {
                if (UNIDADES[id]) {
                    velocidadesUnidades[id] = vel;
                }
            }
            const worldInfo = VelocityManager.getWorldInfo();
            Toast.success(`✅ Velocidades carregadas do mundo ${worldInfo.world}!`);
        } else {
            // Fallback para valores padrão
            for (const [id, data] of Object.entries(UNIDADES)) {
                velocidadesUnidades[id] = data.velocidade;
            }
            Toast.info('⚠️ Usando velocidades padrão (fallback)');
        }

        await loadVillageTxt();
        criarInterface();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }

})();
