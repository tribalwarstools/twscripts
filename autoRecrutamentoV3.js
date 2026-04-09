// ==UserScript==
// @name         Tribal Wars - Recrutamento Automático
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Recrutamento automático por aldeia com até 3 unidades configuráveis
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // UNIDADES E TELAS
    // ============================================
    const UNIDADES = {
        spear:    { nome: 'Lanceiro',      tela: 'barracks' },
        sword:    { nome: 'Espadachim',    tela: 'barracks' },
        axe:      { nome: 'Bárbaro',       tela: 'barracks' },
        archer:   { nome: 'Arqueiro',      tela: 'barracks' },
        spy:      { nome: 'Explorador',    tela: 'stable'   },
        light:    { nome: 'Cav. Leve',     tela: 'stable'   },
        marcher:  { nome: 'Cav. Arqueira', tela: 'stable'   },
        heavy:    { nome: 'Cav. Pesada',   tela: 'stable'   },
        ram:      { nome: 'Aríete',        tela: 'garage'   },
        catapult: { nome: 'Catapulta',     tela: 'garage'   },
        knight:   { nome: 'Paladino',      tela: 'statue'   }
    };

    const SELECT_UNIDADE_OPTIONS = `<option value="">— nenhuma —</option>` +
        Object.entries(UNIDADES).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('');

    // ============================================
    // CONFIGURAÇÕES PADRÃO
    // ============================================
    const DEFAULTS = {
        ativado:        false,
        pausaAldeias:   2000,
        pausaCiclos:    60000,
        minimizado:     false,
        posX:           null,
        posY:           null,
        totalRecrutado: 0,
        configAldeias:  {}   // { [villageId]: { nome, slots: [{unidade, quantidade}] } }
    };

    let ATIVADO             = DEFAULTS.ativado;
    let PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
    let PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
    let MINIMIZADO          = DEFAULTS.minimizado;
    let POS_X               = DEFAULTS.posX;
    let POS_Y               = DEFAULTS.posY;
    let totalRecrutado      = DEFAULTS.totalRecrutado;
    let configAldeias       = {};   // { [villageId]: { nome, slots: [{unidade, quantidade}] } }

    let rodando    = false;
    let cicloAtivo = false;
    let cicloAtual = 0;
    let painel     = null;
    let modal      = null;

    // ============================================
    // PERSISTÊNCIA
    // ============================================
    const STORAGE_KEY = 'tws_recrutamento_v3';

    function salvarEstado() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ativado:        ATIVADO,
            pausaAldeias:   PAUSA_ENTRE_ALDEIAS,
            pausaCiclos:    PAUSA_ENTRE_CICLOS,
            minimizado:     MINIMIZADO,
            posX:           POS_X,
            posY:           POS_Y,
            totalRecrutado: totalRecrutado,
            configAldeias:  configAldeias
        }));
    }

function carregarEstado() {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
        const d = JSON.parse(salvo);
        ATIVADO             = d.ativado         || false;
        PAUSA_ENTRE_ALDEIAS = d.pausaAldeias   || DEFAULTS.pausaAldeias;
        PAUSA_ENTRE_CICLOS  = d.pausaCiclos    || DEFAULTS.pausaCiclos;
        MINIMIZADO          = d.minimizado     || DEFAULTS.minimizado;
        POS_X               = d.posX           !== undefined ? d.posX : DEFAULTS.posX;
        POS_Y               = d.posY           !== undefined ? d.posY : DEFAULTS.posY;
        totalRecrutado      = d.totalRecrutado || DEFAULTS.totalRecrutado;
        configAldeias       = d.configAldeias  || {};
        
        // 🔄 REATIVAR AUTOMATICAMENTE SE ESTAVA LIGADO
        if (ATIVADO && !rodando) {
            setTimeout(() => iniciar(), 2000);
        }
    }
}

    function resetarTudo() {
        if (ATIVADO) { ATIVADO = false; rodando = false; cicloAtivo = false; }
        PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
        PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
        MINIMIZADO          = DEFAULTS.minimizado;
        POS_X               = DEFAULTS.posX;
        POS_Y               = DEFAULTS.posY;
        totalRecrutado      = DEFAULTS.totalRecrutado;
        cicloAtual          = 0;
        configAldeias       = {};
        localStorage.removeItem(STORAGE_KEY);

        if (painel) {
            painel.style.left   = 'auto';
            painel.style.top    = 'auto';
            painel.style.right  = '20px';
            painel.style.bottom = '20px';
        }
        aplicarEstadoNaUI();
        adicionarLog('Reset completo. Configurações restauradas.', 'warn');
    }

    function aplicarEstadoNaUI() {
        const inpAldeias = document.getElementById('tws-pausa-aldeias');
        const inpCiclos  = document.getElementById('tws-pausa-ciclos');
        const body       = document.getElementById('tws-body');
        const minimizar  = document.getElementById('tws-minimizar');

        if (inpAldeias) inpAldeias.value      = PAUSA_ENTRE_ALDEIAS;
        if (inpCiclos)  inpCiclos.value       = PAUSA_ENTRE_CICLOS / 1000;
        if (body)       body.style.display    = MINIMIZADO ? 'none' : 'flex';
        if (minimizar)  minimizar.textContent = MINIMIZADO ? '+' : '−';

        atualizarBotao(false);
        atualizarMetricas();
        atualizarContadorAldeias();

        ['tws-err-aldeias','tws-err-ciclos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        ['tws-pausa-aldeias','tws-pausa-ciclos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.borderColor = '#444';
        });
    }

    function atualizarContadorAldeias() {
        const el = document.getElementById('tws-aldeias-config');
        if (!el) return;
        const total = Object.keys(configAldeias).length;
        el.textContent = total === 0 ? 'Nenhuma aldeia configurada' : `${total} aldeia(s) configurada(s)`;
        el.style.color = total === 0 ? '#e24b4a' : '#22a55a';
    }

    // ============================================
    // VALIDAÇÃO
    // ============================================
    function validarCampos() {
        let ok = true;

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

        if (Object.keys(configAldeias).length === 0) {
            adicionarLog('Configure ao menos uma aldeia antes de ativar.', 'err');
            ok = false;
        }

        return ok;
    }

    // ============================================
    // LOG
    // ============================================
    function adicionarLog(msg, tipo) {
        const log = document.getElementById('tws-log');
        if (!log) return;
        const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const cores = { ok: '#22a55a', err: '#e24b4a', warn: '#c97c00' };
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
    // RECRUTAMENTO VIA FORMULÁRIO NATIVO
    // ============================================
    async function recrutarUnidadeNaAldeia(villageId, unidade, quantidade) {
        const unidadeInfo = UNIDADES[unidade];
        if (!unidadeInfo) return { success: false, reason: 'Unidade inválida' };

        try {
            const tela     = unidadeInfo.tela;
            const url      = `/game.php?village=${villageId}&screen=${tela}`;
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) return { success: false, reason: `HTTP ${response.status}` };

            const html = await response.text();

            // Verifica se input da unidade existe
            if (!new RegExp(`name="${unidade}"`, 'i').test(html)) {
                return { success: false, reason: `Sem ${unidadeInfo.nome} disponível` };
            }

            // Lê máximo pelo link set_max
            const maxMatch = html.match(new RegExp(`set_max\\('${unidade}'\\)[^(]*\\((\\d+)\\)`, 'i'));
            const maximo   = maxMatch ? parseInt(maxMatch[1]) : 0;

            if (maximo === 0) return { success: false, reason: `${unidadeInfo.nome}: máx. = 0` };

            const qtd = Math.min(quantidade, maximo);

            // Extrai formulário
            const parser = new DOMParser();
            const doc    = parser.parseFromString(html, 'text/html');
            const form   = doc.querySelector('form[action*="screen=' + tela + '"]') ||
                           doc.querySelector('form#unit_order_form') ||
                           doc.querySelector('form');

            if (!form) return { success: false, reason: 'Formulário não encontrado' };

            const actionUrl = form.getAttribute('action') || '';
            const csrfMatch = actionUrl.match(/[&?]h=([a-f0-9]+)/i) ||
                              html.match(/"csrf":"([a-f0-9]+)"/i) ||
                              html.match(/name="h" value="([^"]+)"/);
            const csrf = csrfMatch ? csrfMatch[1] : (window.game_data?.csrf || '');

            if (!csrf) return { success: false, reason: 'CSRF não encontrado' };

            const formData = new URLSearchParams();
            form.querySelectorAll('input, select').forEach(inp => {
                if (!inp.name || inp.type === 'submit' || inp.type === 'button') return;
                if (Object.keys(UNIDADES).includes(inp.name)) {
                    formData.set(inp.name, inp.name === unidade ? qtd.toString() : '');
                } else {
                    formData.set(inp.name, inp.value);
                }
            });
            formData.set(unidade, qtd.toString());
            formData.set('h', csrf);

            const postUrl = `/game.php?village=${villageId}&screen=${tela}&action=train&h=${csrf}`;

            const postResponse = await fetch(postUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData.toString()
            });

            if (!postResponse.ok) return { success: false, reason: `HTTP ${postResponse.status}` };

            const contentType = postResponse.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const json = await postResponse.json().catch(() => null);
                if (json?.response?.success === true)  return { success: true,  quantidade: qtd };
                if (json?.response?.success === false) return { success: false, reason: json?.response?.msg || 'Recusado' };
            }

            const texto = await postResponse.text().catch(() => '');
            if (/recursos insuficientes|not enough/i.test(texto))  return { success: false, reason: 'Recursos insuficientes' };
            if (/fila cheia|queue full|limite/i.test(texto))        return { success: false, reason: 'Fila cheia' };

            return { success: true, quantidade: qtd };

        } catch (err) {
            return { success: false, reason: err.message };
        }
    }

    // ============================================
    // CICLO PRINCIPAL
    // ============================================
    async function escanearERecritar() {
        if (!ATIVADO) return;
        if (cicloAtivo) return;

        cicloAtivo = true;
        cicloAtual++;
        atualizarMetricas();
        adicionarLog(`Ciclo ${cicloAtual} iniciado`, 'ok');

        console.log(`\n========================================`);
        console.log(`CICLO ${cicloAtual} - ${new Date().toLocaleTimeString()}`);
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

                const slots = (cfg.slots || []).filter(s => s.unidade && s.quantidade > 0);
                if (slots.length === 0) continue;

                console.log(`\n[${cfg.nome}]`);

                for (const slot of slots) {
                    if (!ATIVADO) break;

                    const resultado = await recrutarUnidadeNaAldeia(parseInt(villageId), slot.unidade, slot.quantidade);

                    if (resultado.success) {
                        totalRecrutado += resultado.quantidade;
                        salvarEstado();
                        atualizarMetricas();
                        adicionarLog(`${cfg.nome}: +${resultado.quantidade} ${UNIDADES[slot.unidade]?.nome}`, 'ok');
                        console.log(`  ✓ ${UNIDADES[slot.unidade]?.nome} x${resultado.quantidade}`);
                    } else {
                        const tipoLog = /insuficiente|máx/i.test(resultado.reason) ? 'warn' : 'err';
                        adicionarLog(`${cfg.nome} / ${UNIDADES[slot.unidade]?.nome}: ${resultado.reason}`, tipoLog);
                        console.log(`  ✗ ${UNIDADES[slot.unidade]?.nome}: ${resultado.reason}`);
                    }

                    // Pausa entre unidades da mesma aldeia
                    await new Promise(r => setTimeout(r, 800));
                }

                await new Promise(r => setTimeout(r, PAUSA_ENTRE_ALDEIAS));
            }

            adicionarLog(`Ciclo ${cicloAtual} concluído. Total: ${totalRecrutado}`, 'ok');
            console.log(`\nCiclo ${cicloAtual} finalizado. Próximo em ${PAUSA_ENTRE_CICLOS / 1000}s\n`);

        } catch (err) {
            adicionarLog('Erro no ciclo: ' + err.message, 'err');
            console.error('[Recrutamento] Erro:', err);
        }

        cicloAtivo = false;

        if (ATIVADO) {
            await new Promise(r => setTimeout(r, PAUSA_ENTRE_CICLOS));
            if (ATIVADO) escanearERecritar();
        }
    }

    // ============================================
    // CONTROLE
    // ============================================
    async function iniciar() {
        if (rodando) return;
        rodando = true;
        adicionarLog(`Iniciando — ${Object.keys(configAldeias).length} aldeia(s) configurada(s)`, 'ok');
        await new Promise(r => setTimeout(r, 500));
        escanearERecritar();
    }

    function parar() {
        rodando = false;
        adicionarLog(`Parado. Total recrutado: ${totalRecrutado}`, 'warn');
    }

    function toggle() {
        ATIVADO = !ATIVADO;
        ATIVADO ? iniciar() : parar();
        atualizarBotao(ATIVADO);
        salvarEstado();
    }

    // ============================================
    // UI — PAINEL PRINCIPAL
    // ============================================
    function atualizarMetricas() {
        const metT = document.getElementById('tws-met-total');
        const metC = document.getElementById('tws-met-ciclos');
        if (metT) metT.textContent = totalRecrutado;
        if (metC) metC.textContent = cicloAtual;
    }

    function atualizarBotao(ativo) {
        const btn  = document.getElementById('tws-botao');
        const dot  = document.getElementById('tws-dot');
        const stat = document.getElementById('tws-status');
        if (dot)  dot.style.background  = ativo ? '#22a55a' : '#e24b4a';
        if (stat) stat.textContent      = ativo ? `Rodando — Ciclo ${cicloAtual}` : `Parado — ${totalRecrutado} recrutados`;
        if (btn) {
            btn.innerHTML        = ativo ? '⏹ Desativar' : '▶ Ativar';
            btn.style.background = ativo ? '#c0392b' : '#27ae60';
        }
        atualizarMetricas();
    }

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
            const x = Math.max(0, Math.min(POS_X, window.innerWidth  - 300));
            const y = Math.max(0, Math.min(POS_Y, window.innerHeight - 100));
            painel.style.left   = x + 'px';
            painel.style.top    = y + 'px';
            painel.style.right  = 'auto';
            painel.style.bottom = 'auto';
        }

        const totalConfig = Object.keys(configAldeias).length;

        painel.innerHTML = `
            <div id="tws-header" style="background:#2c2c2c;padding:10px 14px;border-radius:11px 11px 0 0;display:flex;align-items:center;justify-content:space-between;cursor:move;border-bottom:1px solid #3a3a3a;user-select:none;">
                <span style="font-weight:bold;color:#ffa500;font-size:13px;">⚔️ Recrutamento Automático</span>
                <button id="tws-minimizar" style="background:#3a3a3a;border:none;color:#ccc;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;">${MINIMIZADO ? '+' : '−'}</button>
            </div>

            <div id="tws-body" style="padding:14px;display:${MINIMIZADO ? 'none' : 'flex'};flex-direction:column;gap:12px;">

                <!-- Status -->
                <div style="display:flex;align-items:center;gap:10px;background:#252525;border-radius:8px;padding:8px 12px;">
                    <div id="tws-dot" style="width:10px;height:10px;border-radius:50%;background:#e24b4a;flex-shrink:0;transition:background .3s;"></div>
                    <span id="tws-status" style="font-weight:500;font-size:12px;">Parado</span>
                </div>

                <!-- Métricas -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div style="background:#252525;border-radius:8px;padding:10px;text-align:center;">
                        <div style="font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;">Recrutados</div>
                        <div id="tws-met-total" style="font-size:24px;font-weight:bold;color:#ffa500;">${totalRecrutado}</div>
                    </div>
                    <div style="background:#252525;border-radius:8px;padding:10px;text-align:center;">
                        <div style="font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;">Ciclos</div>
                        <div id="tws-met-ciclos" style="font-size:24px;font-weight:bold;color:#ffa500;">${cicloAtual}</div>
                    </div>
                </div>

                <div style="border-top:1px solid #2e2e2e;"></div>

                <!-- Configurar aldeias -->
                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Aldeias</div>
                    <div id="tws-aldeias-config" style="font-size:11px;margin-bottom:8px;color:${totalConfig === 0 ? '#e24b4a' : '#22a55a'};">
                        ${totalConfig === 0 ? 'Nenhuma aldeia configurada' : `${totalConfig} aldeia(s) configurada(s)`}
                    </div>
                    <button id="tws-btn-config" style="width:100%;padding:8px;border:1px solid #444;border-radius:8px;font-size:12px;cursor:pointer;background:#252525;color:#ffa500;font-weight:bold;">
                        ⚙ Configurar Aldeias
                    </button>
                </div>

                <div style="border-top:1px solid #2e2e2e;"></div>

                <!-- Intervalos -->
                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Intervalos</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label style="${labelStyle}" for="tws-pausa-aldeias">Entre aldeias (ms)</label>
                            <input type="number" id="tws-pausa-aldeias" value="${PAUSA_ENTRE_ALDEIAS}" min="500" max="30000" step="100" style="${inputStyle}">
                            <span id="tws-err-aldeias" style="${errStyle}">Mín. 500 ms</span>
                        </div>
                        <div>
                            <label style="${labelStyle}" for="tws-pausa-ciclos">Entre ciclos (s)</label>
                            <input type="number" id="tws-pausa-ciclos" value="${PAUSA_ENTRE_CICLOS / 1000}" min="10" max="3600" step="1" style="${inputStyle}">
                            <span id="tws-err-ciclos" style="${errStyle}">Mín. 10 s</span>
                        </div>
                    </div>
                </div>

                <div style="border-top:1px solid #2e2e2e;"></div>

                <!-- Botões -->
                <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch;">
                    <button id="tws-botao" style="padding:10px;border:none;border-radius:8px;font-weight:bold;font-size:13px;cursor:pointer;background:#27ae60;color:#fff;transition:opacity .15s;">
                        ▶ Ativar
                    </button>
                    <button id="tws-reset" title="Resetar tudo" style="padding:10px 12px;border:1px solid #3a3a3a;border-radius:8px;font-size:12px;cursor:pointer;background:#2e2e2e;color:#e24b4a;font-weight:bold;white-space:nowrap;">
                        ↺ Reset
                    </button>
                </div>

                <!-- Log -->
                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Log recente</div>
                    <div id="tws-log" style="background:#0f0f0f;border-radius:6px;padding:8px;font-family:monospace;color:#888;max-height:120px;overflow-y:auto;min-height:60px;display:flex;flex-direction:column;gap:2px;">
                        <div data-placeholder="1" style="color:#555;font-size:10px;">Aguardando...</div>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(painel);

        // Intervalos
        const inpAldeias = document.getElementById('tws-pausa-aldeias');
        const inpCiclos  = document.getElementById('tws-pausa-ciclos');

        inpAldeias.addEventListener('input', () => {
            const v = parseInt(inpAldeias.value);
            if (!isNaN(v) && v >= 500) { PAUSA_ENTRE_ALDEIAS = v; salvarEstado(); }
            const err = document.getElementById('tws-err-aldeias');
            if (err) err.style.display = (!isNaN(v) && v >= 500) ? 'none' : 'block';
            inpAldeias.style.borderColor = (!isNaN(v) && v >= 500) ? '#444' : '#e24b4a';
        });

        inpCiclos.addEventListener('input', () => {
            const v = parseInt(inpCiclos.value);
            if (!isNaN(v) && v >= 10) { PAUSA_ENTRE_CICLOS = v * 1000; salvarEstado(); }
            const err = document.getElementById('tws-err-ciclos');
            if (err) err.style.display = (!isNaN(v) && v >= 10) ? 'none' : 'block';
            inpCiclos.style.borderColor = (!isNaN(v) && v >= 10) ? '#444' : '#e24b4a';
        });

        document.getElementById('tws-btn-config').addEventListener('click', abrirModal);

        document.getElementById('tws-botao').addEventListener('click', () => {
            if (!ATIVADO && !validarCampos()) return;
            toggle();
        });

        document.getElementById('tws-reset').addEventListener('click', () => {
            if (confirm('Resetar tudo? Isso vai parar o recrutamento, zerar contadores, remover configurações de aldeias e apagar dados salvos.')) {
                resetarTudo();
            }
        });

        // Minimizar
        const minimizar = document.getElementById('tws-minimizar');
        const body      = document.getElementById('tws-body');
        minimizar.addEventListener('click', () => {
            MINIMIZADO = body.style.display !== 'none';
            body.style.display    = MINIMIZADO ? 'none' : 'flex';
            minimizar.textContent = MINIMIZADO ? '+' : '−';
            salvarEstado();
        });

        // Arrastar
        const header = document.getElementById('tws-header');
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
    // UI — MODAL DE CONFIGURAÇÃO DE ALDEIAS
    // ============================================
    async function abrirModal() {
        if (modal) { modal.style.display = 'flex'; return; }

        // Overlay
        modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            z-index: 1000000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;

        // Container
        const container = document.createElement('div');
        container.style.cssText = `
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 14px;
            width: 640px;
            max-width: 95vw;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            color: #e0e0e0;
            font-size: 13px;
        `;

        container.innerHTML = `
            <div style="background:#2c2c2c;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #3a3a3a;flex-shrink:0;">
                <span style="font-weight:bold;color:#ffa500;font-size:14px;">⚙ Configurar Aldeias</span>
                <button id="tws-modal-fechar" style="background:#3a3a3a;border:none;color:#ccc;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="padding:14px 18px;border-bottom:1px solid #2e2e2e;flex-shrink:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-size:11px;color:#888;">Defina até 3 unidades por aldeia. Aldeias sem configuração são ignoradas.</span>
                <button id="tws-modal-carregar" style="margin-left:auto;padding:6px 14px;border:1px solid #444;border-radius:6px;background:#252525;color:#ffa500;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">
                    ↻ Carregar minhas aldeias
                </button>
            </div>
            <div id="tws-modal-lista" style="overflow-y:auto;flex:1;padding:14px 18px;display:flex;flex-direction:column;gap:10px;">
                <div style="color:#555;font-size:12px;text-align:center;padding:20px 0;">Clique em "Carregar minhas aldeias" para começar.</div>
            </div>
            <div style="padding:12px 18px;border-top:1px solid #2e2e2e;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
                <button id="tws-modal-cancelar" style="padding:8px 18px;border:1px solid #444;border-radius:8px;background:#252525;color:#ccc;font-size:12px;cursor:pointer;">Cancelar</button>
                <button id="tws-modal-salvar" style="padding:8px 18px;border:none;border-radius:8px;background:#27ae60;color:#fff;font-size:12px;font-weight:bold;cursor:pointer;">Salvar configurações</button>
            </div>
        `;

        modal.appendChild(container);
        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });
        document.getElementById('tws-modal-fechar').addEventListener('click', fecharModal);
        document.getElementById('tws-modal-cancelar').addEventListener('click', fecharModal);

        document.getElementById('tws-modal-carregar').addEventListener('click', async () => {
            const btn = document.getElementById('tws-modal-carregar');
            btn.textContent = '⏳ Carregando...';
            btn.disabled = true;
            await carregarAldeias();
            btn.textContent = '↻ Recarregar';
            btn.disabled = false;
        });

        document.getElementById('tws-modal-salvar').addEventListener('click', salvarConfigAldeias);

        // Carrega automaticamente na primeira abertura
        await carregarAldeias();
    }

    function fecharModal() {
        if (modal) modal.style.display = 'none';
    }

    async function carregarAldeias() {
        const lista = document.getElementById('tws-modal-lista');
        if (!lista) return;

        lista.innerHTML = `<div style="color:#888;font-size:12px;text-align:center;padding:20px 0;">Carregando aldeias...</div>`;

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

            const inputBase = 'padding:5px 6px;background:#111;border:1px solid #444;color:#e0e0e0;border-radius:5px;font-size:11px;box-sizing:border-box;';

            for (const aldeia of minhasAldeias) {
                const cfg = configAldeias[aldeia.id] || { slots: [{}, {}, {}] };
                const slots = [
                    cfg.slots?.[0] || {},
                    cfg.slots?.[1] || {},
                    cfg.slots?.[2] || {}
                ];

                const row = document.createElement('div');
                row.dataset.villageId = aldeia.id;
                row.style.cssText = `
                    background: #252525;
                    border-radius: 8px;
                    padding: 10px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                `;

                // Cabeçalho da aldeia
                const header = document.createElement('div');
                header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
                header.innerHTML = `
                    <span style="font-weight:bold;font-size:12px;color:#e0e0e0;">${aldeia.nome}</span>
                    <span style="font-size:10px;color:#666;">${aldeia.coord}</span>
                `;
                row.appendChild(header);

                // 3 slots de unidade
                const slotsDiv = document.createElement('div');
                slotsDiv.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;';

                for (let i = 0; i < 3; i++) {
                    const slotDiv = document.createElement('div');
                    slotDiv.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

                    const labelEl = document.createElement('div');
                    labelEl.style.cssText = 'font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.3px;';
                    labelEl.textContent = `Unidade ${i + 1}`;

                    const sel = document.createElement('select');
                    sel.dataset.slot   = i;
                    sel.dataset.type   = 'unidade';
                    sel.style.cssText  = inputBase + 'width:100%;';
                    sel.innerHTML      = SELECT_UNIDADE_OPTIONS;
                    sel.value          = slots[i].unidade || '';

                    const inp = document.createElement('input');
                    inp.type           = 'number';
                    inp.min            = '1';
                    inp.max            = '9999';
                    inp.placeholder    = 'Qtd';
                    inp.dataset.slot   = i;
                    inp.dataset.type   = 'quantidade';
                    inp.style.cssText  = inputBase + 'width:100%;';
                    inp.value          = slots[i].quantidade || '';
                    inp.disabled       = !slots[i].unidade;

                    sel.addEventListener('change', () => {
                        inp.disabled = !sel.value;
                        if (!sel.value) inp.value = '';
                    });

                    slotDiv.appendChild(labelEl);
                    slotDiv.appendChild(sel);
                    slotDiv.appendChild(inp);
                    slotsDiv.appendChild(slotDiv);
                }

                row.appendChild(slotsDiv);
                lista.appendChild(row);
            }

        } catch (err) {
            lista.innerHTML = `<div style="color:#e24b4a;font-size:12px;text-align:center;padding:20px 0;">Erro: ${err.message}</div>`;
        }
    }

    function salvarConfigAldeias() {
        const lista = document.getElementById('tws-modal-lista');
        if (!lista) return;

        const novaConfig = {};

        lista.querySelectorAll('[data-village-id]').forEach(row => {
            const villageId = parseInt(row.dataset.villageId);
            const nomeEl    = row.querySelector('span[style*="font-weight"]');
            const nome      = nomeEl ? nomeEl.textContent.trim() : `Aldeia ${villageId}`;

            const slots = [];
            for (let i = 0; i < 3; i++) {
                const sel = row.querySelector(`select[data-slot="${i}"]`);
                const inp = row.querySelector(`input[data-slot="${i}"]`);
                const unidade    = sel?.value || '';
                const quantidade = parseInt(inp?.value) || 0;
                if (unidade && quantidade > 0) {
                    slots.push({ unidade, quantidade });
                }
            }

            if (slots.length > 0) {
                novaConfig[villageId] = { nome, slots };
            }
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
