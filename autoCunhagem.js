// ==UserScript==
// @name         Tribal Wars - Cunhagem Automática
// @namespace    http://tampermonkey.net/
// @version      10.0
// @description  Cunhagem automática com painel melhorado, validação e log
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÕES
    // ============================================
    let ATIVADO = false;
    let QUANTIDADE = 1;
    let CUNHAR_MAXIMO = true;
    let PAUSA_ENTRE_ALDEIAS = 2000;
    let PAUSA_ENTRE_CICLOS = 30000;

    let rodando = false;
    let cicloAtivo = false;
    let painel = null;
    let custoMoeda = { wood: 28000, stone: 30000, iron: 25000 };
    let totalCunhado = 0;
    let cicloAtual = 0;

    // ============================================
    // PERSISTÊNCIA
    // ============================================
    const STORAGE_KEY = 'tws_cunhagem_botao';

    function salvarEstado() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ativado: ATIVADO,
            quantidade: QUANTIDADE,
            cunharMaximo: CUNHAR_MAXIMO,
            totalCunhado: totalCunhado,
            pausaAldeias: PAUSA_ENTRE_ALDEIAS,
            pausaCiclos: PAUSA_ENTRE_CICLOS
        }));
    }

    function carregarEstado() {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) {
            const dados = JSON.parse(salvo);
            ATIVADO              = dados.ativado || false;
            QUANTIDADE           = dados.quantidade || 1;
            CUNHAR_MAXIMO        = dados.cunharMaximo !== undefined ? dados.cunharMaximo : true;
            totalCunhado         = dados.totalCunhado || 0;
            PAUSA_ENTRE_ALDEIAS  = dados.pausaAldeias || 2000;
            PAUSA_ENTRE_CICLOS   = dados.pausaCiclos  || 30000;
            console.log('[Cunhagem] Estado carregado:', ATIVADO ? 'LIGADO' : 'DESLIGADO');
            if (ATIVADO) setTimeout(() => iniciar(), 2000);
        }
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================
    function formatarNumero(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function extrairRecursos(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const wood  = doc.getElementById('wood');
        const stone = doc.getElementById('stone');
        const iron  = doc.getElementById('iron');
        return {
            wood:  wood  ? parseInt(wood.textContent.replace(/\./g, ''))  : 0,
            stone: stone ? parseInt(stone.textContent.replace(/\./g, '')) : 0,
            iron:  iron  ? parseInt(iron.textContent.replace(/\./g, ''))  : 0
        };
    }

    function calcularMaximo(resources) {
        const maxWood  = Math.floor(resources.wood  / custoMoeda.wood);
        const maxStone = Math.floor(resources.stone / custoMoeda.stone);
        const maxIron  = Math.floor(resources.iron  / custoMoeda.iron);
        return Math.min(maxWood, maxStone, maxIron);
    }

    function podeCunhar(resources, quantidade) {
        return resources.wood  >= custoMoeda.wood  * quantidade &&
               resources.stone >= custoMoeda.stone * quantidade &&
               resources.iron  >= custoMoeda.iron  * quantidade;
    }

    // ============================================
    // VALIDAÇÃO
    // ============================================
    function validarCampos() {
        let ok = true;

        if (!CUNHAR_MAXIMO) {
            const inpQtd = document.getElementById('tws-quantidade');
            const v = parseInt(inpQtd?.value);
            const valid = !isNaN(v) && v >= 1 && v <= 999;
            if (inpQtd) inpQtd.style.borderColor = valid ? '#555' : '#e24b4a';
            const err = document.getElementById('tws-err-qtd');
            if (err) err.style.display = valid ? 'none' : 'block';
            if (!valid) ok = false;
        }

        const inpAldeias = document.getElementById('tws-pausa-aldeias');
        const va = parseInt(inpAldeias?.value);
        const validA = !isNaN(va) && va >= 500;
        if (inpAldeias) inpAldeias.style.borderColor = validA ? '#555' : '#e24b4a';
        const errA = document.getElementById('tws-err-aldeias');
        if (errA) errA.style.display = validA ? 'none' : 'block';
        if (!validA) ok = false;

        const inpCiclos = document.getElementById('tws-pausa-ciclos');
        const vc = parseInt(inpCiclos?.value);
        const validC = !isNaN(vc) && vc >= 10;
        if (inpCiclos) inpCiclos.style.borderColor = validC ? '#555' : '#e24b4a';
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
        const t = new Date().toTimeString().slice(0, 5);
        const cores = { ok: '#22a55a', err: '#e24b4a', warn: '#c97c00' };
        const cor = cores[tipo] || '#888';
        if (log.children.length === 1 && log.children[0].dataset.placeholder) log.innerHTML = '';
        const entry = document.createElement('div');
        entry.style.cssText = 'display:flex;gap:6px;';
        entry.innerHTML = `<span style="color:#555;flex-shrink:0;">${t}</span><span style="color:${cor};">${msg}</span>`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        if (log.children.length > 30) log.removeChild(log.children[0]);
    }

    // ============================================
    // LÓGICA DE CUNHAGEM
    // ============================================
    async function cunharMoeda(villageId, quantidade) {
        try {
            const response = await fetch(`/game.php?village=${villageId}&screen=snob`, {
                credentials: 'same-origin'
            });
            if (!response.ok) return false;

            const html = await response.text();
            const csrfMatch = html.match(/name="h" value="([^"]+)"/);
            const formData = new URLSearchParams();
            formData.append('count', quantidade);
            if (csrfMatch) formData.append('h', csrfMatch[1]);

            const actionMatch = html.match(/form[^>]*action="([^"]*screen=snob&action=coin[^"]*)"/i);
            const url = actionMatch ? actionMatch[1] : `/game.php?village=${villageId}&screen=snob&action=coin`;

            const result = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            return result.ok;
        } catch (err) {
            return false;
        }
    }

    async function escanearECunhar() {
        if (!ATIVADO) return;
        if (cicloAtivo) return;

        cicloAtivo = true;
        cicloAtual++;

        atualizarMetricas();
        adicionarLog(`Ciclo ${cicloAtual} iniciado.`);

        console.log('');
        console.log(`╔═══════════════════════════════════════╗`);
        console.log(`║  CICLO ${cicloAtual} - ${new Date().toLocaleTimeString()}`);
        console.log(`╚═══════════════════════════════════════╝`);

        try {
            const resposta = await fetch('/map/village.txt');
            const dados = await resposta.text();
            const meuId = window.game_data?.player?.id;

            const minhasAldeias = dados.trim().split('\n')
                .map(line => {
                    const [id, name, x, y, player] = line.split(',');
                    return {
                        id: parseInt(id),
                        name: decodeURIComponent(name.replace(/\+/g, ' ')),
                        coord: `${x}|${y}`,
                        player: parseInt(player)
                    };
                })
                .filter(v => v.player === meuId);

            console.log(`Aldeias encontradas: ${minhasAldeias.length}`);

            let index = 0;
            for (const aldeia of minhasAldeias) {
                if (!ATIVADO) break;
                index++;

                const overview = await fetch(`/game.php?village=${aldeia.id}&screen=overview`, {
                    credentials: 'same-origin'
                });

                if (!overview.ok) {
                    console.log(`[${index}] ${aldeia.name} — falha ao carregar recursos`);
                    adicionarLog(`${aldeia.name}: falha ao carregar.`, 'err');
                    continue;
                }

                const recursos = extrairRecursos(await overview.text());

                let quantidadeCunhar = QUANTIDADE;
                if (CUNHAR_MAXIMO) {
                    quantidadeCunhar = calcularMaximo(recursos);
                }

                console.log(`[${index}/${minhasAldeias.length}] ${aldeia.name} (${aldeia.coord}) — cunhando ${quantidadeCunhar}`);

                if (quantidadeCunhar > 0 && podeCunhar(recursos, quantidadeCunhar)) {
                    const sucesso = await cunharMoeda(aldeia.id, quantidadeCunhar);

                    if (sucesso) {
                        totalCunhado += quantidadeCunhar;
                        salvarEstado();
                        atualizarMetricas();
                        adicionarLog(`${aldeia.name}: +${quantidadeCunhar} moeda(s).`, 'ok');
                        console.log(`  ✓ Cunhou ${quantidadeCunhar} moeda(s). Total: ${totalCunhado}`);
                    } else {
                        adicionarLog(`${aldeia.name}: falha ao cunhar.`, 'err');
                        console.log(`  ✗ Falha ao cunhar`);
                    }
                } else {
                    const motivo = quantidadeCunhar === 0 ? 'sem recursos' : 'insuficiente';
                    adicionarLog(`${aldeia.name}: ${motivo}.`, 'warn');
                    console.log(`  ⚠ Recursos insuficientes`);
                }

                await new Promise(r => setTimeout(r, PAUSA_ENTRE_ALDEIAS));
            }

            adicionarLog(`Ciclo ${cicloAtual} concluído. Total: ${totalCunhado}.`, 'ok');
            console.log(`\nCiclo ${cicloAtual} finalizado. Próximo em ${PAUSA_ENTRE_CICLOS / 1000}s\n`);

        } catch (err) {
            adicionarLog('Erro inesperado no ciclo.', 'err');
            console.error('[Cunhagem] Erro:', err);
        }

        cicloAtivo = false;

        if (ATIVADO) {
            await new Promise(r => setTimeout(r, PAUSA_ENTRE_CICLOS));
            if (ATIVADO) escanearECunhar();
        }
    }

    function iniciar() {
        if (rodando) return;
        rodando = true;
        console.log('[Cunhagem] Iniciado. Modo:', CUNHAR_MAXIMO ? 'MÁXIMO' : `${QUANTIDADE} por vez`);
        escanearECunhar();
    }

    function parar() {
        rodando = false;
        console.log('[Cunhagem] Parado. Total cunhado:', totalCunhado);
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
    // ATUALIZAÇÃO DO PAINEL
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
        if (stat) stat.textContent = ativo
            ? `Rodando — ciclo ${cicloAtual}`
            : `Parado — ${totalCunhado} moedas cunhadas`;
        if (btn) {
            btn.textContent = ativo ? '⏹ Desativar cunhagem' : '▶ Ativar cunhagem';
            btn.style.background = ativo ? '#c0392b' : '#27ae60';
        }

        atualizarMetricas();
    }

    // ============================================
    // PAINEL
    // ============================================
    function criarPainel() {
        if (painel) return;

        const inputStyle = 'width:100%;padding:5px 8px;background:#2a2a2a;border:1px solid #555;color:#eee;border-radius:5px;font-size:12px;box-sizing:border-box;';
        const labelStyle = 'font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:3px;';
        const errStyle   = 'display:none;font-size:10px;color:#e24b4a;margin-top:2px;';

        painel = document.createElement('div');
        painel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 270px;
            background: #1e1e1e;
            border: 1px solid #3a3a3a;
            border-radius: 10px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #eee;
        `;

        painel.innerHTML = `
            <div id="tws-header" style="background:#b86e00;padding:8px 12px;border-radius:9px 9px 0 0;display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;">
                <span style="font-weight:bold;color:#fff;font-size:12px;">💰 Cunhagem automática</span>
                <button id="tws-minimizar" style="background:rgba(0,0,0,0.25);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:13px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;">−</button>
            </div>
            <div id="tws-body" style="padding:12px;display:flex;flex-direction:column;gap:10px;">

                <div style="display:flex;align-items:center;gap:8px;background:#2a2a2a;border-radius:6px;padding:7px 10px;font-size:11px;color:#aaa;">
                    <div id="tws-dot" style="width:8px;height:8px;border-radius:50%;background:#e24b4a;flex-shrink:0;transition:background .3s;"></div>
                    <span id="tws-status">Parado — aguardando ativação</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                    <div style="background:#2a2a2a;border-radius:6px;padding:7px 10px;">
                        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.4px;">Cunhadas</div>
                        <div id="tws-met-total" style="font-size:18px;font-weight:bold;color:#eee;">${totalCunhado}</div>
                        <div style="font-size:10px;color:#555;">moedas</div>
                    </div>
                    <div style="background:#2a2a2a;border-radius:6px;padding:7px 10px;">
                        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.4px;">Ciclos</div>
                        <div id="tws-met-ciclos" style="font-size:18px;font-weight:bold;color:#eee;">${cicloAtual}</div>
                        <div style="font-size:10px;color:#555;">executados</div>
                    </div>
                </div>

                <hr style="border:none;border-top:1px solid #333;margin:0;">

                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Modo de cunhagem</div>
                    <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                        <span>Cunhar máximo possível</span>
                        <input type="checkbox" id="tws-maximo" ${CUNHAR_MAXIMO ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer;">
                    </label>
                </div>

                <div id="tws-quantidade-div" style="${CUNHAR_MAXIMO ? 'display:none;' : ''}flex-direction:column;gap:3px;">
                    <label style="${labelStyle}" for="tws-quantidade">Quantidade por aldeia</label>
                    <input type="number" id="tws-quantidade" value="${QUANTIDADE}" min="1" max="999" step="1" style="${inputStyle}">
                    <span id="tws-err-qtd" style="${errStyle}">Informe um valor entre 1 e 999</span>
                </div>

                <hr style="border:none;border-top:1px solid #333;margin:0;">

                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Intervalos</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
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

                <hr style="border:none;border-top:1px solid #333;margin:0;">

                <button id="tws-botao" style="width:100%;padding:9px;border:none;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;background:${ATIVADO ? '#c0392b' : '#27ae60'};color:#fff;transition:opacity .15s;">
                    ${ATIVADO ? '⏹ Desativar cunhagem' : '▶ Ativar cunhagem'}
                </button>

                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">Log recente</div>
                    <div id="tws-log" style="background:#111;border-radius:5px;padding:7px 9px;font-size:10px;font-family:monospace;color:#888;max-height:80px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;">
                        <div data-placeholder="1" style="color:#555;">Aguardando...</div>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(painel);

        // --- Eventos ---
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
                adicionarLog('Corrija os campos antes de ativar.', 'err');
                return;
            }
            toggle();
        });

        document.getElementById('tws-minimizar').addEventListener('click', () => {
            const body = document.getElementById('tws-body');
            const btn  = document.getElementById('tws-minimizar');
            const visivel = body.style.display !== 'none';
            body.style.display = visivel ? 'none' : 'flex';
            btn.textContent    = visivel ? '+' : '−';
            painel.style.borderRadius = visivel ? '10px' : '10px 10px 0 0';
        });

        // --- Arrastar ---
        const header = document.getElementById('tws-header');
        let dragging = false, offsetX, offsetY;

        header.addEventListener('mousedown', e => {
            if (e.target.id === 'tws-minimizar') return;
            dragging = true;
            const r = painel.getBoundingClientRect();
            offsetX = e.clientX - r.left;
            offsetY = e.clientY - r.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            const x = Math.max(0, Math.min(e.clientX - offsetX, window.innerWidth  - painel.offsetWidth));
            const y = Math.max(0, Math.min(e.clientY - offsetY, window.innerHeight - painel.offsetHeight));
            painel.style.left   = x + 'px';
            painel.style.top    = y + 'px';
            painel.style.right  = 'auto';
            painel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => { dragging = false; });
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
