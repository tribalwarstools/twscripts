// ==UserScript==
// @name         TW Auto Builder
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  Construção automática de edifícios por aldeia
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // EDIFÍCIOS
    // ============================================
    const EDIFICIOS = {
        'main':       'Edifício principal',
        'barracks':   'Quartel',
        'stable':     'Estábulo',
        'garage':     'Oficina',
        'church':     'Igreja',
        'watchtower': 'Torre de vigia',
        'snob':       'Academia',
        'smith':      'Ferreiro',
        'place':      'Praça de reunião',
        'statue':     'Estátua',
        'market':     'Mercado',
        'wood':       'Bosque',
        'stone':      'Poço de argila',
        'iron':       'Mina de ferro',
        'farm':       'Fazenda',
        'storage':    'Armazém',
        'hide':       'Esconderijo',
        'wall':       'Muralha'
    };

    const ORDEM_ORIGINAL = [
        'main','barracks','stable','garage','church','watchtower',
        'snob','smith','place','statue','market','wood','stone',
        'iron','farm','storage','hide','wall'
    ];

    // ============================================
    // CONFIGURAÇÕES PADRÃO
    // ============================================
    const DEFAULTS = {
        pausaAldeias:  3000,
        pausaCiclos:   60000,
        minimizado:    false,
        posX:          null,
        posY:          null,
        totalConstruido: 0,
        maxQueueSlots: 2,
        ativado:       false
    };

    function getDefaultMaxLevels() {
        const l = {};
        Object.keys(EDIFICIOS).forEach(k => {
            if (['main','farm','storage','wood','stone','iron'].includes(k)) l[k] = 30;
            else if (['barracks','market'].includes(k)) l[k] = 25;
            else if (['stable','smith','wall','watchtower'].includes(k)) l[k] = 20;
            else if (k === 'garage') l[k] = 15;
            else if (k === 'hide') l[k] = 10;
            else if (k === 'church') l[k] = 3;
            else l[k] = 1;
        });
        return l;
    }

    let ATIVADO             = false;
    let PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
    let PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
    let MINIMIZADO          = DEFAULTS.minimizado;
    let POS_X               = DEFAULTS.posX;
    let POS_Y               = DEFAULTS.posY;
    let totalConstruido     = DEFAULTS.totalConstruido;
    let maxQueueSlots       = DEFAULTS.maxQueueSlots;
    let priorityBuildings   = [...ORDEM_ORIGINAL];
    let enabledBuildings    = {};
    let maxLevels           = {};
    let configAldeias       = {};
    let csrfCache           = null;

    Object.keys(EDIFICIOS).forEach(k => { enabledBuildings[k] = true; });
    Object.assign(maxLevels, getDefaultMaxLevels());

    let rodando    = false;
    let cicloAtivo = false;
    let cicloAtual = 0;
    let painel     = null;
    let modalAldeias   = null;
    let modalEdificios = null;
    let _countdownInterval = null;

    // ============================================
    // PERSISTÊNCIA
    // ============================================
    const STORAGE_KEY = 'twb_builder_v5';

    function salvarEstado() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            pausaAldeias:    PAUSA_ENTRE_ALDEIAS,
            pausaCiclos:     PAUSA_ENTRE_CICLOS,
            minimizado:      MINIMIZADO,
            posX:            POS_X,
            posY:            POS_Y,
            totalConstruido: totalConstruido,
            maxQueueSlots:   maxQueueSlots,
            priorityBuildings,
            enabledBuildings,
            maxLevels,
            configAldeias,
            cicloAtual,
            ativado:         ATIVADO
        }));
    }

    function carregarEstado() {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (!salvo) return;
        const d = JSON.parse(salvo);
        PAUSA_ENTRE_ALDEIAS = d.pausaAldeias    || DEFAULTS.pausaAldeias;
        PAUSA_ENTRE_CICLOS  = d.pausaCiclos     || DEFAULTS.pausaCiclos;
        MINIMIZADO          = d.minimizado      || false;
        POS_X               = d.posX            ?? null;
        POS_Y               = d.posY            ?? null;
        totalConstruido     = d.totalConstruido || 0;
        maxQueueSlots       = d.maxQueueSlots   || DEFAULTS.maxQueueSlots;
        priorityBuildings   = d.priorityBuildings || [...ORDEM_ORIGINAL];
        enabledBuildings    = d.enabledBuildings  || {};
        maxLevels           = d.maxLevels         || {};
        configAldeias       = d.configAldeias     || {};
        cicloAtual          = d.cicloAtual        || 0;
        ATIVADO             = d.ativado === true;  // Carrega o estado do botão

        const def = getDefaultMaxLevels();
        Object.keys(EDIFICIOS).forEach(k => {
            if (enabledBuildings[k] === undefined) enabledBuildings[k] = true;
            if (!maxLevels[k]) maxLevels[k] = def[k];
        });

        const aguardar = setInterval(() => {
            if (painel) {
                clearInterval(aguardar);
                aplicarEstadoNaUI();
                // Se estava ativado antes do reload, reinicia a execução
                if (ATIVADO && !rodando) {
                    iniciar();
                }
            }
        }, 100);
    }

    function resetarTudo() {
        ATIVADO = false; rodando = false; cicloAtivo = false;
        PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
        PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
        MINIMIZADO          = false;
        POS_X = null; POS_Y = null;
        totalConstruido     = 0;
        maxQueueSlots       = DEFAULTS.maxQueueSlots;
        cicloAtual          = 0;
        priorityBuildings   = [...ORDEM_ORIGINAL];
        Object.keys(EDIFICIOS).forEach(k => { enabledBuildings[k] = true; });
        Object.assign(maxLevels, getDefaultMaxLevels());
        configAldeias = {};
        localStorage.removeItem(STORAGE_KEY);
        if (painel) { painel.style.left='auto'; painel.style.top='auto'; painel.style.right='20px'; painel.style.bottom='20px'; }
        aplicarEstadoNaUI();
        adicionarLog('Reiniciado.', 'warn');
    }

    function aplicarEstadoNaUI() {
        const inpAldeias = document.getElementById('twb-pausa-aldeias');
        const inpCiclos  = document.getElementById('twb-pausa-ciclos');
        const body       = document.getElementById('twb-body');
        const minimizar  = document.getElementById('twb-minimizar');
        if (inpAldeias) inpAldeias.value      = PAUSA_ENTRE_ALDEIAS;
        if (inpCiclos)  inpCiclos.value       = PAUSA_ENTRE_CICLOS / 1000;
        if (body)       body.style.display    = MINIMIZADO ? 'none' : 'flex';
        if (minimizar)  minimizar.textContent = MINIMIZADO ? '+' : '−';
        atualizarBotao(ATIVADO);
        atualizarMetricas();
        atualizarContadorAldeias();
        atualizarResumoEdificios();
    }

    function atualizarContadorAldeias() {
        const el = document.getElementById('twb-aldeias-config');
        if (!el) return;
        const total = Object.keys(configAldeias).length;
        el.textContent = total === 0 ? 'Nenhuma aldeia configurada' : `${total} aldeia(s) configurada(s)`;
        el.style.color = total === 0 ? '#888' : '#aaa';
    }

    function atualizarResumoEdificios() {
        const el = document.getElementById('twb-edificios-resumo');
        if (!el) return;
        const total = Object.keys(EDIFICIOS).length;
        const ativos = Object.values(enabledBuildings).filter(Boolean).length;
        el.textContent = `${ativos}/${total} edifícios ativos`;
    }

    // ============================================
    // CSRF
    // ============================================
    function obterCsrf() {
        if (!csrfCache) csrfCache = window.game_data?.csrf || null;
        return csrfCache;
    }

    // ============================================
    // VALIDAÇÃO
    // ============================================
    function validarCampos() {
        let ok = true;
        const inpA = document.getElementById('twb-pausa-aldeias');
        const va = parseInt(inpA?.value);
        const validA = !isNaN(va) && va >= 500;
        if (inpA) inpA.style.borderColor = validA ? '#444' : '#e24b4a';
        const errA = document.getElementById('twb-err-aldeias');
        if (errA) errA.style.display = validA ? 'none' : 'block';
        if (!validA) ok = false;

        const inpC = document.getElementById('twb-pausa-ciclos');
        const vc = parseInt(inpC?.value);
        const validC = !isNaN(vc) && vc >= 10;
        if (inpC) inpC.style.borderColor = validC ? '#444' : '#e24b4a';
        const errC = document.getElementById('twb-err-ciclos');
        if (errC) errC.style.display = validC ? 'none' : 'block';
        if (!validC) ok = false;

        if (Object.keys(configAldeias).length === 0) {
            adicionarLog('Configure ao menos uma aldeia antes de iniciar.', 'err');
            ok = false;
        }
        return ok;
    }

    // ============================================
    // LOG
    // ============================================
    function adicionarLog(msg, tipo) {
        const log = document.getElementById('twb-log');
        if (!log) return;
        const t = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
        const cores = { ok:'#22a55a', err:'#e24b4a', warn:'#c97c00', build:'#7c5cbf', info:'#888' };
        const cor = cores[tipo] || '#888';
        if (log.children.length === 1 && log.children[0].dataset?.placeholder) log.innerHTML = '';
        const entry = document.createElement('div');
        entry.style.cssText = 'display:flex;gap:8px;font-size:10px;margin-bottom:2px;font-family:monospace;';
        entry.innerHTML = `<span style="color:#555;flex-shrink:0;">${t}</span><span style="color:${cor};">${msg}</span>`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        while (log.children.length > 50) log.removeChild(log.children[0]);
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ============================================
    // LÓGICA DE CONSTRUÇÃO — CORRIGIDA
    // ============================================

    // Extrai BuildingMain.buildings do HTML via parser robusto de objetos JS
    function extrairBuildings(source) {
        const searchStr = 'BuildingMain.buildings = ';
        const startIdx = source.indexOf(searchStr);
        if (startIdx === -1) return null;

        const objectStart = source.indexOf('{', startIdx + searchStr.length);
        if (objectStart === -1) return null;

        let depth = 0, inString = false, stringChar = '', escaped = false;
        for (let i = objectStart; i < source.length; i++) {
            const c = source[i];
            if (escaped)                          { escaped = false; continue; }
            if (c === '\\' && inString)          { escaped = true;  continue; }
            if (!inString && (c === '"' || c === "'")) { inString = true; stringChar = c; continue; }
            if (inString && c === stringChar)     { inString = false; continue; }
            if (!inString) {
                if (c === '{') depth++;
                else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(source.substring(objectStart, i + 1)); } catch(e) { return null; } } }
            }
        }
        return null;
    }

    // Extrai order_count do HTML
    function extrairOrderCount(source) {
        const match = source.match(/BuildingMain\.order_count\s*=\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    async function fetchVillageData(villageId) {
        try {
            const url = `/game.php?village=${villageId}&screen=main`;
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res.ok) return null;

            const text = await res.text();

            const buildings = extrairBuildings(text);
            if (!buildings) return null;

            const orderCount = extrairOrderCount(text);

            const upgradeLinkMatch = text.match(/upgrade_building_link\s*=\s*'([^']+)'/);
            const upgradeLink = upgradeLinkMatch ? upgradeLinkMatch[1] : null;

            const csrfMatch = text.match(/"csrf"\s*:\s*"([a-f0-9]+)"/);
            if (csrfMatch) csrfCache = csrfMatch[1];

            return { buildings, orderCount, upgradeLink };

        } catch(err) {
            console.error('[Builder] fetchVillageData:', err);
            return null;
        }
    }

    function podeConstruir(b) {
        if (!b) return { pode: false, motivo: 'inexistente' };
        if (!enabledBuildings[b.id]) return { pode: false, motivo: 'desativado' };
        if ((parseInt(b.level) || 0) >= (maxLevels[b.id] || 30)) return { pode: false, motivo: 'nível_máximo' };
        if (b.order != null) return { pode: false, motivo: 'na_fila' };
        if (!b.can_build) return { pode: false, motivo: 'requisitos_não_atendidos' };
        if (b.error) {
            if (/recursos dispon/i.test(b.error)) return { pode: false, motivo: 'recursos_futuros', detalhe: b.error };
            if (/fazenda.*pequena|armazém.*pequeno/i.test(b.error)) return { pode: false, motivo: 'bloqueado', detalhe: b.error };
            return { pode: false, motivo: 'erro', detalhe: b.error };
        }
        return { pode: true };
    }

    function escolherEdificio(buildings) {
        for (const id of priorityBuildings) {
            const b = buildings[id];
            const check = podeConstruir(b);
            if (check.pode) return b;
        }
        return null;
    }

    async function construir(villageId, building, upgradeLink) {
        try {
            if (!upgradeLink) return { sucesso: false, motivo: 'upgrade_building_link não encontrado no HTML' };

            const url = `${upgradeLink}&id=${building.id}`;

            const res = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (!res.ok) return { sucesso: false, motivo: `HTTP ${res.status}` };

            const text = await res.text();
            let json = null;
            try { json = JSON.parse(text); } catch(e) {}

            if (json?.response?.success) {
                if (json.game_data?.csrf) csrfCache = json.game_data.csrf;
                return { sucesso: true };
            }

            if (json?.response?.error) return { sucesso: false, motivo: json.response.error };
            if (json?.error) {
                const msg = Array.isArray(json.error) ? json.error[0] : json.error;
                if (/sess/i.test(msg)) csrfCache = null;
                return { sucesso: false, motivo: msg };
            }

            if (/BuildingMain\.buildings/.test(text)) return { sucesso: true };

            return { sucesso: false, motivo: 'Resposta não reconhecida' };

        } catch(err) {
            return { sucesso: false, motivo: err.message };
        }
    }

    // ============================================
    // PROCESSAMENTO POR ALDEIA
    // ============================================
    async function processarAldeia(villageId) {
        const cfg = configAldeias[villageId];
        if (!cfg) return;

        const dados = await fetchVillageData(villageId);
        if (!dados) {
            adicionarLog(`${cfg.nome}: erro ao carregar dados`, 'err');
            return;
        }

        const { buildings, orderCount, upgradeLink } = dados;
        const slotsDisponiveis = maxQueueSlots - orderCount;

        if (slotsDisponiveis <= 0) {
            adicionarLog(`${cfg.nome}: fila cheia (${orderCount}/${maxQueueSlots})`, 'info');
            return;
        }

        const edificio = escolherEdificio(buildings);
        if (!edificio) {
            adicionarLog(`${cfg.nome}: nada para construir`, 'info');
            return;
        }

        const resultado = await construir(villageId, edificio, upgradeLink);
        if (resultado.sucesso) {
            totalConstruido++;
            salvarEstado();
            atualizarMetricas();
            adicionarLog(`${cfg.nome}: ${edificio.name} → nível ${(parseInt(edificio.level) || 0) + 1}`, 'build');
        } else {
            adicionarLog(`${cfg.nome}: ${edificio.name} — ${resultado.motivo}`, 'warn');
        }
    }

    // ============================================
    // CICLO PRINCIPAL
    // ============================================
    function startCountdown(seconds) {
        if (_countdownInterval) clearInterval(_countdownInterval);
        const el = document.getElementById('twb-countdown');
        if (!el) return;
        let rem = seconds;
        el.textContent = `⏱ Próximo ciclo: ${rem}s`;
        _countdownInterval = setInterval(() => {
            rem--;
            if (rem <= 0) { clearInterval(_countdownInterval); _countdownInterval = null; if (el) el.textContent = ''; }
            else if (el) el.textContent = `⏱ Próximo ciclo: ${rem}s`;
        }, 1000);
    }

    async function escanearEConstruir() {
        if (!ATIVADO || cicloAtivo) return;
        cicloAtivo = true;
        cicloAtual++;
        atualizarMetricas();

        const aldeias = Object.entries(configAldeias);
        adicionarLog(`Ciclo ${cicloAtual} — ${aldeias.length} aldeia(s)`, 'ok');

        try {
            for (const [id] of aldeias) {
                if (!ATIVADO) break;
                await processarAldeia(parseInt(id));
                await sleep(PAUSA_ENTRE_ALDEIAS);
            }
            adicionarLog(`Ciclo ${cicloAtual} concluído. Total: ${totalConstruido}`, 'ok');
        } catch(err) {
            adicionarLog('Erro no ciclo: ' + err.message, 'err');
        }

        cicloAtivo = false;

        if (ATIVADO) {
            startCountdown(Math.round(PAUSA_ENTRE_CICLOS / 1000));
            await sleep(PAUSA_ENTRE_CICLOS);
            if (ATIVADO) escanearEConstruir();
        }
    }

    // ============================================
    // CONTROLE
    // ============================================
    async function iniciar() {
        if (rodando) return;
        rodando = true;
        adicionarLog(`Iniciando — ${Object.keys(configAldeias).length} aldeia(s)`, 'ok');
        await sleep(500);
        escanearEConstruir();
    }

    function parar() {
        rodando = false;
        if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
        const el = document.getElementById('twb-countdown');
        if (el) el.textContent = '';
        adicionarLog(`Parado. Total: ${totalConstruido} construídos`, 'warn');
    }

    function toggle() {
        ATIVADO = !ATIVADO;
        ATIVADO ? iniciar() : parar();
        atualizarBotao(ATIVADO);
        salvarEstado();
    }

    // ============================================
    // UI
    // ============================================
    function atualizarMetricas() {
        const metT = document.getElementById('twb-met-total');
        const metC = document.getElementById('twb-met-ciclos');
        if (metT) metT.textContent = totalConstruido;
        if (metC) metC.textContent = cicloAtual;
    }

    function atualizarBotao(ativo) {
        const btn  = document.getElementById('twb-botao');
        const dot  = document.getElementById('twb-dot');
        const stat = document.getElementById('twb-status');
        if (dot)  dot.style.background = ativo ? '#22a55a' : '#e24b4a';
        if (stat) stat.textContent     = ativo ? `Rodando — Ciclo ${cicloAtual}` : `Parado — ${totalConstruido} construídos`;
        if (btn) {
            btn.innerHTML        = ativo ? '⏹ Parar' : '▶ Construir';
            btn.style.background = ativo ? '#c0392b' : '#e67e22';
        }
        atualizarMetricas();
    }

    // ============================================
    // PAINEL PRINCIPAL
    // ============================================
    function criarPainel() {
        if (painel) return;

        const inputStyle = 'width:100%;padding:6px 8px;background:#111;border:1px solid #444;color:#e0e0e0;border-radius:6px;font-size:12px;box-sizing:border-box;';
        const labelStyle = 'display:block;margin-bottom:4px;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.4px;';
        const errStyle   = 'display:none;font-size:10px;color:#e24b4a;margin-top:3px;';

        painel = document.createElement('div');
        painel.style.cssText = `
            position:fixed;bottom:20px;right:20px;width:300px;
            background:#000000;border:1px solid #e67e22;border-radius:12px;
            z-index:999999;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#e0e0e0;
        `;

        if (POS_X !== null && POS_Y !== null) {
            const x = Math.max(0, Math.min(POS_X, window.innerWidth  - 300));
            const y = Math.max(0, Math.min(POS_Y, window.innerHeight - 100));
            painel.style.left = x+'px'; painel.style.top = y+'px';
            painel.style.right = 'auto'; painel.style.bottom = 'auto';
        }

        const totalConfig = Object.keys(configAldeias).length;

        painel.innerHTML = `
            <div id="twb-header" style="background:#1a1a1a;padding:10px 14px;border-radius:11px 11px 0 0;display:flex;align-items:center;justify-content:space-between;cursor:move;border-bottom:1px solid #e67e22;user-select:none;">
                <span style="font-weight:bold;color:#e67e22;font-size:13px;">🏗️ Auto Builder</span>
                <button id="twb-minimizar" style="background:#3a3a3a;border:none;color:#ccc;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;">${MINIMIZADO ? '+' : '−'}</button>
            </div>

            <div id="twb-body" style="padding:14px;display:${MINIMIZADO ? 'none' : 'flex'};flex-direction:column;gap:12px;background:#000000;">

                <div style="display:flex;align-items:center;gap:10px;background:#0a0a0a;border-radius:8px;padding:8px 12px;border:1px solid #222;">
                    <div id="twb-dot" style="width:10px;height:10px;border-radius:50%;background:#e24b4a;flex-shrink:0;transition:background .3s;"></div>
                    <span id="twb-status" style="font-weight:500;font-size:12px;color:#e67e22;">Parado</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div style="background:#0a0a0a;border-radius:8px;padding:10px;text-align:center;border:1px solid #222;">
                        <div style="font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;">Construídos</div>
                        <div id="twb-met-total" style="font-size:24px;font-weight:bold;color:#e67e22;">${totalConstruido}</div>
                    </div>
                    <div style="background:#0a0a0a;border-radius:8px;padding:10px;text-align:center;border:1px solid #222;">
                        <div style="font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;">Ciclos</div>
                        <div id="twb-met-ciclos" style="font-size:24px;font-weight:bold;color:#e67e22;">${cicloAtual}</div>
                    </div>
                </div>

                <div style="border-top:1px solid #222;"></div>

                <div>
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Aldeias</div>
                    <div id="twb-aldeias-config" style="font-size:11px;margin-bottom:8px;color:${totalConfig === 0 ? '#e24b4a' : '#aaa'};">
                        ${totalConfig === 0 ? 'Nenhuma aldeia configurada' : `${totalConfig} aldeia(s) configurada(s)`}
                    </div>
                    <button id="twb-btn-aldeias" style="width:100%;padding:8px;border:1px solid #e67e22;border-radius:8px;font-size:12px;cursor:pointer;background:#0a0a0a;color:#e67e22;font-weight:bold;">
                        ⚙ Configurar Aldeias
                    </button>
                </div>

                <div style="border-top:1px solid #222;"></div>

                <div>
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Edifícios</div>
                    <div id="twb-edificios-resumo" style="font-size:11px;color:#888;margin-bottom:8px;text-align:center;"></div>
                    <button id="twb-btn-edificios" style="width:100%;padding:8px;border:1px solid #e67e22;border-radius:8px;font-size:12px;cursor:pointer;background:#0a0a0a;color:#e67e22;font-weight:bold;">
                        🏛️ Configurar Edifícios
                    </button>
                </div>

                <div style="border-top:1px solid #222;"></div>

                <div>
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Intervalos</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label style="${labelStyle}" for="twb-pausa-aldeias">Entre aldeias (ms)</label>
                            <input type="number" id="twb-pausa-aldeias" value="${PAUSA_ENTRE_ALDEIAS}" min="500" max="30000" step="100" style="${inputStyle}">
                            <span id="twb-err-aldeias" style="${errStyle}">Mín. 500 ms</span>
                        </div>
                        <div>
                            <label style="${labelStyle}" for="twb-pausa-ciclos">Entre ciclos (s)</label>
                            <input type="number" id="twb-pausa-ciclos" value="${PAUSA_ENTRE_CICLOS / 1000}" min="10" max="3600" step="1" style="${inputStyle}">
                            <span id="twb-err-ciclos" style="${errStyle}">Mín. 10 s</span>
                        </div>
                    </div>
                </div>

                <div style="border-top:1px solid #222;"></div>

                <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch;">
                    <button id="twb-botao" style="padding:10px;border:none;border-radius:8px;font-weight:bold;font-size:13px;cursor:pointer;background:#e67e22;color:#000;transition:opacity .15s;">
                        ▶ Construir
                    </button>
                    <button id="twb-reset" title="Reiniciar tudo" style="padding:10px 12px;border:1px solid #e67e22;border-radius:8px;font-size:12px;cursor:pointer;background:#0a0a0a;color:#e67e22;font-weight:bold;white-space:nowrap;">
                        ↺ Reiniciar
                    </button>
                </div>

                <div>
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Registro</div>
                    <div id="twb-log" style="background:#0a0a0a;border:1px solid #222;border-radius:6px;padding:8px;font-family:monospace;color:#888;max-height:120px;overflow-y:auto;min-height:60px;display:flex;flex-direction:column;gap:2px;">
                        <div data-placeholder="1" style="color:#555;font-size:10px;">Aguardando...</div>
                    </div>
                </div>

                <div id="twb-countdown" style="font-size:10px;color:#888;text-align:center;min-height:14px;"></div>

            </div>
        `;

        document.body.appendChild(painel);

        // Inputs
        const inpA = document.getElementById('twb-pausa-aldeias');
        const inpC = document.getElementById('twb-pausa-ciclos');

        inpA.addEventListener('input', () => {
            const v = parseInt(inpA.value);
            if (!isNaN(v) && v >= 500) { PAUSA_ENTRE_ALDEIAS = v; salvarEstado(); }
            document.getElementById('twb-err-aldeias').style.display = (!isNaN(v) && v >= 500) ? 'none' : 'block';
            inpA.style.borderColor = (!isNaN(v) && v >= 500) ? '#444' : '#e24b4a';
        });

        inpC.addEventListener('input', () => {
            const v = parseInt(inpC.value);
            if (!isNaN(v) && v >= 10) { PAUSA_ENTRE_CICLOS = v * 1000; salvarEstado(); }
            document.getElementById('twb-err-ciclos').style.display = (!isNaN(v) && v >= 10) ? 'none' : 'block';
            inpC.style.borderColor = (!isNaN(v) && v >= 10) ? '#444' : '#e24b4a';
        });

        document.getElementById('twb-btn-aldeias').addEventListener('click', abrirModalAldeias);
        document.getElementById('twb-btn-edificios').addEventListener('click', abrirModalEdificios);
        document.getElementById('twb-botao').addEventListener('click', () => {
            if (!ATIVADO && !validarCampos()) return;
            toggle();
        });
        document.getElementById('twb-reset').addEventListener('click', () => {
            if (confirm('Reiniciar tudo? Isso vai parar o builder, zerar contadores e apagar as configurações.')) resetarTudo();
        });

        const minimizar = document.getElementById('twb-minimizar');
        const body      = document.getElementById('twb-body');
        minimizar.addEventListener('click', () => {
            MINIMIZADO = body.style.display !== 'none';
            body.style.display    = MINIMIZADO ? 'none' : 'flex';
            minimizar.textContent = MINIMIZADO ? '+' : '−';
            salvarEstado();
        });

        // Drag
        const header = document.getElementById('twb-header');
        let dragging = false, startX, startY, startLeft, startTop;
        header.addEventListener('mousedown', e => {
            if (e.target === minimizar) return;
            dragging = true; startX = e.clientX; startY = e.clientY;
            const rect = painel.getBoundingClientRect();
            startLeft = rect.left; startTop = rect.top;
            painel.style.left = startLeft+'px'; painel.style.top = startTop+'px';
            painel.style.right = 'auto'; painel.style.bottom = 'auto';
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            let l = Math.max(0, Math.min(startLeft+(e.clientX-startX), window.innerWidth -painel.offsetWidth));
            let t = Math.max(0, Math.min(startTop +(e.clientY-startY), window.innerHeight-painel.offsetHeight));
            painel.style.left = l+'px'; painel.style.top = t+'px';
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return; dragging = false;
            const rect = painel.getBoundingClientRect();
            POS_X = Math.round(rect.left); POS_Y = Math.round(rect.top);
            salvarEstado();
        });

        atualizarResumoEdificios();
    }

    // ============================================
    // MODAL ALDEIAS
    // ============================================
    async function abrirModalAldeias() {
        if (modalAldeias) { modalAldeias.style.display = 'flex'; return; }

        modalAldeias = document.createElement('div');
        modalAldeias.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000000;display:flex;align-items:center;justify-content:center;font-family:"Segoe UI",Arial,sans-serif;';

        const container = document.createElement('div');
        container.style.cssText = 'background:#000000;border:1px solid #e67e22;border-radius:14px;width:500px;max-width:95vw;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;color:#e0e0e0;font-size:13px;';

        container.innerHTML = `
            <div style="background:#1a1a1a;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e67e22;flex-shrink:0;">
                <span style="font-weight:bold;color:#e67e22;font-size:14px;">⚙ Configurar Aldeias</span>
                <button id="twb-mal-fechar" style="background:#3a3a3a;border:none;color:#ccc;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="padding:10px 18px;border-bottom:1px solid #222;flex-shrink:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <button id="twb-mal-all"  style="padding:4px 10px;border:1px solid #e67e22;border-radius:6px;background:#0a0a0a;color:#e67e22;font-size:11px;cursor:pointer;">✓ Todas</button>
                <button id="twb-mal-none" style="padding:4px 10px;border:1px solid #3a3a3a;border-radius:6px;background:#0a0a0a;color:#888;font-size:11px;cursor:pointer;">✕ Nenhuma</button>
                <button id="twb-mal-reload" style="margin-left:auto;padding:5px 14px;border:1px solid #e67e22;border-radius:6px;background:#0a0a0a;color:#e67e22;font-size:11px;font-weight:bold;cursor:pointer;">↻ Recarregar</button>
            </div>
            <div id="twb-mal-lista" style="overflow-y:auto;flex:1;padding:14px 18px;display:flex;flex-direction:column;gap:8px;">
                <div style="color:#888;font-size:12px;text-align:center;padding:20px 0;">Carregando...</div>
            </div>
            <div style="padding:12px 18px;border-top:1px solid #222;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
                <button id="twb-mal-cancelar" style="padding:8px 18px;border:1px solid #444;border-radius:8px;background:#0a0a0a;color:#ccc;font-size:12px;cursor:pointer;">Cancelar</button>
                <button id="twb-mal-salvar"   style="padding:8px 18px;border:none;border-radius:8px;background:#e67e22;color:#000;font-size:12px;font-weight:bold;cursor:pointer;">Salvar</button>
            </div>
        `;

        modalAldeias.appendChild(container);
        document.body.appendChild(modalAldeias);

        modalAldeias.addEventListener('click', e => { if (e.target === modalAldeias) fecharModalAldeias(); });
        document.getElementById('twb-mal-fechar').addEventListener('click', fecharModalAldeias);
        document.getElementById('twb-mal-cancelar').addEventListener('click', fecharModalAldeias);
        document.getElementById('twb-mal-salvar').addEventListener('click', salvarConfigAldeias);
        document.getElementById('twb-mal-all').addEventListener('click', () =>
            document.querySelectorAll('#twb-mal-lista .twb-vc').forEach(cb => cb.checked = true));
        document.getElementById('twb-mal-none').addEventListener('click', () =>
            document.querySelectorAll('#twb-mal-lista .twb-vc').forEach(cb => cb.checked = false));
        document.getElementById('twb-mal-reload').addEventListener('click', async () => {
            const btn = document.getElementById('twb-mal-reload');
            btn.textContent = '⏳'; btn.disabled = true;
            await carregarAldeiasModal();
            btn.textContent = '↻ Recarregar'; btn.disabled = false;
        });

        await carregarAldeiasModal();
    }

    function fecharModalAldeias() { if (modalAldeias) modalAldeias.style.display = 'none'; }

    async function carregarAldeiasModal() {
        const lista = document.getElementById('twb-mal-lista');
        if (!lista) return;
        lista.innerHTML = '<div style="color:#888;font-size:12px;text-align:center;padding:20px 0;">Carregando...</div>';
        try {
            const res = await fetch('/map/village.txt', { credentials: 'same-origin' });
            if (!res.ok) throw new Error('Falha ao carregar village.txt');
            const dados = await res.text();
            const meuId = window.game_data?.player?.id;
            if (!meuId) throw new Error('ID do jogador não encontrado');

            const aldeias = dados.trim().split('\n')
                .map(line => {
                    const [id, name, x, y, player, points] = line.split(',');
                    return { id: parseInt(id), nome: decodeURIComponent(name.replace(/\+/g,' ')), coord: `${x}|${y}`, player: parseInt(player), points: parseInt(points)||0 };
                })
                .filter(v => v.player === meuId)
                .sort((a, b) => a.nome.localeCompare(b.nome));

            lista.innerHTML = '';
            aldeias.forEach(a => {
                const cfg = configAldeias[a.id] || {};
                const row = document.createElement('div');
                row.dataset.villageId = a.id;
                row.style.cssText = 'background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:12px;';

                const cb = document.createElement('input');
                cb.type = 'checkbox'; cb.className = 'twb-vc';
                cb.checked = cfg.enabled !== false && !!configAldeias[a.id];
                cb.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:#e67e22;';

                const info = document.createElement('div');
                info.style.cssText = 'flex:1;';
                info.innerHTML = `<div style="font-weight:bold;font-size:12px;color:#e67e22;">${a.nome}</div><div style="font-size:10px;color:#555;">${a.coord} · ${a.points.toLocaleString()} pts</div>`;

                row.appendChild(cb);
                row.appendChild(info);
                lista.appendChild(row);
            });
        } catch(err) {
            lista.innerHTML = `<div style="color:#e24b4a;font-size:12px;text-align:center;padding:20px 0;">Erro: ${err.message}</div>`;
        }
    }

    function salvarConfigAldeias() {
        const lista = document.getElementById('twb-mal-lista');
        if (!lista) return;
        const nova = {};
        lista.querySelectorAll('[data-village-id]').forEach(row => {
            const id = parseInt(row.dataset.villageId);
            const cb = row.querySelector('.twb-vc');
            const nome = row.querySelector('div[style*="font-weight"]')?.textContent.trim() || `Aldeia ${id}`;
            if (cb?.checked) nova[id] = { nome, enabled: true };
        });
        configAldeias = nova;
        salvarEstado();
        atualizarContadorAldeias();
        fecharModalAldeias();
        adicionarLog(`${Object.keys(configAldeias).length} aldeia(s) configurada(s).`, 'ok');
    }

    // ============================================
    // MODAL EDIFÍCIOS
    // ============================================
    function abrirModalEdificios() {
        if (modalEdificios) { modalEdificios.style.display = 'flex'; return; }

        modalEdificios = document.createElement('div');
        modalEdificios.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000001;display:flex;align-items:center;justify-content:center;font-family:"Segoe UI",Arial,sans-serif;';

        const container = document.createElement('div');
        container.style.cssText = 'background:#000000;border:1px solid #e67e22;border-radius:14px;width:520px;max-width:95vw;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;color:#e0e0e0;font-size:13px;';

        container.innerHTML = `
            <div style="background:#1a1a1a;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e67e22;flex-shrink:0;">
                <span style="font-weight:bold;color:#e67e22;font-size:14px;">🏛️ Configurar Edifícios</span>
                <button id="twb-med-fechar" style="background:#3a3a3a;border:none;color:#ccc;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="padding:10px 18px;border-bottom:1px solid #222;flex-shrink:0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <button id="twb-med-all"     style="padding:4px 10px;border:1px solid #e67e22;border-radius:6px;background:#0a0a0a;color:#e67e22;font-size:11px;cursor:pointer;">✓ Todos</button>
                <button id="twb-med-none"    style="padding:4px 10px;border:1px solid #3a3a3a;border-radius:6px;background:#0a0a0a;color:#888;font-size:11px;cursor:pointer;">✕ Nenhum</button>
                <button id="twb-med-ordem"   style="padding:4px 10px;border:1px solid #e67e22;border-radius:6px;background:#0a0a0a;color:#e67e22;font-size:11px;cursor:pointer;">↺ Ordem original</button>
                <button id="twb-med-padrao"  style="padding:4px 10px;border:1px solid #e67e22;border-radius:6px;background:#0a0a0a;color:#e67e22;font-size:11px;cursor:pointer;">↺ Níveis padrão</button>
            </div>
            <div style="padding:6px 18px;border-bottom:1px solid #222;flex-shrink:0;display:grid;grid-template-columns:24px 1fr 70px 30px;gap:8px;font-size:10px;color:#888;text-transform:uppercase;">
                <div></div><div>Edifício</div><div style="text-align:center;">Nível máx.</div><div></div>
            </div>
            <div id="twb-med-lista" style="overflow-y:auto;flex:1;padding:10px 18px;display:flex;flex-direction:column;gap:4px;"></div>
            <div style="padding:12px 18px;border-top:1px solid #222;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
                <button id="twb-med-cancelar" style="padding:8px 18px;border:1px solid #444;border-radius:8px;background:#0a0a0a;color:#ccc;font-size:12px;cursor:pointer;">Cancelar</button>
                <button id="twb-med-salvar"   style="padding:8px 18px;border:none;border-radius:8px;background:#e67e22;color:#000;font-size:12px;font-weight:bold;cursor:pointer;">Salvar</button>
            </div>
        `;

        modalEdificios.appendChild(container);
        document.body.appendChild(modalEdificios);

        modalEdificios.addEventListener('click', e => { if (e.target === modalEdificios) fecharModalEdificios(); });
        document.getElementById('twb-med-fechar').addEventListener('click', fecharModalEdificios);
        document.getElementById('twb-med-cancelar').addEventListener('click', fecharModalEdificios);
        document.getElementById('twb-med-salvar').addEventListener('click', salvarConfigEdificios);
        document.getElementById('twb-med-all').addEventListener('click', () => {
            document.querySelectorAll('#twb-med-lista .twb-ec').forEach(cb => { cb.checked = true; enabledBuildings[cb.dataset.id] = true; });
            atualizarResumoEdificios();
        });
        document.getElementById('twb-med-none').addEventListener('click', () => {
            document.querySelectorAll('#twb-med-lista .twb-ec').forEach(cb => { cb.checked = false; enabledBuildings[cb.dataset.id] = false; });
            atualizarResumoEdificios();
        });
        document.getElementById('twb-med-ordem').addEventListener('click', () => {
            priorityBuildings = [...ORDEM_ORIGINAL];
            carregarEdificiosModal();
            adicionarLog('Ordem restaurada.', 'ok');
        });
        document.getElementById('twb-med-padrao').addEventListener('click', () => {
            const def = getDefaultMaxLevels();
            Object.assign(maxLevels, def);
            document.querySelectorAll('#twb-med-lista input[type="number"]').forEach(inp => {
                inp.value = maxLevels[inp.dataset.id] || 1;
            });
        });

        carregarEdificiosModal();
    }

    function fecharModalEdificios() { if (modalEdificios) modalEdificios.style.display = 'none'; }

    function carregarEdificiosModal() {
        const lista = document.getElementById('twb-med-lista');
        if (!lista) return;
        lista.innerHTML = '';

        let dragSrc = null;

        priorityBuildings.forEach(id => {
            const row = document.createElement('div');
            row.draggable = true;
            row.dataset.id = id;
            row.style.cssText = 'background:#0a0a0a;border:1px solid #222;border-radius:6px;padding:7px 10px;display:grid;grid-template-columns:24px 1fr 70px 30px;gap:8px;align-items:center;cursor:default;';

            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.className = 'twb-ec'; cb.dataset.id = id;
            cb.checked = enabledBuildings[id] !== false;
            cb.style.cssText = 'width:15px;height:15px;cursor:pointer;accent-color:#e67e22;';
            cb.addEventListener('change', () => { enabledBuildings[id] = cb.checked; atualizarResumoEdificios(); });

            const nome = document.createElement('span');
            nome.style.cssText = 'font-size:12px;color:#e0e0e0;';
            nome.textContent = EDIFICIOS[id];

            const inp = document.createElement('input');
            inp.type = 'number'; inp.dataset.id = id;
            inp.value = maxLevels[id] || 1; inp.min = 0; inp.max = 30;
            inp.style.cssText = 'width:100%;padding:3px 5px;background:#000;border:1px solid #e67e22;color:#e67e22;border-radius:4px;text-align:center;font-size:11px;';
            inp.addEventListener('change', () => { maxLevels[id] = Math.min(30, Math.max(0, parseInt(inp.value)||0)); });

            const handle = document.createElement('span');
            handle.textContent = '⋮⋮'; handle.style.cssText = 'color:#e67e22;cursor:grab;font-size:14px;text-align:center;';

            row.appendChild(cb); row.appendChild(nome); row.appendChild(inp); row.appendChild(handle);

            row.addEventListener('dragstart', e => { dragSrc = id; e.dataTransfer.effectAllowed = 'move'; row.style.opacity = '0.4'; });
            row.addEventListener('dragend',   () => { row.style.opacity = '1'; });
            row.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; row.style.background = '#1a1a1a'; });
            row.addEventListener('dragleave', () => { row.style.background = '#0a0a0a'; });
            row.addEventListener('drop', e => {
                e.preventDefault();
                row.style.background = '#0a0a0a';
                if (!dragSrc || dragSrc === id) return;
                document.querySelectorAll('#twb-med-lista input[type="number"]').forEach(i => { maxLevels[i.dataset.id] = parseInt(i.value)||0; });
                document.querySelectorAll('#twb-med-lista .twb-ec').forEach(c => { enabledBuildings[c.dataset.id] = c.checked; });
                const fi = priorityBuildings.indexOf(dragSrc);
                const ti = priorityBuildings.indexOf(id);
                if (fi !== -1 && ti !== -1) {
                    priorityBuildings.splice(fi, 1);
                    priorityBuildings.splice(ti, 0, dragSrc);
                }
                carregarEdificiosModal();
            });

            lista.appendChild(row);
        });
    }

    function salvarConfigEdificios() {
        document.querySelectorAll('#twb-med-lista input[type="number"]').forEach(i => { maxLevels[i.dataset.id] = parseInt(i.value)||0; });
        document.querySelectorAll('#twb-med-lista .twb-ec').forEach(c => { enabledBuildings[c.dataset.id] = c.checked; });
        salvarEstado();
        atualizarResumoEdificios();
        fecharModalEdificios();
        adicionarLog('Edifícios configurados.', 'ok');
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    carregarEstado();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', criarPainel);
    } else {
        criarPainel();
    }

})();
