// ==UserScript==
// @name         Tribal Wars - Recrutamento Automático
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Recrutamento automático via formulário nativo
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

    // ============================================
    // CONFIGURAÇÕES PADRÃO
    // ============================================
    const DEFAULTS = {
        ativado:        false,
        unidade:        'spy',
        quantidade:     5,
        pausaAldeias:   2000,
        pausaCiclos:    60000,
        minimizado:     false,
        posX:           null,
        posY:           null,
        totalRecrutado: 0
    };

    let ATIVADO             = DEFAULTS.ativado;
    let UNIDADE             = DEFAULTS.unidade;
    let QUANTIDADE          = DEFAULTS.quantidade;
    let PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
    let PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
    let MINIMIZADO          = DEFAULTS.minimizado;
    let POS_X               = DEFAULTS.posX;
    let POS_Y               = DEFAULTS.posY;
    let totalRecrutado      = DEFAULTS.totalRecrutado;

    let rodando    = false;
    let cicloAtivo = false;
    let cicloAtual = 0;
    let painel     = null;

    // ============================================
    // PERSISTÊNCIA
    // ============================================
    const STORAGE_KEY = 'tws_recrutamento_v2';

    function salvarEstado() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ativado:        ATIVADO,
            unidade:        UNIDADE,
            quantidade:     QUANTIDADE,
            pausaAldeias:   PAUSA_ENTRE_ALDEIAS,
            pausaCiclos:    PAUSA_ENTRE_CICLOS,
            minimizado:     MINIMIZADO,
            posX:           POS_X,
            posY:           POS_Y,
            totalRecrutado: totalRecrutado
        }));
    }

    function carregarEstado() {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) {
            const d = JSON.parse(salvo);
            ATIVADO             = false;
            UNIDADE             = d.unidade        || DEFAULTS.unidade;
            QUANTIDADE          = d.quantidade     || DEFAULTS.quantidade;
            PAUSA_ENTRE_ALDEIAS = d.pausaAldeias   || DEFAULTS.pausaAldeias;
            PAUSA_ENTRE_CICLOS  = d.pausaCiclos    || DEFAULTS.pausaCiclos;
            MINIMIZADO          = d.minimizado     || DEFAULTS.minimizado;
            POS_X               = d.posX           !== undefined ? d.posX : DEFAULTS.posX;
            POS_Y               = d.posY           !== undefined ? d.posY : DEFAULTS.posY;
            totalRecrutado      = d.totalRecrutado || DEFAULTS.totalRecrutado;
        }
    }

    function resetarTudo() {
        if (ATIVADO) { ATIVADO = false; rodando = false; cicloAtivo = false; }
        UNIDADE             = DEFAULTS.unidade;
        QUANTIDADE          = DEFAULTS.quantidade;
        PAUSA_ENTRE_ALDEIAS = DEFAULTS.pausaAldeias;
        PAUSA_ENTRE_CICLOS  = DEFAULTS.pausaCiclos;
        MINIMIZADO          = DEFAULTS.minimizado;
        POS_X               = DEFAULTS.posX;
        POS_Y               = DEFAULTS.posY;
        totalRecrutado      = DEFAULTS.totalRecrutado;
        cicloAtual          = 0;
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
        const selUnidade = document.getElementById('tws-unidade');
        const inpQtd     = document.getElementById('tws-quantidade');
        const inpAldeias = document.getElementById('tws-pausa-aldeias');
        const inpCiclos  = document.getElementById('tws-pausa-ciclos');
        const body       = document.getElementById('tws-body');
        const minimizar  = document.getElementById('tws-minimizar');

        if (selUnidade) selUnidade.value      = UNIDADE;
        if (inpQtd)     inpQtd.value          = QUANTIDADE;
        if (inpAldeias) inpAldeias.value      = PAUSA_ENTRE_ALDEIAS;
        if (inpCiclos)  inpCiclos.value       = PAUSA_ENTRE_CICLOS / 1000;
        if (body)       body.style.display    = MINIMIZADO ? 'none' : 'flex';
        if (minimizar)  minimizar.textContent = MINIMIZADO ? '+' : '−';

        atualizarBotao(false);
        atualizarMetricas();

        ['tws-err-qtd','tws-err-aldeias','tws-err-ciclos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        ['tws-quantidade','tws-pausa-aldeias','tws-pausa-ciclos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.borderColor = '#444';
        });
    }

    // ============================================
    // VALIDAÇÃO
    // ============================================
    function validarCampos() {
        let ok = true;

        const inpQtd = document.getElementById('tws-quantidade');
        const v = parseInt(inpQtd?.value);
        const validQ = !isNaN(v) && v >= 1 && v <= 9999;
        if (inpQtd) inpQtd.style.borderColor = validQ ? '#444' : '#e24b4a';
        const errQ = document.getElementById('tws-err-qtd');
        if (errQ) errQ.style.display = validQ ? 'none' : 'block';
        if (!validQ) ok = false;

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
    async function recrutarNaAldeia(villageId) {
        const unidadeInfo = UNIDADES[UNIDADE];
        if (!unidadeInfo) return { success: false, reason: 'Unidade inválida' };

        try {
            // 1. Carrega a tela de treinamento
            const tela = unidadeInfo.tela;
            const url  = `/game.php?village=${villageId}&screen=${tela}`;
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) return { success: false, reason: `HTTP ${response.status}` };

            const html = await response.text();

            // 2. Verifica se o input da unidade existe na página
            //    Ex: <input name="spear" id="spear_0" ...>
            const inputRegex = new RegExp(`name="${UNIDADE}"`, 'i');
            if (!inputRegex.test(html)) {
                return { success: false, reason: `Sem ${unidadeInfo.nome} disponível` };
            }

            // 3. Verifica se máximo > 0 via link de máximo
            //    Ex: <a id="spear_0_a" href="javascript:unit_build_block.set_max('spear')">(670)</a>
            const maxRegex = new RegExp(`set_max\\('${UNIDADE}'\\)[^(]*\\((\\d+)\\)`, 'i');
            const maxMatch = html.match(maxRegex);
            const maximo   = maxMatch ? parseInt(maxMatch[1]) : 0;

            if (maximo === 0) {
                return { success: false, reason: 'Sem unidades disponíveis (máx. = 0)' };
            }

            // 4. Quantidade a recrutar — respeita o máximo permitido pelo jogo
            const quantidadeRecrutar = Math.min(QUANTIDADE, maximo);

            // 5. Extrai o formulário nativo
            const parser = new DOMParser();
            const doc    = parser.parseFromString(html, 'text/html');

            // O form de treino — pode ser action=/game.php?...&action=train ou similar
            const form = doc.querySelector('form[action*="screen=' + tela + '"]') ||
                         doc.querySelector('form#unit_order_form') ||
                         doc.querySelector('form.train-form') ||
                         doc.querySelector('form');

            if (!form) return { success: false, reason: 'Formulário não encontrado' };

            // 6. Extrai CSRF do form ou do game_data
            const actionUrl  = form.getAttribute('action') || '';
            const csrfMatch  = actionUrl.match(/[&?]h=([a-f0-9]+)/i) ||
                               html.match(/"csrf":"([a-f0-9]+)"/i) ||
                               html.match(/name="h" value="([^"]+)"/);
            const csrf = csrfMatch ? csrfMatch[1] : (window.game_data?.csrf || '');

            if (!csrf) return { success: false, reason: 'CSRF não encontrado' };

            // 7. Monta FormData com todos os campos hidden + a unidade preenchida
            const formData = new URLSearchParams();
            form.querySelectorAll('input, select').forEach(inp => {
                if (!inp.name) return;
                if (inp.type === 'submit' || inp.type === 'button') return;
                // Zera todas as unidades e preenche só a escolhida
                if (Object.keys(UNIDADES).includes(inp.name)) {
                    formData.set(inp.name, inp.name === UNIDADE ? quantidadeRecrutar.toString() : '');
                } else {
                    formData.set(inp.name, inp.value);
                }
            });

            // Garante que a unidade está setada mesmo se o input não foi encontrado no form
            formData.set(UNIDADE, quantidadeRecrutar.toString());
            formData.set('h', csrf);

            // 8. POST para a URL de treinamento
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

            // 9. Verifica resposta
            const contentType = postResponse.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                const json = await postResponse.json().catch(() => null);
                if (json?.response?.success === true) {
                    return { success: true, quantidade: quantidadeRecrutar };
                }
                if (json?.response?.success === false) {
                    return { success: false, reason: json?.response?.msg || 'Recusado pelo servidor' };
                }
            }

            // Fallback: HTML — verifica textos de erro conhecidos
            const texto = await postResponse.text().catch(() => '');
            if (/recursos insuficientes|not enough/i.test(texto))
                return { success: false, reason: 'Recursos insuficientes' };
            if (/fila cheia|queue full|limite/i.test(texto))
                return { success: false, reason: 'Fila cheia ou limite atingido' };

            // Se chegou aqui sem erro explícito, assume sucesso
            return { success: true, quantidade: quantidadeRecrutar };

        } catch (err) {
            console.error('[Recrutamento] Erro:', err);
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
        console.log(`Unidade: ${UNIDADES[UNIDADE]?.nome} | Qtd: ${QUANTIDADE}`);
        console.log(`========================================`);

        try {
            const response = await fetch('/map/village.txt', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Não foi possível carregar aldeias');

            const dados = await response.text();
            const meuId = window.game_data?.player?.id;

            if (!meuId) {
                adicionarLog('Erro: ID do jogador não encontrado', 'err');
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

                console.log(`[${index}/${minhasAldeias.length}] ${aldeia.name} (${aldeia.coord})`);

                const resultado = await recrutarNaAldeia(aldeia.id);

                if (resultado.success) {
                    totalRecrutado += resultado.quantidade;
                    salvarEstado();
                    atualizarMetricas();
                    adicionarLog(`${aldeia.name}: +${resultado.quantidade} ${UNIDADES[UNIDADE]?.nome}`, 'ok');
                    console.log(`  ✓ Recrutou ${resultado.quantidade}`);
                } else {
                    const tipoLog = resultado.reason === 'Recursos insuficientes' ? 'warn' : 'err';
                    adicionarLog(`${aldeia.name}: ${resultado.reason}`, tipoLog);
                    console.log(`  ✗ ${resultado.reason}`);
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
        adicionarLog(`Iniciando — ${UNIDADES[UNIDADE]?.nome} x${QUANTIDADE}`, 'ok');
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
    // UI
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

    // ============================================
    // PAINEL
    // ============================================
    function criarPainel() {
        if (painel) return;

        const inputStyle = 'width:100%;padding:6px 8px;background:#111;border:1px solid #444;color:#e0e0e0;border-radius:6px;font-size:12px;box-sizing:border-box;';
        const labelStyle = 'display:block;margin-bottom:4px;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.4px;';
        const errStyle   = 'display:none;font-size:10px;color:#e24b4a;margin-top:3px;';

        const optionsHtml = Object.entries(UNIDADES)
            .map(([key, val]) => `<option value="${key}" ${key === UNIDADE ? 'selected' : ''}>${val.nome}</option>`)
            .join('');

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

        painel.innerHTML = `
            <div id="tws-header" style="background:#2c2c2c;padding:10px 14px;border-radius:11px 11px 0 0;display:flex;align-items:center;justify-content:space-between;cursor:move;border-bottom:1px solid #3a3a3a;user-select:none;">
                <span style="font-weight:bold;color:#ffa500;font-size:13px;">⚔️ Recrutamento Automático</span>
                <button id="tws-minimizar" style="background:#3a3a3a;border:none;color:#ccc;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;">${MINIMIZADO ? '+' : '−'}</button>
            </div>

            <div id="tws-body" style="padding:14px;display:${MINIMIZADO ? 'none' : 'flex'};flex-direction:column;gap:12px;">

                <div style="display:flex;align-items:center;gap:10px;background:#252525;border-radius:8px;padding:8px 12px;">
                    <div id="tws-dot" style="width:10px;height:10px;border-radius:50%;background:#e24b4a;flex-shrink:0;transition:background .3s;"></div>
                    <span id="tws-status" style="font-weight:500;font-size:12px;">Parado</span>
                </div>

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

                <div>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Configuração</div>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div>
                            <label style="${labelStyle}" for="tws-unidade">Unidade</label>
                            <select id="tws-unidade" style="${inputStyle}">${optionsHtml}</select>
                        </div>
                        <div>
                            <label style="${labelStyle}" for="tws-quantidade">Quantidade por aldeia</label>
                            <input type="number" id="tws-quantidade" value="${QUANTIDADE}" min="1" max="9999" step="1" style="${inputStyle}">
                            <span id="tws-err-qtd" style="${errStyle}">Informe um valor entre 1 e 9999</span>
                        </div>
                    </div>
                </div>

                <div style="border-top:1px solid #2e2e2e;"></div>

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

                <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch;">
                    <button id="tws-botao" style="padding:10px;border:none;border-radius:8px;font-weight:bold;font-size:13px;cursor:pointer;background:#27ae60;color:#fff;transition:opacity .15s;">
                        ▶ Ativar
                    </button>
                    <button id="tws-reset" title="Resetar tudo" style="padding:10px 12px;border:1px solid #3a3a3a;border-radius:8px;font-size:12px;cursor:pointer;background:#2e2e2e;color:#e24b4a;font-weight:bold;white-space:nowrap;">
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

        // --- Eventos ---
        const selUnidade = document.getElementById('tws-unidade');
        const inpQtd     = document.getElementById('tws-quantidade');
        const inpAldeias = document.getElementById('tws-pausa-aldeias');
        const inpCiclos  = document.getElementById('tws-pausa-ciclos');

        selUnidade.addEventListener('change', () => {
            UNIDADE = selUnidade.value;
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
            if (confirm('Resetar tudo? Isso vai parar o recrutamento, zerar contadores e apagar configurações salvas.')) {
                resetarTudo();
            }
        });

        const minimizar = document.getElementById('tws-minimizar');
        const body      = document.getElementById('tws-body');
        minimizar.addEventListener('click', () => {
            MINIMIZADO = body.style.display !== 'none';
            body.style.display    = MINIMIZADO ? 'none' : 'flex';
            minimizar.textContent = MINIMIZADO ? '+' : '−';
            salvarEstado();
        });

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
    // INICIALIZAÇÃO
    // ============================================
    carregarEstado();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', criarPainel);
    } else {
        criarPainel();
    }

})();
