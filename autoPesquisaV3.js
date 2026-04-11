// ==UserScript==
// @name         Tribal Wars - Pesquisa Automática
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Pesquisa unidades por categoria (Infantaria/Cavalaria/Armas de cerco) por aldeia
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CATEGORIAS E UNIDADES
    // ============================================
    const CATEGORIAS = {
        infantaria: {
            nome:  'Infantaria',
            cor:   '#9b59b6',
            icone: '⚔️',
            unidades: ['spear', 'sword', 'axe', 'archer']
        },
        cavalaria: {
            nome:  'Cavalaria',
            cor:   '#8e44ad',
            icone: '🐴',
            unidades: ['spy', 'light', 'marcher', 'heavy']
        },
        cerco: {
            nome:  'Armas de cerco',
            cor:   '#7d3c98',
            icone: '🪨',
            unidades: ['ram', 'catapult']
        }
    };

    const NOMES_UNIDADES = {
        spear:    'Lanceiro',
        sword:    'Espadachim',
        axe:      'Bárbaro',
        archer:   'Arqueiro',
        spy:      'Explorador',
        light:    'Cavalaria leve',
        marcher:  'Arqueiro a cavalo',
        heavy:    'Cavalaria pesada',
        ram:      'Aríete',
        catapult: 'Catapulta'
    };

    // ============================================
    // CONFIGURAÇÕES PADRÃO
    // ============================================
    const DEFAULTS = {
        ativado:        false,
        pausaAldeias:   3000,
        pausaCiclos:    120000,
        minimizado:     false,
        posX:           null,
        posY:           null,
        totalPesquisado: 0,
        configAldeias:  {}
    };

    let ATIVADO             = DEFAULTS.ativado;
    let PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
    let PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
    let MINIMIZADO          = DEFAULTS.minimizado;
    let POS_X               = DEFAULTS.posX;
    let POS_Y               = DEFAULTS.posY;
    let totalPesquisado     = DEFAULTS.totalPesquisado;
    let configAldeias       = {};

    let csrfCache  = null;
    let rodando    = false;
    let cicloAtivo = false;
    let cicloAtual = 0;
    let painel     = null;
    let modal      = null;

    // ============================================
    // PERSISTÊNCIA
    // ============================================
    const STORAGE_KEY = 'twp_pesquisa_v3';

    function salvarEstado() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ativado:         ATIVADO,
            pausaAldeias:    PAUSA_ENTRE_ALDEIAS,
            pausaCiclos:     PAUSA_ENTRE_CICLOS,
            minimizado:      MINIMIZADO,
            posX:            POS_X,
            posY:            POS_Y,
            totalPesquisado: totalPesquisado,
            configAldeias:   configAldeias
        }));
    }

    function carregarEstado() {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) {
            const d = JSON.parse(salvo);
            ATIVADO             = false;
            PAUSA_ENTRE_ALDEIAS = d.pausaAldeias    || DEFAULTS.pausaAldeias;
            PAUSA_ENTRE_CICLOS  = d.pausaCiclos     || DEFAULTS.pausaCiclos;
            MINIMIZADO          = d.minimizado      || DEFAULTS.minimizado;
            POS_X               = d.posX            !== undefined ? d.posX : DEFAULTS.posX;
            POS_Y               = d.posY            !== undefined ? d.posY : DEFAULTS.posY;
            totalPesquisado     = d.totalPesquisado || DEFAULTS.totalPesquisado;
            configAldeias       = d.configAldeias   || {};

            const aguardar = setInterval(() => {
                if (painel) {
                    clearInterval(aguardar);
                    atualizarBotao(false);
                    atualizarMetricas();
                    atualizarContadorAldeias();
                }
            }, 100);
        }
    }

    function resetarTudo() {
        if (ATIVADO) { ATIVADO = false; rodando = false; cicloAtivo = false; }
        PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
        PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
        MINIMIZADO          = DEFAULTS.minimizado;
        POS_X               = DEFAULTS.posX;
        POS_Y               = DEFAULTS.posY;
        totalPesquisado     = DEFAULTS.totalPesquisado;
        cicloAtual          = 0;
        configAldeias       = {};
        csrfCache           = null;
        localStorage.removeItem(STORAGE_KEY);

        if (painel) {
            painel.style.left   = 'auto';
            painel.style.top    = 'auto';
            painel.style.right  = '20px';
            painel.style.bottom = '20px';
        }
        aplicarEstadoNaUI();
        adicionarLog('Reset completo. Configurações reiniciadas.', 'warn');
    }

    function aplicarEstadoNaUI() {
        const inpAldeias = document.getElementById('twp-pausa-aldeias');
        const inpCiclos  = document.getElementById('twp-pausa-ciclos');
        const body       = document.getElementById('twp-body');
        const minimizar  = document.getElementById('twp-minimizar');

        if (inpAldeias) inpAldeias.value      = PAUSA_ENTRE_ALDEIAS;
        if (inpCiclos)  inpCiclos.value       = PAUSA_ENTRE_CICLOS / 1000;
        if (body)       body.style.display    = MINIMIZADO ? 'none' : 'flex';
        if (minimizar)  minimizar.textContent = MINIMIZADO ? '+' : '−';

        atualizarBotao(false);
        atualizarMetricas();
        atualizarContadorAldeias();
    }

    function atualizarContadorAldeias() {
        const el = document.getElementById('twp-aldeias-config');
        if (!el) return;
        const total = Object.keys(configAldeias).length;
        el.textContent = total === 0 ? 'Nenhuma aldeia configurada' : `${total} aldeia(s) configurada(s)`;
        el.style.color = total === 0 ? '#9b59b6' : '#7d3c98';
    }

    // ============================================
    // VALIDAÇÃO
    // ============================================
    function validarCampos() {
        let ok = true;

        const inpAldeias = document.getElementById('twp-pausa-aldeias');
        const va = parseInt(inpAldeias?.value);
        const validA = !isNaN(va) && va >= 500;
        if (inpAldeias) inpAldeias.style.borderColor = validA ? '#333' : '#9b59b6';
        const errA = document.getElementById('twp-err-aldeias');
        if (errA) errA.style.display = validA ? 'none' : 'block';
        if (!validA) ok = false;

        const inpCiclos = document.getElementById('twp-pausa-ciclos');
        const vc = parseInt(inpCiclos?.value);
        const validC = !isNaN(vc) && vc >= 10;
        if (inpCiclos) inpCiclos.style.borderColor = validC ? '#333' : '#9b59b6';
        const errC = document.getElementById('twp-err-ciclos');
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
        const log = document.getElementById('twp-log');
        if (!log) return;
        const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const cores = { ok: '#9b59b6', err: '#e24b4a', warn: '#c97c00' };
        const cor = cores[tipo] || '#888';

        if (log.children.length === 1 && log.children[0].dataset?.placeholder) log.innerHTML = '';

        const entry = document.createElement('div');
        entry.style.cssText = 'display:flex;gap:8px;font-size:10px;margin-bottom:2px;font-family:monospace;';
        entry.innerHTML = `<span style="color:#555;flex-shrink:0;">${t}</span><span style="color:${cor};">${msg}</span>`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        while (log.children.length > 50) log.removeChild(log.children[0]);
    }

    // ============================================
    // LÓGICA DE PESQUISA
    // ============================================

    function obterCsrf() {
        if (!csrfCache) csrfCache = window.game_data?.csrf || null;
        return csrfCache;
    }

    async function obterEstadoFerraria(villageId) {
        try {
            const url      = `/game.php?village=${villageId}&screen=smith`;
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) return null;

            const html = await response.text();

            if (!html.includes('BuildingSmith')) return null;

            if (!csrfCache) {
                const m = html.match(/ajaxaction=research&(?:amp;)?h=([a-f0-9]+)/i);
                if (m) csrfCache = m[1];
            }

            const emAndamento = /class="timer"/.test(html);

            const techMatch = html.match(/BuildingSmith\.techs\s*=\s*(\{[\s\S]*?\});\s*[\r\n]/);
            let techs = {};
            if (techMatch) {
                try { techs = JSON.parse(techMatch[1]).available || {}; } catch (e) {
                    console.warn('[Pesquisa] Erro ao parsear techs:', e);
                }
            }

            return { techs, emAndamento, csrf: obterCsrf() };

        } catch (err) {
            console.error('[Pesquisa] obterEstadoFerraria erro:', err);
            return null;
        }
    }

    async function pesquisarUnidade(villageId, unidade, csrf) {
        try {
            const url = `/game.php?village=${villageId}&screen=smith&ajaxaction=research&h=${csrf}`;

            console.log(`[POST] village=${villageId} unit=${unidade} csrf=${csrf}`);

            const postResponse = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: `tech_id=${unidade}&source=${villageId}&h=${csrf}`
            });

            if (!postResponse.ok) return { success: false, reason: `HTTP ${postResponse.status}` };

            const rawText = await postResponse.text();
            console.log(`[RESP] village=${villageId} unit=${unidade}`, rawText.substring(0, 300));

            let json = null;
            try { json = JSON.parse(rawText); } catch(e) {}

            if (json) {
                if (json?.error) {
                    if (/sess.o|session|expirou|expired/i.test(JSON.stringify(json.error))) {
                        csrfCache = null;
                    }
                    return { success: false, reason: Array.isArray(json.error) ? json.error[0] : json.error };
                }
                if (json?.response?.tech_list) return { success: true };
                if (json?.response)            return { success: true };
            }

            if (/recursos insuficientes|not enough/i.test(rawText)) return { success: false, reason: 'Recursos insuficientes' };
            if (/em andamento|already/i.test(rawText))              return { success: false, reason: 'Pesquisa em andamento' };
            if (/fila.*cheia|queue.*full/i.test(rawText))           return { success: false, reason: 'Fila cheia' };

            return { success: true };

        } catch (err) {
            return { success: false, reason: err.message };
        }
    }

    async function processarAldeia(villageId, cfg) {
        const estado = await obterEstadoFerraria(villageId);

        if (!estado)            return [{ pulou: true, motivo: 'sem ferreiro ou erro ao carregar' }];
        if (estado.emAndamento) return [{ pulou: true, motivo: 'pesquisa em andamento / fila cheia' }];

        const resultados = [];

        for (const catKey of Object.keys(CATEGORIAS)) {
            if (!cfg[catKey]) continue;

            const cat = CATEGORIAS[catKey];

            for (const unidade of cat.unidades) {
                const tech = estado.techs[unidade];
                if (!tech) continue;

                const level       = parseInt(tech.level)       || 0;
                const levelAfter  = parseInt(tech.level_after) || 0;
                const canResearch = tech.can_research === true;

                if (level >= 1)      continue;
                if (levelAfter >= 1) continue;
                if (!canResearch)    continue;

                const resultado = await pesquisarUnidade(villageId, unidade, estado.csrf);

                if (resultado.success) {
                    resultados.push({ pulou: false, unidade, nomeUnidade: NOMES_UNIDADES[unidade], categoria: cat.nome });
                    await new Promise(r => setTimeout(r, 800));
                    const novoEstado = await obterEstadoFerraria(villageId);
                    if (!novoEstado || novoEstado.emAndamento) {
                        return resultados;
                    }
                } else {
                    resultados.push({ pulou: true, motivo: `${NOMES_UNIDADES[unidade]}: ${resultado.reason}` });
                }
                break;
            }
        }

        if (resultados.length === 0) {
            return [{ pulou: true, motivo: 'todas as tecnologias já pesquisadas ou indisponíveis' }];
        }

        return resultados;
    }

    // ============================================
    // CICLO PRINCIPAL
    // ============================================
    async function escanearEPesquisar() {
        if (!ATIVADO) return;
        if (cicloAtivo) return;

        cicloAtivo = true;
        cicloAtual++;
        atualizarMetricas();
        adicionarLog(`Ciclo ${cicloAtual} iniciado`, 'ok');

        console.log(`\n========================================`);
        console.log(`PESQUISA — CICLO ${cicloAtual} - ${new Date().toLocaleTimeString()}`);
        console.log(`========================================`);

        try {
            const aldeiasCfg = Object.entries(configAldeias);

            if (aldeiasCfg.length === 0) {
                adicionarLog('Nenhuma aldeia configurada.', 'warn');
                cicloAtivo = false;
                return;
            }

            adicionarLog(`${aldeiasCfg.length} aldeia(s) no ciclo`, 'ok');

            for (const [villageId, cfg] of aldeiasCfg) {
                if (!ATIVADO) break;

                console.log(`\n[${cfg.nome}]`);

                const resultados = await processarAldeia(parseInt(villageId), cfg);

                for (const r of resultados) {
                    if (!r.pulou) {
                        totalPesquisado++;
                        salvarEstado();
                        atualizarMetricas();
                        adicionarLog(`${cfg.nome}: pesquisando ${r.nomeUnidade} (${r.categoria})`, 'ok');
                        console.log(`  ✓ ${r.nomeUnidade} [${r.categoria}]`);
                    } else {
                        const tipo = r.motivo.includes('andamento') || r.motivo.includes('cheia') ? 'warn' : 'err';
                        adicionarLog(`${cfg.nome}: ${r.motivo}`, tipo);
                        console.log(`  — ${r.motivo}`);
                    }
                }

                await new Promise(r => setTimeout(r, PAUSA_ENTRE_ALDEIAS));
            }

            adicionarLog(`Ciclo ${cicloAtual} concluído. Total: ${totalPesquisado}`, 'ok');

        } catch (err) {
            adicionarLog('Erro no ciclo: ' + err.message, 'err');
            console.error('[Pesquisa] Erro:', err);
        }

        cicloAtivo = false;

        if (ATIVADO) {
            await new Promise(r => setTimeout(r, PAUSA_ENTRE_CICLOS));
            if (ATIVADO) escanearEPesquisar();
        }
    }

    // ============================================
    // CONTROLE
    // ============================================
    async function iniciar() {
        if (rodando) return;
        rodando = true;
        adicionarLog(`Iniciando — ${Object.keys(configAldeias).length} aldeia(s)`, 'ok');
        await new Promise(r => setTimeout(r, 500));
        escanearEPesquisar();
    }

    function parar() {
        rodando = false;
        adicionarLog(`Parado. Total: ${totalPesquisado} pesquisadas`, 'warn');
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
        const metT = document.getElementById('twp-met-total');
        const metC = document.getElementById('twp-met-ciclos');
        if (metT) metT.textContent = totalPesquisado;
        if (metC) metC.textContent = cicloAtual;
    }

    function atualizarBotao(ativo) {
        const btn  = document.getElementById('twp-botao');
        const dot  = document.getElementById('twp-dot');
        const stat = document.getElementById('twp-status');
        if (dot)  dot.style.background  = ativo ? '#9b59b6' : '#6c3483';
        if (stat) stat.textContent      = ativo ? `Rodando — Ciclo ${cicloAtual}` : `Parado — ${totalPesquisado} pesquisadas`;
        if (btn) {
            btn.innerHTML        = ativo ? '⏹ Parar' : '▶ Pesquisar';
            btn.style.background = ativo ? '#6c3483' : '#9b59b6';
            btn.style.color      = '#fff';
        }
        atualizarMetricas();
    }

    // ============================================
    // PAINEL PRINCIPAL
    // ============================================
    function criarPainel() {
        if (painel) return;

        const inputStyle = 'width:100%;padding:6px 8px;background:#0a0a0a;border:1px solid #333;color:#e0e0e0;border-radius:6px;font-size:12px;box-sizing:border-box;';
        const labelStyle = 'display:block;margin-bottom:4px;font-size:10px;color:#9b59b6;text-transform:uppercase;letter-spacing:.4px;';
        const errStyle   = 'display:none;font-size:10px;color:#9b59b6;margin-top:3px;';

        painel = document.createElement('div');
        painel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            background: #0a0a0a;
            border: 1px solid #9b59b6;
            border-radius: 12px;
            z-index: 999999;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            color: #e0e0e0;
        `;

        if (POS_X !== null && POS_Y !== null) {
            const x = Math.max(0, Math.min(POS_X, window.innerWidth  - 300));
            const y = Math.max(0, Math.min(POS_Y, window.innerHeight - 100));
            painel.style.left   = x + 'px';
            painel.style.top    = y + 'px';
            painel.style.right  = 'auto';
            painel.style.bottom = 'auto';
        }

        const totalConfig = Object.keys(configAldeias).length;

        painel.innerHTML = `
            <div id="twp-header" style="background:#111;padding:10px 14px;border-radius:11px 11px 0 0;display:flex;align-items:center;justify-content:space-between;cursor:move;border-bottom:1px solid #9b59b6;user-select:none;">
                <span style="font-weight:bold;color:#9b59b6;font-size:13px;">🔬 Pesquisa Automática</span>
                <button id="twp-minimizar" style="background:#1a1a1a;border:1px solid #9b59b6;color:#9b59b6;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;">${MINIMIZADO ? '+' : '−'}</button>
            </div>

            <div id="twp-body" style="padding:14px;display:${MINIMIZADO ? 'none' : 'flex'};flex-direction:column;gap:12px;">

                <div style="display:flex;align-items:center;gap:10px;background:#111;border:1px solid #9b59b633;border-radius:8px;padding:8px 12px;">
                    <div id="twp-dot" style="width:10px;height:10px;border-radius:50%;background:#6c3483;flex-shrink:0;transition:background .3s;"></div>
                    <span id="twp-status" style="font-weight:500;font-size:12px;color:#9b59b6;">Parado</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div style="background:#111;border:1px solid #9b59b633;border-radius:8px;padding:10px;text-align:center;">
                        <div style="font-size:10px;color:#9b59b6;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;">Pesquisadas</div>
                        <div id="twp-met-total" style="font-size:24px;font-weight:bold;color:#9b59b6;">${totalPesquisado}</div>
                    </div>
                    <div style="background:#111;border:1px solid #9b59b633;border-radius:8px;padding:10px;text-align:center;">
                        <div style="font-size:10px;color:#9b59b6;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;">Ciclos</div>
                        <div id="twp-met-ciclos" style="font-size:24px;font-weight:bold;color:#9b59b6;">${cicloAtual}</div>
                    </div>
                </div>

                <div style="border-top:1px solid #9b59b633;"></div>

                <div>
                    <div style="font-size:10px;color:#9b59b6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Aldeias</div>
                    <div id="twp-aldeias-config" style="font-size:11px;margin-bottom:8px;color:${totalConfig === 0 ? '#9b59b6' : '#7d3c98'};">
                        ${totalConfig === 0 ? 'Nenhuma aldeia configurada' : `${totalConfig} aldeia(s) configurada(s)`}
                    </div>
                    <button id="twp-btn-config" style="width:100%;padding:8px;border:1px solid #9b59b6;border-radius:8px;font-size:12px;cursor:pointer;background:#111;color:#9b59b6;font-weight:bold;">
                        ⚙ Configurar Aldeias
                    </button>
                </div>

                <div style="border-top:1px solid #9b59b633;"></div>

                <div>
                    <div style="font-size:10px;color:#9b59b6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Intervalos</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label style="${labelStyle}" for="twp-pausa-aldeias">Entre aldeias (ms)</label>
                            <input type="number" id="twp-pausa-aldeias" value="${PAUSA_ENTRE_ALDEIAS}" min="500" max="30000" step="100" style="${inputStyle}">
                            <span id="twp-err-aldeias" style="${errStyle}">Mín. 500 ms</span>
                        </div>
                        <div>
                            <label style="${labelStyle}" for="twp-pausa-ciclos">Entre ciclos (s)</label>
                            <input type="number" id="twp-pausa-ciclos" value="${PAUSA_ENTRE_CICLOS / 1000}" min="10" max="3600" step="1" style="${inputStyle}">
                            <span id="twp-err-ciclos" style="${errStyle}">Mín. 10 s</span>
                        </div>
                    </div>
                </div>

                <div style="border-top:1px solid #9b59b633;"></div>

                <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch;">
                    <button id="twp-botao" style="padding:10px;border:none;border-radius:8px;font-weight:bold;font-size:13px;cursor:pointer;background:#9b59b6;color:#fff;transition:opacity .15s;">
                        ▶ Pesquisar
                    </button>
                    <button id="twp-reset" title="Resetar tudo" style="padding:10px 12px;border:1px solid #9b59b6;border-radius:8px;font-size:12px;cursor:pointer;background:#111;color:#9b59b6;font-weight:bold;white-space:nowrap;">
                        ↺ Reiniciar
                    </button>
                </div>

                <div>
                    <div style="font-size:10px;color:#9b59b6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Registro</div>
                    <div id="twp-log" style="background:#050505;border:1px solid #9b59b633;border-radius:6px;padding:8px;font-family:monospace;color:#9b59b688;max-height:120px;overflow-y:auto;min-height:60px;display:flex;flex-direction:column;gap:2px;">
                        <div data-placeholder="1" style="color:#9b59b644;font-size:10px;">Aguardando...</div>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(painel);

        const inpAldeias = document.getElementById('twp-pausa-aldeias');
        const inpCiclos  = document.getElementById('twp-pausa-ciclos');

        inpAldeias.addEventListener('input', () => {
            const v = parseInt(inpAldeias.value);
            if (!isNaN(v) && v >= 500) { PAUSA_ENTRE_ALDEIAS = v; salvarEstado(); }
            const err = document.getElementById('twp-err-aldeias');
            if (err) err.style.display = (!isNaN(v) && v >= 500) ? 'none' : 'block';
            inpAldeias.style.borderColor = (!isNaN(v) && v >= 500) ? '#333' : '#9b59b6';
        });

        inpCiclos.addEventListener('input', () => {
            const v = parseInt(inpCiclos.value);
            if (!isNaN(v) && v >= 10) { PAUSA_ENTRE_CICLOS = v * 1000; salvarEstado(); }
            const err = document.getElementById('twp-err-ciclos');
            if (err) err.style.display = (!isNaN(v) && v >= 10) ? 'none' : 'block';
            inpCiclos.style.borderColor = (!isNaN(v) && v >= 10) ? '#333' : '#9b59b6';
        });

        document.getElementById('twp-btn-config').addEventListener('click', abrirModal);

        document.getElementById('twp-botao').addEventListener('click', () => {
            if (!ATIVADO && !validarCampos()) return;
            toggle();
        });

        document.getElementById('twp-reset').addEventListener('click', () => {
            if (confirm('Reiniciar tudo? Isso vai parar a pesquisa, zerar contadores e apagar as configurações.')) {
                resetarTudo();
            }
        });

        const minimizar = document.getElementById('twp-minimizar');
        const body      = document.getElementById('twp-body');
        minimizar.addEventListener('click', () => {
            MINIMIZADO = body.style.display !== 'none';
            body.style.display    = MINIMIZADO ? 'none' : 'flex';
            minimizar.textContent = MINIMIZADO ? '+' : '−';
            salvarEstado();
        });

        const header = document.getElementById('twp-header');
        let dragging = false, startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', e => {
            if (e.target === minimizar) return;
            dragging  = true;
            startX    = e.clientX;
            startY    = e.clientY;
            const rect = painel.getBoundingClientRect();
            startLeft  = rect.left;
            startTop   = rect.top;
            painel.style.left   = startLeft + 'px';
            painel.style.top    = startTop  + 'px';
            painel.style.right  = 'auto';
            painel.style.bottom = 'auto';
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            let newLeft = startLeft + (e.clientX - startX);
            let newTop  = startTop  + (e.clientY - startY);
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth  - painel.offsetWidth));
            newTop  = Math.max(0, Math.min(newTop,  window.innerHeight - painel.offsetHeight));
            painel.style.left = newLeft + 'px';
            painel.style.top  = newTop  + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            const rect = painel.getBoundingClientRect();
            POS_X = Math.round(rect.left);
            POS_Y = Math.round(rect.top);
            salvarEstado();
        });
    }

    // ============================================
    // MODAL DE CONFIGURAÇÃO POR ALDEIA
    // ============================================
    async function abrirModal() {
        if (modal) { modal.style.display = 'flex'; return; }

        modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85);
            z-index: 1000000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: #0a0a0a;
            border: 1px solid #9b59b6;
            border-radius: 14px;
            width: 620px;
            max-width: 95vw;
            max-height: 82vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            color: #e0e0e0;
            font-size: 13px;
        `;

        const legendaHtml = Object.entries(CATEGORIAS).map(([, cat]) =>
            `<span style="color:${cat.cor};font-weight:bold;">${cat.icone} ${cat.nome}:</span> <span style="color:#9b59b688;">${cat.unidades.map(u => NOMES_UNIDADES[u]).join(', ')}</span>`
        ).join('&nbsp;&nbsp;·&nbsp;&nbsp;');

        container.innerHTML = `
            <div style="background:#111;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #9b59b6;flex-shrink:0;">
                <span style="font-weight:bold;color:#9b59b6;font-size:14px;">⚙ Configurar Pesquisa por Aldeia</span>
                <button id="twp-modal-fechar" style="background:#1a1a1a;border:1px solid #9b59b6;color:#9b59b6;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>

            <div style="padding:10px 18px;border-bottom:1px solid #9b59b633;flex-shrink:0;font-size:11px;line-height:1.7;">
                ${legendaHtml}
            </div>

            <div style="padding:10px 18px;border-bottom:1px solid #9b59b633;flex-shrink:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-size:11px;color:#9b59b6;">Aplicar a todas:</span>
                ${Object.entries(CATEGORIAS).map(([key, cat]) => `
                    <button data-all="${key}" style="padding:4px 10px;border:1px solid ${cat.cor}44;border-radius:6px;background:${cat.cor}18;color:${cat.cor};font-size:11px;font-weight:bold;cursor:pointer;">
                        ${cat.icone} ${cat.nome}
                    </button>
                `).join('')}
                <button data-all="todas" style="padding:4px 10px;border:1px solid #9b59b6;border-radius:6px;background:#1a1a1a;color:#9b59b6;font-size:11px;cursor:pointer;">✓ Todas</button>
                <button data-all="nenhuma" style="padding:4px 10px;border:1px solid #333;border-radius:6px;background:#111;color:#9b59b688;font-size:11px;cursor:pointer;">✕ Nenhuma</button>
                <button id="twp-modal-carregar" style="margin-left:auto;padding:5px 14px;border:1px solid #9b59b6;border-radius:6px;background:#111;color:#9b59b6;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;">
                    ↻ Recarregar aldeias
                </button>
            </div>

            <div id="twp-modal-lista" style="overflow-y:auto;flex:1;padding:14px 18px;display:flex;flex-direction:column;gap:8px;">
                <div style="color:#9b59b688;font-size:12px;text-align:center;padding:20px 0;">Carregando...</div>
            </div>

            <div style="padding:12px 18px;border-top:1px solid #9b59b633;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
                <button id="twp-modal-cancelar" style="padding:8px 18px;border:1px solid #9b59b6;border-radius:8px;background:#111;color:#9b59b6;font-size:12px;cursor:pointer;">Cancelar</button>
                <button id="twp-modal-salvar" style="padding:8px 18px;border:none;border-radius:8px;background:#9b59b6;color:#fff;font-size:12px;font-weight:bold;cursor:pointer;">Salvar</button>
            </div>
        `;

        modal.appendChild(container);
        document.body.appendChild(modal);

        modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });
        document.getElementById('twp-modal-fechar').addEventListener('click', fecharModal);
        document.getElementById('twp-modal-cancelar').addEventListener('click', fecharModal);
        document.getElementById('twp-modal-salvar').addEventListener('click', salvarConfigAldeias);

        document.getElementById('twp-modal-carregar').addEventListener('click', async () => {
            const btn = document.getElementById('twp-modal-carregar');
            btn.textContent = '⏳ Carregando...';
            btn.disabled = true;
            await carregarAldeias();
            btn.textContent = '↻ Recarregar aldeias';
            btn.disabled = false;
        });

        container.querySelectorAll('[data-all]').forEach(btn => {
            btn.addEventListener('click', () => {
                const acao = btn.dataset.all;
                document.querySelectorAll('#twp-modal-lista [data-village-id]').forEach(row => {
                    Object.keys(CATEGORIAS).forEach(catKey => {
                        const cb = row.querySelector(`[data-cat="${catKey}"]`);
                        if (!cb) return;
                        if (Object.keys(CATEGORIAS).includes(acao)) {
                            if (acao === catKey) cb.checked = true;
                        } else if (acao === 'todas')   cb.checked = true;
                        else if (acao === 'nenhuma')   cb.checked = false;
                    });
                    atualizarBadgesRow(row);
                });
            });
        });

        await carregarAldeias();
    }

    function fecharModal() {
        if (modal) modal.style.display = 'none';
    }

    function atualizarBadgesRow(row) {
        const badgeDiv = row.querySelector('.twp-badges');
        if (!badgeDiv) return;
        const partes = [];
        Object.entries(CATEGORIAS).forEach(([key, cat]) => {
            const cb = row.querySelector(`[data-cat="${key}"]`);
            if (cb?.checked) partes.push(`<span style="color:${cat.cor};font-size:10px;">${cat.icone}</span>`);
        });
        badgeDiv.innerHTML = partes.length > 0 ? partes.join(' ') : '<span style="color:#555;font-size:10px;">nenhuma</span>';
    }

    function construirRowAldeia(aldeia) {
        const cfg = configAldeias[aldeia.id] || {};

        const row = document.createElement('div');
        row.dataset.villageId = aldeia.id;
        row.style.cssText = 'background:#111;border:1px solid #9b59b633;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:12px;';

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';
        info.innerHTML = `
            <div style="font-weight:bold;font-size:12px;color:#9b59b6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${aldeia.nome}</div>
            <div style="font-size:10px;color:#9b59b688;">${aldeia.coord}</div>
        `;
        row.appendChild(info);

        const checks = document.createElement('div');
        checks.style.cssText = 'display:flex;gap:10px;align-items:center;flex-shrink:0;';

        Object.entries(CATEGORIAS).forEach(([key, cat]) => {
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;';
            label.title = cat.nome + ': ' + cat.unidades.map(u => NOMES_UNIDADES[u]).join(', ');

            const cb = document.createElement('input');
            cb.type         = 'checkbox';
            cb.dataset.cat  = key;
            cb.checked      = !!cfg[key];
            cb.style.cssText = 'width:15px;height:15px;cursor:pointer;accent-color:' + cat.cor;
            cb.addEventListener('change', () => atualizarBadgesRow(row));

            const lbl = document.createElement('span');
            lbl.style.cssText = `font-size:10px;color:${cat.cor};font-weight:bold;`;
            lbl.textContent   = cat.icone;

            label.appendChild(cb);
            label.appendChild(lbl);
            checks.appendChild(label);
        });

        row.appendChild(checks);

        const badges = document.createElement('div');
        badges.className = 'twp-badges';
        badges.style.cssText = 'min-width:50px;text-align:right;';
        row.appendChild(badges);
        atualizarBadgesRow(row);

        return row;
    }

    async function carregarAldeias() {
        const lista = document.getElementById('twp-modal-lista');
        if (!lista) return;

        lista.innerHTML = `<div style="color:#9b59b688;font-size:12px;text-align:center;padding:20px 0;">Carregando...</div>`;

        try {
            const response = await fetch('/map/village.txt', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Falha ao carregar village.txt');

            const dados = await response.text();
            const meuId = window.game_data?.player?.id;
            if (!meuId) throw new Error('ID do jogador não encontrado');

            const minhasAldeias = dados.trim().split('\n')
                .map(line => {
                    const [id, name, x, y, player] = line.split(',');
                    return { id: parseInt(id), nome: decodeURIComponent(name.replace(/\+/g, ' ')), coord: `${x}|${y}`, player: parseInt(player) };
                })
                .filter(v => v.player === meuId)
                .sort((a, b) => a.nome.localeCompare(b.nome));

            lista.innerHTML = '';

            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;gap:12px;padding:0 14px 4px;';
            header.innerHTML = `
                <div style="flex:1;font-size:10px;color:#9b59b6;text-transform:uppercase;letter-spacing:.4px;">Aldeia</div>
                <div style="display:flex;gap:10px;flex-shrink:0;">
                    ${Object.entries(CATEGORIAS).map(([, cat]) =>
                        `<div style="width:32px;text-align:center;font-size:10px;color:${cat.cor};font-weight:bold;">${cat.icone}<br>${cat.nome}</div>`
                    ).join('')}
                </div>
                <div style="min-width:50px;"></div>
            `;
            lista.appendChild(header);

            minhasAldeias.forEach(aldeia => lista.appendChild(construirRowAldeia(aldeia)));

        } catch (err) {
            lista.innerHTML = `<div style="color:#9b59b6;font-size:12px;text-align:center;padding:20px 0;">Erro: ${err.message}</div>`;
        }
    }

    function salvarConfigAldeias() {
        const lista = document.getElementById('twp-modal-lista');
        if (!lista) return;

        const novaConfig = {};

        lista.querySelectorAll('[data-village-id]').forEach(row => {
            const villageId = parseInt(row.dataset.villageId);
            const nomeEl    = row.querySelector('div[style*="font-weight"]');
            const nome      = nomeEl ? nomeEl.textContent.trim() : `Aldeia ${villageId}`;

            const entry = { nome };
            let temAlguma = false;

            Object.keys(CATEGORIAS).forEach(key => {
                const cb = row.querySelector(`[data-cat="${key}"]`);
                entry[key] = cb?.checked || false;
                if (entry[key]) temAlguma = true;
            });

            if (temAlguma) novaConfig[villageId] = entry;
        });

        configAldeias = novaConfig;
        salvarEstado();
        atualizarContadorAldeias();
        fecharModal();

        const total = Object.keys(configAldeias).length;
        adicionarLog(`Configuração salva: ${total} aldeia(s).`, 'ok');
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
