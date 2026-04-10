// ==UserScript==
// @name         Tribal Wars - Cunhagem Automatica
// @namespace    http://tampermonkey.net/
// @version      21.0
// @description  Cunhagem automatica - Versao simplificada sem verificacao ambigua
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURACOES PADRAO
    // ============================================
    const DEFAULTS = {
        ativado:       false,
        quantidade:    1,
        cunharMaximo:  true,
        totalCunhado:  0,
        pausaAldeias:  2000,
        pausaCiclos:   30000,
        minimizado:    false,
        posX:          null,
        posY:          null
    };

    let ATIVADO             = DEFAULTS.ativado;
    let QUANTIDADE          = DEFAULTS.quantidade;
    let CUNHAR_MAXIMO       = DEFAULTS.cunharMaximo;
    let PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
    let PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
    let MINIMIZADO          = DEFAULTS.minimizado;
    let POS_X               = DEFAULTS.posX;
    let POS_Y               = DEFAULTS.posY;

    let rodando       = false;
    let cicloAtivo    = false;
    let painel        = null;
    let totalCunhado  = DEFAULTS.totalCunhado;
    let cicloAtual    = 0;
    let cacheAcademia = {};

    // ============================================
    // PERSISTENCIA
    // ============================================
    const STORAGE_KEY = 'tws_cunhagem_form_v2';

    function salvarEstado() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ativado:      ATIVADO,
            quantidade:   QUANTIDADE,
            cunharMaximo: CUNHAR_MAXIMO,
            totalCunhado: totalCunhado,
            pausaAldeias: PAUSA_ENTRE_ALDEIAS,
            pausaCiclos:  PAUSA_ENTRE_CICLOS,
            minimizado:   MINIMIZADO,
            posX:         POS_X,
            posY:         POS_Y
        }));
    }

    function carregarEstado() {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) {
            const dados = JSON.parse(salvo);
            ATIVADO             = dados.ativado !== undefined ? dados.ativado : DEFAULTS.ativado;
            QUANTIDADE          = dados.quantidade   || DEFAULTS.quantidade;
            CUNHAR_MAXIMO       = dados.cunharMaximo !== undefined ? dados.cunharMaximo : DEFAULTS.cunharMaximo;
            totalCunhado        = dados.totalCunhado || DEFAULTS.totalCunhado;
            PAUSA_ENTRE_ALDEIAS = dados.pausaAldeias || DEFAULTS.pausaAldeias;
            PAUSA_ENTRE_CICLOS  = dados.pausaCiclos  || DEFAULTS.pausaCiclos;
            MINIMIZADO          = dados.minimizado   || DEFAULTS.minimizado;
            POS_X               = dados.posX         !== undefined ? dados.posX : DEFAULTS.posX;
            POS_Y               = dados.posY         !== undefined ? dados.posY : DEFAULTS.posY;

            console.log('[Cunhagem] Estado carregado. Ativado:', ATIVADO ? 'LIGADO' : 'DESLIGADO');
        } else {
            console.log('[Cunhagem] Primeira execucao. Estado padrao: DESLIGADO');
        }
    }

    function resetarTudo() {
        const estavaRodando = ATIVADO;
        
        if (ATIVADO) {
            ATIVADO    = false;
            rodando    = false;
            cicloAtivo = false;
        }

        QUANTIDADE          = DEFAULTS.quantidade;
        CUNHAR_MAXIMO       = DEFAULTS.cunharMaximo;
        PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
        PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
        totalCunhado        = DEFAULTS.totalCunhado;
        cicloAtual          = 0;
        cacheAcademia       = {};
        MINIMIZADO          = DEFAULTS.minimizado;
        POS_X               = DEFAULTS.posX;
        POS_Y               = DEFAULTS.posY;

        localStorage.removeItem(STORAGE_KEY);

        if (painel) {
            painel.style.left   = 'auto';
            painel.style.top    = 'auto';
            painel.style.right  = '20px';
            painel.style.bottom = '20px';
        }

        aplicarEstadoNaUI();
        adicionarLog('Reset completo. Cache de academias limpo.', 'warn');
        console.log('[Cunhagem] Reset completo. localStorage limpo.');
        
        // Se estava rodando, reinicia automaticamente
        if (estavaRodando) {
            adicionarLog('Reiniciando automaticamente com cache limpo...', 'ok');
            setTimeout(() => {
                ATIVADO = true;
                iniciar();
                atualizarBotao(true);
            }, 1000);
        }
    }

    function aplicarEstadoNaUI() {
        const inpMaximo  = document.getElementById('tws-maximo');
        const inpQtd     = document.getElementById('tws-quantidade');
        const inpAldeias = document.getElementById('tws-pausa-aldeias');
        const inpCiclos  = document.getElementById('tws-pausa-ciclos');
        const qtdDiv     = document.getElementById('tws-quantidade-div');
        const body       = document.getElementById('tws-body');
        const minimizar  = document.getElementById('tws-minimizar');

        if (inpMaximo)  inpMaximo.checked   = CUNHAR_MAXIMO;
        if (inpQtd)     inpQtd.value        = QUANTIDADE;
        if (inpAldeias) inpAldeias.value    = PAUSA_ENTRE_ALDEIAS;
        if (inpCiclos)  inpCiclos.value     = PAUSA_ENTRE_CICLOS / 1000;
        if (qtdDiv)     qtdDiv.style.display = CUNHAR_MAXIMO ? 'none' : 'flex';

        if (body && minimizar) {
            body.style.display    = MINIMIZADO ? 'none' : 'flex';
            minimizar.textContent = MINIMIZADO ? '+' : '-';
        }

        atualizarBotao(ATIVADO);
        atualizarMetricas();

        ['tws-err-qtd', 'tws-err-aldeias', 'tws-err-ciclos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        ['tws-quantidade', 'tws-pausa-aldeias', 'tws-pausa-ciclos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.borderColor = '#444';
        });
    }

    // ============================================
    // VALIDACAO
    // ============================================
    function validarCampos() {
        let ok = true;

        if (!CUNHAR_MAXIMO) {
            const inpQtd = document.getElementById('tws-quantidade');
            const v = parseInt(inpQtd?.value);
            const valid = !isNaN(v) && v >= 1 && v <= 999;
            if (inpQtd) inpQtd.style.borderColor = valid ? '#444' : '#e24b4a';
            const err = document.getElementById('tws-err-qtd');
            if (err) err.style.display = valid ? 'none' : 'block';
            if (!valid) ok = false;
        }

        const inpAldeias = document.getElementById('tws-pausa-aldeias');
        const va = parseInt(inpAldeias?.value);
        const validA = !isNaN(va) && va >= 500;
        if (inpAldeias) inpAldeias.style.borderColor = validA ? '#444' : '#e24b4a';
        const errA = document.getElementById('tws-err-aldeias');
        if (errA) errA.style.display = validA ? 'none' : 'block';
        if (!validA) ok = false;

        const inpCiclos = document.getElementById('tws-pausa-ciclos');
        const vc = parseInt(inpCiclos?.value);
        const validC = !isNaN(vc) && vc >= 10;
        if (inpCiclos) inpCiclos.style.borderColor = validC ? '#444' : '#e24b4a';
        const errC = document.getElementById('tws-err-ciclos');
        if (errC) errC.style.display = validC ? 'none' : 'block';
        if (!validC) ok = false;

        return ok;
    }

    // ============================================
    // LOG NO PAINEL
    // ============================================
    function adicionarLog(msg, tipo) {
        const log = document.getElementById('tws-log');
        if (!log) return;
        const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const cores = { ok: '#22a55a', err: '#e24b4a', warn: '#c97c00' };
        const cor = cores[tipo] || '#888';

        if (log.children.length === 1 && log.children[0].dataset?.placeholder) {
            log.innerHTML = '';
        }

        const entry = document.createElement('div');
        entry.style.cssText = 'display:flex;gap:8px;font-size:10px;margin-bottom:2px;font-family:monospace;';
        entry.innerHTML = `<span style="color:#555;flex-shrink:0;">${t}</span><span style="color:${cor};">${msg}</span>`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;

        while (log.children.length > 50) log.removeChild(log.children[0]);
    }

    // ============================================
    // CUNHAGEM VIA FORMULARIO NATIVO (SIMPLIFICADA)
    // ============================================
    async function cunharMoedaViaFormulario(villageId, quantidade) {
        try {
            const url = `/game.php?village=${villageId}&screen=snob`;
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) return { success: false, reason: 'erro_acesso' };

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const form = doc.querySelector('form[action*="action=coin"]');

            if (!form) return { success: false, reason: 'formulario_nao_encontrado' };

            const inputCount = form.querySelector('#coin_mint_count, input[name="count"]');
            if (!inputCount) return { success: false, reason: 'campo_quantidade_nao_encontrado' };

            inputCount.value = quantidade;

            const actionUrl = form.getAttribute('action');
            const csrfMatch = actionUrl.match(/[&?]h=([a-f0-9]+)/i);
            const csrf = csrfMatch ? csrfMatch[1] : (window.game_data?.csrf || '');

            const formData = new URLSearchParams();
            form.querySelectorAll('input, select, textarea').forEach(input => {
                if (input.name && input.type !== 'submit' && input.type !== 'button') {
                    formData.append(input.name, input.value);
                }
            });
            formData.set('count', quantidade.toString());

            const postUrl = `/game.php?village=${villageId}&screen=snob&action=coin&h=${csrf}`;

            const postResponse = await fetch(postUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData.toString()
            });

            if (!postResponse.ok) {
                return { success: false, reason: `HTTP_${postResponse.status}` };
            }

            const texto = await postResponse.text();
            
            // Só verifica erros conhecidos
            if (/recursos insuficientes|not enough resources/i.test(texto)) {
                return { success: false, reason: 'recursos_insuficientes' };
            }
            if (/limite máximo|excede o limite|max limit/i.test(texto)) {
                return { success: false, reason: 'limite_atingido' };
            }

            // Se chegou aqui, assume sucesso (HTTP 200 + sem erros conhecidos)
            return { success: true, reason: 'sucesso', quantidade: quantidade };

        } catch (err) {
            console.error('[Cunhagem] Erro:', err);
            return { success: false, reason: err.message };
        }
    }

    // ============================================
    // FUNCAO PRINCIPAL DE CUNHAGEM
    // ============================================
    async function executarCunhagem(villageId) {
        try {
            const url = `/game.php?village=${villageId}&screen=snob`;
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) return { success: false, reason: 'erro_acesso_academia', maximo: 0 };

            const html = await response.text();
            const maxMatch = html.match(/id="coin_mint_fill_max"[^>]*>\((\d+)\)/i);
            const maximo = maxMatch ? parseInt(maxMatch[1]) : 0;

            if (maximo === 0) return { success: false, reason: 'sem_recursos_ou_limite', maximo: 0 };

            const quantidadeCunhar = CUNHAR_MAXIMO ? maximo : Math.min(QUANTIDADE, maximo);

            if (quantidadeCunhar === 0) return { success: false, reason: 'quantidade_invalida', maximo };

            adicionarLog(`${villageId}: tentando cunhar ${quantidadeCunhar} de ${maximo} possiveis`, 'warn');
            
            const resultado = await cunharMoedaViaFormulario(villageId, quantidadeCunhar);
            resultado.maximo     = maximo;
            resultado.quantidade = quantidadeCunhar;
            return resultado;

        } catch (err) {
            console.error('[Cunhagem] Erro:', err);
            return { success: false, reason: err.message, maximo: 0 };
        }
    }

    // ============================================
    // VERIFICAR SE TEM ACADEMIA
    // ============================================
    async function temAcademia(villageId) {
        if (cacheAcademia[villageId] !== undefined) return cacheAcademia[villageId];

        try {
            const url = `/game.php?village=${villageId}&screen=snob`;
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) { cacheAcademia[villageId] = false; return false; }

            const html = await response.text();
            const tem = html.includes('coin_mint_count') &&
                        (html.includes('Cunhar moedas') || html.includes('Academia'));
            cacheAcademia[villageId] = tem;
            return tem;

        } catch (err) {
            cacheAcademia[villageId] = false;
            return false;
        }
    }

    // ============================================
    // ESCANEAR E CUNHAR
    // ============================================
    async function escanearECunhar() {
        if (!ATIVADO) return;
        if (cicloAtivo) return;

        cicloAtivo = true;
        cicloAtual++;
        atualizarMetricas();
        adicionarLog(`Ciclo ${cicloAtual} iniciado`, 'ok');

        console.log(`\n========================================`);
        console.log(`CICLO ${cicloAtual} - ${new Date().toLocaleTimeString()}`);
        console.log(`Modo: ${CUNHAR_MAXIMO ? 'MAXIMO' : `${QUANTIDADE} por vez`}`);
        console.log(`========================================`);

        try {
            const response = await fetch('/map/village.txt', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Nao foi possivel carregar a lista de aldeias');

            const dados = await response.text();
            const meuId = window.game_data?.player?.id;

            if (!meuId) {
                adicionarLog('Erro: ID do jogador nao encontrado', 'err');
                cicloAtivo = false;
                return;
            }

            const minhasAldeias = dados.trim().split('\n')
                .map(line => {
                    const [id, name, x, y, player] = line.split(',');
                    return {
                        id:     parseInt(id),
                        name:   decodeURIComponent(name.replace(/\+/g, ' ')),
                        coord:  `${x}|${y}`,
                        player: parseInt(player)
                    };
                })
                .filter(v => v.player === meuId);

            adicionarLog(`${minhasAldeias.length} aldeia(s) encontrada(s)`, 'ok');

            let index = 0;
            for (const aldeia of minhasAldeias) {
                if (!ATIVADO) break;
                index++;

                const temAcad = await temAcademia(aldeia.id);
                if (!temAcad) {
                    console.log(`[${index}] ${aldeia.name} - sem Academia, ignorando`);
                    continue;
                }

                const resultado = await executarCunhagem(aldeia.id);

                if (resultado.success) {
                    totalCunhado += resultado.quantidade;
                    salvarEstado();
                    atualizarMetricas();
                    adicionarLog(`${aldeia.name}: +${resultado.quantidade} moeda(s) (HTTP 200)`, 'ok');
                    console.log(`[${index}] ${aldeia.name} - cunhou ${resultado.quantidade} (max: ${resultado.maximo})`);
                    await new Promise(r => setTimeout(r, 1000));
                } else {
                    const msgs = {
                        recursos_insuficientes: 'recursos insuficientes',
                        limite_atingido:        'limite de nobres atingido',
                        erro_acesso:            'erro ao acessar academia',
                        formulario_nao_encontrado: 'formulario nao encontrado',
                        campo_quantidade_nao_encontrado: 'campo quantidade nao encontrado',
                        erro_acesso_academia:   'falha ao carregar academia',
                        sem_recursos_ou_limite: 'sem recursos ou limite',
                        quantidade_invalida:    'quantidade invalida'
                    };
                    const motivo  = msgs[resultado.reason] || resultado.reason;
                    const tipoLog = resultado.reason === 'recursos_insuficientes' ? 'warn' : 'err';
                    adicionarLog(`${aldeia.name}: ${motivo}`, tipoLog);
                    console.log(`[${index}] ${aldeia.name} - ${motivo} (max: ${resultado.maximo || 0})`);
                }

                await new Promise(r => setTimeout(r, PAUSA_ENTRE_ALDEIAS));
            }

            adicionarLog(`Ciclo ${cicloAtual} concluido. Total: ${totalCunhado} moedas`, 'ok');
            console.log(`\nCiclo ${cicloAtual} finalizado. Proximo em ${PAUSA_ENTRE_CICLOS / 1000}s\n`);

        } catch (err) {
            adicionarLog('Erro no ciclo: ' + err.message, 'err');
            console.error('[Cunhagem] Erro:', err);
        }

        cicloAtivo = false;

        if (ATIVADO) {
            await new Promise(r => setTimeout(r, PAUSA_ENTRE_CICLOS));
            if (ATIVADO) escanearECunhar();
        }
    }

    // ============================================
    // CONTROLE
    // ============================================
    async function iniciar() {
        if (rodando) return;
        rodando = true;
        cacheAcademia = {};
        adicionarLog(`Iniciando - Modo: ${CUNHAR_MAXIMO ? 'MAXIMO' : `${QUANTIDADE} moeda(s) por vez`}`, 'ok');
        await new Promise(r => setTimeout(r, 1000));
        escanearECunhar();
    }

    function parar() {
        rodando = false;
        adicionarLog(`Parado. Total: ${totalCunhado} moedas`, 'warn');
    }

    function toggle() {
        ATIVADO = !ATIVADO;
        if (ATIVADO) {
            iniciar();
        } else {
            parar();
        }
        atualizarBotao(ATIVADO);
        salvarEstado();
    }

    // ============================================
    // UI - ATUALIZAR
    // ============================================
    function atualizarMetricas() {
        const metT = document.getElementById('tws-met-total');
        const metC = document.getElementById('tws-met-ciclos');
        if (metT) metT.textContent = totalCunhado;
        if (metC) metC.textContent = cicloAtual;
    }

    function atualizarBotao(ativo) {
        const btn  = document.getElementById('tws-botao');
        const dot  = document.getElementById('tws-dot');
        const stat = document.getElementById('tws-status');

        if (dot)  dot.style.background = ativo ? '#22a55a' : '#e24b4a';
        if (stat) stat.textContent = ativo ? `Rodando - Ciclo ${cicloAtual}` : `Parado - ${totalCunhado} moedas`;
        if (btn) {
            btn.innerHTML        = ativo ? '⏹ Desativar' : '▶ Ativar';
            btn.style.background = ativo ? '#c0392b' : '#27ae60';
        }
        atualizarMetricas();
    }

    // ============================================
    // PAINEL
    // ============================================
    function criarPainel() {
        if (painel) return;

        const inputStyle = 'width:100%;padding:6px 8px;background:#111;border:1px solid #444;color:#e0e0e0;border-radius:6px;font-size:12px;box-sizing:border-box;';
        const labelStyle = 'display:block;margin-bottom:4px;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.4px;';
        const errStyle   = 'display:none;font-size:10px;color:#e24b4a;margin-top:3px;';

        painel = document.createElement('div');
        painel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            z-index: 999999;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            color: #e0e0e0;
        `;

        if (POS_X !== null && POS_Y !== null) {
            const maxX = window.innerWidth  - 300;
            const maxY = window.innerHeight - 100;
            const x = Math.max(0, Math.min(POS_X, maxX));
            const y = Math.max(0, Math.min(POS_Y, maxY));
            painel.style.left   = x + 'px';
            painel.style.top    = y + 'px';
            painel.style.right  = 'auto';
            painel.style.bottom = 'auto';
        }

        painel.innerHTML = `
            <div id="tws-header" style="background:#2c2c2c;padding:10px 14px;border-radius:11px 11px 0 0;display:flex;align-items:center;justify-content:space-between;cursor:move;border-bottom:1px solid #3a3a3a;user-select:none;">
                <span style="font-weight:bold;color:#ffa500;font-size:13px;">Cunhagem Automatica</span>
                <button id="tws-minimizar" style="background:#3a3a3a;border:none;color:#ccc;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;">${MINIMIZADO ? '+' : '-'}</button>
            </div>

            <div id="tws-body" style="padding:14px;display:${MINIMIZADO ? 'none' : 'flex'};flex-direction:column;gap:12px;">

                <div style="display:flex;align-items:center;gap:10px;background:#252525;border-radius:8px;padding:8px 12px;">
                    <div id="tws-dot" style="width:10px;height:10px;border-radius:50%;background:#e24b4a;flex-shrink:0;transition:background .3s;"></div>
                    <span id="tws-status" style="font-weight:500;font-size:12px;">Parado</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div style="background:#252525;border-radius:8px;padding:10px;text-align:center;">
                        <div style="font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;">Moedas</div>
                        <div id="tws-met-total" style="font-size:24px;font-weight:bold;color:#ffa500;">${totalCunhado}</div>
                    </div>
                    <div style="background:#252525;border-radius:8px;padding:10px;text-align:center;">
                        <div style="font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;">Ciclos</div>
                        <div id="tws-met-ciclos" style="font-size:24px;font-weight:bold;color:#ffa500;">${cicloAtual}</div>
                    </div>
                </div>

                <div style="border-top:1px solid #2e2e2e;"></div>

                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Modo de cunhagem</div>
                    <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:#252525;border-radius:8px;padding:8px 12px;">
                        <span>Cunhar maximo possivel</span>
                        <input type="checkbox" id="tws-maximo" ${CUNHAR_MAXIMO ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:#ffa500;">
                    </label>
                </div>

                <div id="tws-quantidade-div" style="${CUNHAR_MAXIMO ? 'display:none;' : ''}flex-direction:column;gap:3px;">
                    <label style="${labelStyle}" for="tws-quantidade">Quantidade por aldeia</label>
                    <input type="number" id="tws-quantidade" value="${QUANTIDADE}" min="1" max="999" step="1" style="${inputStyle}">
                    <span id="tws-err-qtd" style="${errStyle}">Informe um valor entre 1 e 999</span>
                </div>

                <div style="border-top:1px solid #2e2e2e;"></div>

                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Intervalos</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label style="${labelStyle}" for="tws-pausa-aldeias">Entre aldeias (ms)</label>
                            <input type="number" id="tws-pausa-aldeias" value="${PAUSA_ENTRE_ALDEIAS}" min="500" max="30000" step="100" style="${inputStyle}">
                            <span id="tws-err-aldeias" style="${errStyle}">Min. 500 ms</span>
                        </div>
                        <div>
                            <label style="${labelStyle}" for="tws-pausa-ciclos">Entre ciclos (s)</label>
                            <input type="number" id="tws-pausa-ciclos" value="${PAUSA_ENTRE_CICLOS / 1000}" min="10" max="3600" step="1" style="${inputStyle}">
                            <span id="tws-err-ciclos" style="${errStyle}">Min. 10 s</span>
                        </div>
                    </div>
                </div>

                <div style="border-top:1px solid #2e2e2e;"></div>

                <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch;">
                    <button id="tws-botao" style="padding:10px;border:none;border-radius:8px;font-weight:bold;font-size:13px;cursor:pointer;background:#27ae60;color:#fff;transition:opacity .15s;">
                        ▶ Ativar
                    </button>
                    <button id="tws-reset" title="Resetar tudo e limpar dados salvos" style="padding:10px 12px;border:1px solid #3a3a3a;border-radius:8px;font-size:12px;cursor:pointer;background:#2e2e2e;color:#e24b4a;font-weight:bold;white-space:nowrap;">
                        ↺ Reset
                    </button>
                </div>

                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Log recente</div>
                    <div id="tws-log" style="background:#0f0f0f;border-radius:6px;padding:8px;font-family:monospace;color:#888;max-height:120px;overflow-y:auto;min-height:60px;display:flex;flex-direction:column;gap:2px;">
                        <div data-placeholder="1" style="color:#555;font-size:10px;">Aguardando...</div>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(painel);

        // Event listeners
        const maximoCheck   = document.getElementById('tws-maximo');
        const quantidadeDiv = document.getElementById('tws-quantidade-div');
        const inpQtd        = document.getElementById('tws-quantidade');
        const inpAldeias    = document.getElementById('tws-pausa-aldeias');
        const inpCiclos     = document.getElementById('tws-pausa-ciclos');

        maximoCheck.addEventListener('change', () => {
            CUNHAR_MAXIMO = maximoCheck.checked;
            quantidadeDiv.style.display = CUNHAR_MAXIMO ? 'none' : 'flex';
            salvarEstado();
        });

        inpQtd.addEventListener('input', () => {
            QUANTIDADE = parseInt(inpQtd.value) || 1;
            validarCampos();
            salvarEstado();
        });

        inpAldeias.addEventListener('input', () => {
            const v = parseInt(inpAldeias.value);
            if (!isNaN(v) && v >= 500) { PAUSA_ENTRE_ALDEIAS = v; salvarEstado(); }
            validarCampos();
        });

        inpCiclos.addEventListener('input', () => {
            const v = parseInt(inpCiclos.value);
            if (!isNaN(v) && v >= 10) { PAUSA_ENTRE_CICLOS = v * 1000; salvarEstado(); }
            validarCampos();
        });

        document.getElementById('tws-botao').addEventListener('click', () => {
            if (!ATIVADO && !validarCampos()) {
                adicionarLog('Corrija os campos antes de ativar', 'err');
                return;
            }
            toggle();
        });

        document.getElementById('tws-reset').addEventListener('click', () => {
            if (confirm('Resetar tudo? Isso vai parar a cunhagem, zerar contadores e apagar as configuracoes salvas.')) {
                resetarTudo();
            }
        });

        const minimizar = document.getElementById('tws-minimizar');
        const body      = document.getElementById('tws-body');
        minimizar.addEventListener('click', () => {
            MINIMIZADO = body.style.display !== 'none';
            body.style.display    = MINIMIZADO ? 'none' : 'flex';
            minimizar.textContent = MINIMIZADO ? '+' : '-';
            salvarEstado();
        });

        const header = document.getElementById('tws-header');
        let dragging = false, startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', e => {
            if (e.target === minimizar) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = painel.getBoundingClientRect();
            startLeft = rect.left;
            startTop  = rect.top;
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

        document.addEventListener('mouseup', e => {
            if (!dragging) return;
            dragging = false;
            const rect = painel.getBoundingClientRect();
            POS_X = Math.round(rect.left);
            POS_Y = Math.round(rect.top);
            salvarEstado();
        });

        // CORRECAO: Garantir que o botao reflita o estado atual apos criar o painel
        atualizarBotao(ATIVADO);

        // Se estava ativado e nao esta rodando, iniciar automaticamente
        if (ATIVADO && !rodando) {
            setTimeout(() => iniciar(), 1000);
        }
    }

    // ============================================
    // INICIALIZACAO
    // ============================================
    carregarEstado();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            criarPainel();
        });
    } else {
        criarPainel();
    }

})();
