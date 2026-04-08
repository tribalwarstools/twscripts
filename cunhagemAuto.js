// ==UserScript==
// @name         Tribal Wars - Cunhagem Automática Contínua
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Passa por todas as aldeias em loop contínuo cunhando moedas
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÕES PADRÃO
    // ============================================
    const CONFIG_PADRAO = {
        cunharMaximo: false,
        quantidade: 1,
        pausaEntreAldeias: 2000,
        pausaEntreCiclos: 30000
    };

    // ============================================
    // VARIÁVEIS
    // ============================================
    let CONFIG = { ...CONFIG_PADRAO };
    let rodando = false;
    let cicloAtivo = false;
    let painel = null;
    let custoMoeda = { wood: 28000, stone: 30000, iron: 25000 };
    let totalCunhado = 0;
    let totalCiclos = 0;

    // ============================================
    // PERSISTÊNCIA (localStorage)
    // ============================================
    const STORAGE_KEY = 'tws_cunhagem_config';

    function salvarConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                config: CONFIG,
                totalCunhado: totalCunhado,
                totalCiclos: totalCiclos,
                ultimaAtualizacao: Date.now()
            }));
            console.log('[Cunhagem] Configurações salvas');
        } catch (err) {
            console.error('[Cunhagem] Erro ao salvar:', err);
        }
    }

    function carregarConfig() {
        try {
            const salvo = localStorage.getItem(STORAGE_KEY);
            if (salvo) {
                const dados = JSON.parse(salvo);
                CONFIG = { ...CONFIG_PADRAO, ...dados.config };
                totalCunhado = dados.totalCunhado || 0;
                totalCiclos = dados.totalCiclos || 0;
                console.log('[Cunhagem] Configurações carregadas');
                console.log('  - Cunhar máximo:', CONFIG.cunharMaximo);
                console.log('  - Quantidade:', CONFIG.quantidade);
                console.log('  - Pausa entre aldeias:', CONFIG.pausaEntreAldeias);
                console.log('  - Pausa entre ciclos:', CONFIG.pausaEntreCiclos);
                console.log('  - Total já cunhado:', totalCunhado);
            }
        } catch (err) {
            console.error('[Cunhagem] Erro ao carregar:', err);
        }
    }

    function resetarConfig() {
        CONFIG = { ...CONFIG_PADRAO };
        totalCunhado = 0;
        totalCiclos = 0;
        salvarConfig();
        
        // Atualizar interface
        if (painel) {
            const maximoCheck = document.getElementById('tws-maximo');
            const quantidadeDiv = document.getElementById('tws-quantidade-div');
            const quantidadeInput = document.getElementById('tws-quantidade');
            const pausaInput = document.getElementById('tws-pausa');
            const pausaCicloInput = document.getElementById('tws-pausa-ciclo');
            
            if (maximoCheck) maximoCheck.checked = CONFIG.cunharMaximo;
            if (quantidadeDiv) quantidadeDiv.style.display = CONFIG.cunharMaximo ? 'none' : 'block';
            if (quantidadeInput) quantidadeInput.value = CONFIG.quantidade;
            if (pausaInput) pausaInput.value = CONFIG.pausaEntreAldeias;
            if (pausaCicloInput) pausaCicloInput.value = CONFIG.pausaEntreCiclos;
        }
        
        atualizarStatus(`🔄 Configurações resetadas! Total cunhado zerado.`);
        console.log('[Cunhagem] Configurações resetadas');
    }

    // ============================================
    // FUNÇÕES
    // ============================================
    function formatarNumero(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function atualizarStatus(texto) {
        const statusDiv = document.getElementById('tws-status');
        if (statusDiv) {
            statusDiv.innerHTML = texto;
        }
    }

    function extrairRecursos(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const wood = doc.getElementById('wood');
        const stone = doc.getElementById('stone');
        const iron = doc.getElementById('iron');
        
        return {
            wood: wood ? parseInt(wood.textContent.replace(/\./g, '')) : 0,
            stone: stone ? parseInt(stone.textContent.replace(/\./g, '')) : 0,
            iron: iron ? parseInt(iron.textContent.replace(/\./g, '')) : 0
        };
    }

    function calcularMaximo(resources) {
        const maxWood = Math.floor(resources.wood / custoMoeda.wood);
        const maxStone = Math.floor(resources.stone / custoMoeda.stone);
        const maxIron = Math.floor(resources.iron / custoMoeda.iron);
        return Math.min(maxWood, maxStone, maxIron);
    }

    function podeCunhar(resources, quantidade) {
        return resources.wood >= custoMoeda.wood * quantidade &&
               resources.stone >= custoMoeda.stone * quantidade &&
               resources.iron >= custoMoeda.iron * quantidade;
    }

    async function cunharMoeda(villageId, villageName, quantidade) {
        try {
            const response = await fetch(`/game.php?village=${villageId}&screen=snob`, {
                credentials: 'same-origin'
            });
            
            if (!response.ok) return false;
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const form = doc.querySelector('form[action*="screen=snob&action=coin"]');
            if (!form) return false;
            
            const formData = new FormData();
            formData.append('count', quantidade);
            
            const csrfMatch = html.match(/name="h" value="([^"]+)"/);
            if (csrfMatch) formData.append('h', csrfMatch[1]);
            
            const result = await fetch(form.action, {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            });
            
            return result.ok;
            
        } catch (err) {
            console.error(`Erro ao cunhar em ${villageName}:`, err);
            return false;
        }
    }

    async function escanearECunhar() {
        if (!rodando) return;
        if (cicloAtivo) return;
        
        cicloAtivo = true;
        totalCiclos++;
        salvarConfig();
        
        atualizarStatus(`🔄 Ciclo ${totalCiclos} - Buscando aldeias...`);
        
        try {
            const resposta = await fetch('/map/village.txt');
            const dados = await resposta.text();
            const meuId = window.game_data?.player?.id;
            
            const todasAldeias = dados.trim().split('\n').map(line => {
                const [id, name, x, y, player, points] = line.split(',');
                return {
                    id: parseInt(id),
                    name: decodeURIComponent(name.replace(/\+/g, ' ')),
                    coord: `${x}|${y}`,
                    player: parseInt(player),
                    pontos: parseInt(points)
                };
            });
            
            const minhasAldeias = todasAldeias.filter(v => v.player === meuId);
            
            atualizarStatus(`🔍 Verificando ${minhasAldeias.length} aldeias... | Cunhado: ${totalCunhado} moedas`);
            
            for (const aldeia of minhasAldeias) {
                if (!rodando) break;
                
                atualizarStatus(`📍 Verificando ${aldeia.name} (${aldeia.coord})...`);
                
                const overview = await fetch(`/game.php?village=${aldeia.id}&screen=overview`, {
                    credentials: 'same-origin'
                });
                
                if (!overview.ok) continue;
                
                const html = await overview.text();
                const recursos = extrairRecursos(html);
                
                let quantidadeCunhar = CONFIG.quantidade;
                
                if (CONFIG.cunharMaximo) {
                    quantidadeCunhar = calcularMaximo(recursos);
                }
                
                if (quantidadeCunhar > 0 && podeCunhar(recursos, quantidadeCunhar)) {
                    atualizarStatus(`💰 CUNHANDO ${quantidadeCunhar} moeda(s) em ${aldeia.name}...`);
                    
                    const sucesso = await cunharMoeda(aldeia.id, aldeia.name, quantidadeCunhar);
                    
                    if (sucesso) {
                        totalCunhado += quantidadeCunhar;
                        salvarConfig();
                        atualizarStatus(`✅ ${quantidadeCunhar} moeda(s) cunhada(s) em ${aldeia.name}! Total: ${totalCunhado} moedas`);
                        console.log(`[Cunhagem] ✅ ${quantidadeCunhar} moedas em ${aldeia.name} (${aldeia.coord}) - Total: ${totalCunhado}`);
                    } else {
                        atualizarStatus(`❌ Falha ao cunhar em ${aldeia.name}`);
                        console.log(`[Cunhagem] ❌ Falha em ${aldeia.name}`);
                    }
                }
                
                await new Promise(r => setTimeout(r, CONFIG.pausaEntreAldeias));
            }
            
            if (rodando) {
                atualizarStatus(`✅ Ciclo ${totalCiclos} concluído! Aguardando ${CONFIG.pausaEntreCiclos/1000}s... | Total cunhado: ${totalCunhado} moedas`);
                console.log(`[Cunhagem] Ciclo ${totalCiclos} concluído. Total cunhado: ${totalCunhado}`);
            }
            
        } catch (err) {
            console.error('[Cunhagem] Erro:', err);
            atualizarStatus(`❌ Erro: ${err.message}`);
        }
        
        cicloAtivo = false;
        
        if (rodando) {
            await new Promise(r => setTimeout(r, CONFIG.pausaEntreCiclos));
            if (rodando) {
                escanearECunhar();
            }
        }
    }

    function iniciar() {
        if (rodando) {
            atualizarStatus('⚠️ Já está rodando!');
            return;
        }
        
        rodando = true;
        
        atualizarStatus('🚀 INICIADO! Verificando aldeias...');
        console.log('[Cunhagem] Iniciado!');
        console.log(`[Cunhagem] Modo: ${CONFIG.cunharMaximo ? 'Cunhar MÁXIMO' : `Cunhar ${CONFIG.quantidade} moeda(s) por vez`}`);
        
        escanearECunhar();
    }

    function parar() {
        rodando = false;
        atualizarStatus('⏹️ PARADO. Clique em "INICIAR" para recomeçar.');
        console.log('[Cunhagem] Parado. Total cunhado:', totalCunhado);
        salvarConfig();
    }

    // ============================================
    // PAINEL
    // ============================================
    function criarPainel() {
        if (painel) return;
        
        painel = document.createElement('div');
        painel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 280px;
            background: #1e1e1e;
            border: 2px solid #ff9900;
            border-radius: 10px;
            padding: 12px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            color: #fff;
            font-size: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        `;
        
        painel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #ff9900; text-align: center;">
                💰 Cunhagem Automática Contínua
            </div>
            <div style="margin-bottom: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <input type="checkbox" id="tws-maximo" ${CONFIG.cunharMaximo ? 'checked' : ''}>
                    <span>Cunhar MÁXIMO possível em cada aldeia</span>
                </label>
            </div>
            <div id="tws-quantidade-div" style="margin-bottom: 8px; ${CONFIG.cunharMaximo ? 'display: none;' : ''}">
                <label style="display: block; margin-bottom: 3px;">Quantidade por cunhagem:</label>
                <input type="number" id="tws-quantidade" value="${CONFIG.quantidade}" min="1" max="100" 
                       style="width: 100%; padding: 4px; background: #333; border: 1px solid #555; color: #fff; border-radius: 3px;">
            </div>
            <div style="margin-bottom: 8px;">
                <label style="display: block; margin-bottom: 3px;">Pausa entre aldeias (ms):</label>
                <input type="number" id="tws-pausa" value="${CONFIG.pausaEntreAldeias}" min="500" max="10000" step="500"
                       style="width: 100%; padding: 4px; background: #333; border: 1px solid #555; color: #fff; border-radius: 3px;">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 3px;">Pausa entre ciclos (ms):</label>
                <input type="number" id="tws-pausa-ciclo" value="${CONFIG.pausaEntreCiclos}" min="5000" max="300000" step="5000"
                       style="width: 100%; padding: 4px; background: #333; border: 1px solid #555; color: #fff; border-radius: 3px;">
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="tws-iniciar" style="flex: 1; background: #4caf50; color: #fff; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    ▶ INICIAR
                </button>
                <button id="tws-parar" style="flex: 1; background: #f44336; color: #fff; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    ⏹️ PARAR
                </button>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="tws-resetar" style="flex: 1; background: #ff9800; color: #fff; border: none; padding: 6px; border-radius: 5px; cursor: pointer; font-size: 11px;">
                    🔄 RESETAR CONFIG
                </button>
            </div>
            <div id="tws-status" style="margin-top: 8px; padding: 6px; background: #2a2a2a; border-radius: 4px; font-size: 10px; color: #ff9900; text-align: center; min-height: 50px;">
                ⏸️ Parado | Total já cunhado: ${totalCunhado} moedas
            </div>
        `;
        
        document.body.appendChild(painel);
        
        // Eventos
        const maximoCheck = document.getElementById('tws-maximo');
        const quantidadeDiv = document.getElementById('tws-quantidade-div');
        const quantidadeInput = document.getElementById('tws-quantidade');
        const pausaInput = document.getElementById('tws-pausa');
        const pausaCicloInput = document.getElementById('tws-pausa-ciclo');
        
        maximoCheck.addEventListener('change', () => {
            CONFIG.cunharMaximo = maximoCheck.checked;
            quantidadeDiv.style.display = CONFIG.cunharMaximo ? 'none' : 'block';
            salvarConfig();
        });
        
        quantidadeInput.addEventListener('change', () => {
            CONFIG.quantidade = parseInt(quantidadeInput.value) || 1;
            salvarConfig();
        });
        
        pausaInput.addEventListener('change', () => {
            CONFIG.pausaEntreAldeias = parseInt(pausaInput.value) || 2000;
            salvarConfig();
        });
        
        pausaCicloInput.addEventListener('change', () => {
            CONFIG.pausaEntreCiclos = parseInt(pausaCicloInput.value) || 30000;
            salvarConfig();
        });
        
        document.getElementById('tws-iniciar').onclick = iniciar;
        document.getElementById('tws-parar').onclick = parar;
        document.getElementById('tws-resetar').onclick = resetarConfig;
    }
    
    function iniciarScript() {
        console.log('[Cunhagem] Script carregado');
        carregarConfig();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', criarPainel);
        } else {
            criarPainel();
        }
    }
    
    iniciarScript();
    
})();
