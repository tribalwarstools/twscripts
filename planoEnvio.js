(async function() {
    if (window.__TW_PANEL__) {
        alert("Painel já aberto!");
        return;
    }
    window.__TW_PANEL__ = true;

    // === FUNÇÕES DE CÁLCULO DE TEMPO ===
    const velocidadesUnidades = {
        spear: 18,      // Lanceiro
        sword: 22,      // Espadachim
        axe: 18,        // Machado
        archer: 18,     // Arqueiro
        spy: 9,         // Espião
        light: 10,      // Cavalaria Leve
        marcher: 10,    // Arqueiro a Cavalo
        heavy: 11,      // Cavalaria Pesada
        ram: 30,        // Ariete
        catapult: 30,   // Catapulta
        knight: 10,     // Paladino
        snob: 35        // Nobre
    };

    // === FUNÇÕES AUXILIARES DE VALIDAÇÃO ===
    
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

    // Valida formato de data/hora (DD/MM/YYYY HH:MM:SS)
    function validarDataHora(dataHoraStr) {
        return /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/.test(dataHoraStr);
    }
    
    // Converte string de data para objeto Date (FUNÇÃO UNIFICADA)
    function parseDataHora(dataHoraStr) {
        if (!validarDataHora(dataHoraStr)) {
            throw new Error(`Formato de data inválido: ${dataHoraStr}`);
        }
        
        const [data, tempo] = dataHoraStr.split(' ');
        const [dia, mes, ano] = data.split('/').map(Number);
        const [hora, minuto, segundo] = tempo.split(':').map(Number);
        
        const date = new Date(ano, mes - 1, dia, hora, minuto, segundo);
        
        // Valida se a data é válida
        if (isNaN(date.getTime())) {
            throw new Error(`Data inválida: ${dataHoraStr}`);
        }
        
        return date;
    }

    // Calcula distância entre coordenadas
    function calcularDistancia(coord1, coord2) {
        const [x1, y1] = coord1.split('|').map(Number);
        const [x2, y2] = coord2.split('|').map(Number);
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    // Calcula tempo de viagem em milissegundos
    function calcularTempoViagem(origem, destino, unidadeMaisLenta, bonusSinal = 0) {
        const distancia = calcularDistancia(origem, destino);
        const velocidadeBase = velocidadesUnidades[unidadeMaisLenta];
        const fatorBonus = 1 + (bonusSinal / 100);
        const tempoMinutos = (distancia * velocidadeBase) / fatorBonus;
        return tempoMinutos * 60000; // Converter para milissegundos
    }

    // Formata data para exibição
    function formatarDataHora(data) {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const hora = String(data.getHours()).padStart(2, '0');
        const minuto = String(data.getMinutes()).padStart(2, '0');
        const segundo = String(data.getSeconds()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
    }

    // Calcula horário de lançamento baseado na chegada
    function calcularHorarioLancamento(origem, destino, horaChegada, tropas, bonusSinal = 0) {
        const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
        const tempoViagem = calcularTempoViagem(origem, destino, unidadeMaisLenta, bonusSinal);
        const chegadaDate = parseDataHora(horaChegada);
        const lancamentoDate = new Date(chegadaDate.getTime() - tempoViagem);
        return formatarDataHora(lancamentoDate);
    }

    // Calcula horário de chegada baseado no lançamento
    function calcularHorarioChegada(origem, destino, horaLancamento, tropas, bonusSinal = 0) {
        const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
        const tempoViagem = calcularTempoViagem(origem, destino, unidadeMaisLenta, bonusSinal);
        const lancamentoDate = parseDataHora(horaLancamento);
        const chegadaDate = new Date(lancamentoDate.getTime() + tempoViagem);
        return formatarDataHora(chegadaDate);
    }

    // --- Carrega o village.txt ---
    const res = await fetch('/map/village.txt');
    const text = await res.text();
    const lines = text.trim().split('\n');
    const villageMap = {};
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 6) {
            const x = parts[2], y = parts[3], id = parts[0];
            villageMap[`${x}|${y}`] = id;
        }
    }
    console.log(`[TW Panel] Aldeias carregadas: ${Object.keys(villageMap).length}`);

    // --- URLs das imagens das unidades ---
    const unitImages = {
        spear: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_spear.webp',
        sword: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_sword.webp',
        axe: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_axe.webp',
        archer: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_archer.webp',
        spy: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_spy.webp',
        light: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_light.webp',
        marcher: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_marcher.webp',
        heavy: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_heavy.webp',
        ram: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_ram.webp',
        catapult: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_catapult.webp',
        knight: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_knight.webp',
        snob: 'https://dsbr.innogamescdn.com/asset/4aba6bcf/graphic/unit/unit_snob.webp'
    };

    // --- Ordem das unidades da MAIS LENTA para a MAIS RÁPIDA ---
    const unidadesPorVelocidade = [
        'snob', 'catapult', 'ram', 'sword', 'spear', 'archer', 'axe',
        'heavy', 'light', 'marcher', 'knight', 'spy'
    ];

    // --- Função para encontrar a unidade mais lenta presente ---
    function getUnidadeMaisLenta(tropas) {
        for (const unidade of unidadesPorVelocidade) {
            if (tropas[unidade] > 0) {
                return unidade;
            }
        }
        return null; // Retorna null se não houver tropas
    }

    // --- Cria painel na tela ---
    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'fixed',
        top: '50px',
        left: '50px',
        width: '450px',
        background: 'rgba(240, 240, 240, 0.98)',
        color: '#333',
        padding: '12px',
        border: '1px solid #ccc',
        borderRadius: '6px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        zIndex: 999999,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(5px)'
    });
    
    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #ddd;">
            <h3 style="margin:0; color:#2c3e50; cursor:move; font-size:14px; font-weight:600;">Coordenador de Ataques</h3>
            <button id="fechar" style="background:#e74c3c; color:white; border:none; padding:3px 8px; border-radius:3px; cursor:pointer; font-size:10px;">✕</button>
        </div>
        
        <div style="margin-bottom:10px;">
            <label style="font-weight:600; color:#2c3e50;">🎯 Destino(s):</label>
            <input id="destinos" style="width:100%; padding:6px; margin-top:4px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;" placeholder="559|452 560|453">
            <small style="color:#7f8c8d; font-size:10px;">Coordenadas separadas por espaço</small>
        </div>
        
        <div style="margin-bottom:10px;">
            <label style="font-weight:600; color:#2c3e50;">🏠 Origem(ns):</label>
            <input id="origens" style="width:100%; padding:6px; margin-top:4px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;" placeholder="542|433 544|432">
            <small style="color:#7f8c8d; font-size:10px;">Coordenadas separadas por espaço</small>
        </div>
        
        <div style="margin-bottom:10px;">
            <div style="display:flex; gap:8px; margin-bottom:6px;">
                <div style="flex:1;">
                    <label style="font-weight:600; color:#2c3e50;">🎯 Tipo de Cálculo:</label>
                    <select id="tipoCalculo" style="width:100%; padding:6px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;">
                        <option value="chegada">Por Hora de Chegada</option>
                        <option value="lancamento">Por Hora de Lançamento</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="font-weight:600; color:#2c3e50;">📈 Sinal (%):</label>
                    <input id="bonusSinal" type="number" value="0" min="0" max="100" style="width:100%; padding:6px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;" placeholder="0">
                </div>
            </div>
            
            <div style="margin-bottom:6px;">
                <label style="font-weight:600; color:#2c3e50;">🔀 Ordenação:</label>
                <select id="tipoOrdenacao" style="width:100%; padding:6px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;">
                    <option value="digitacao">Por Ordem de Digitação</option>
                    <option value="lancamento">Por Horário de Lançamento</option>
                    <option value="chegada">Por Horário de Chegada</option>
                    <option value="distancia">Por Distância</option>
                </select>
            </div>

            <div style="margin-bottom:6px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:600; color:#2c3e50;">
                    <input type="checkbox" id="incrementarSegundos" style="margin:0;">
                    ⏱️ Incrementar 5s por ataque
                </label>
                <small style="color:#7f8c8d; font-size:10px; display:block; margin-top:2px;">Evita que muitos ataques saiam no mesmo momento</small>
            </div>
            
            <div id="campoHoraChegada">
                <label style="font-weight:600; color:#2c3e50;">⏰ Hora de Chegada:</label>
                <input id="horaChegada" type="text" style="width:100%; padding:6px; margin-top:4px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;" placeholder="15/11/2025 18:30:00">
            </div>
            
            <div id="campoHoraLancamento" style="display:none;">
                <label style="font-weight:600; color:#2c3e50;">🚀 Hora de Lançamento:</label>
                <input id="horaLancamento" type="text" style="width:100%; padding:6px; margin-top:4px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;" placeholder="15/11/2025 17:45:00">
            </div>
        </div>
        
        <div style="margin-bottom:12px; border:1px solid #ddd; padding:8px; border-radius:4px; background:rgba(255,255,255,0.8);">
            <label style="display:block; margin-bottom:6px; font-weight:600; color:#2c3e50;">⚔️ Tropas:</label>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.spear}" width="18" height="18" title="Lança" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Lança:</label>
                    <input type="number" id="spear" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.sword}" width="18" height="18" title="Espada" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Espada:</label>
                    <input type="number" id="sword" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.axe}" width="18" height="18" title="Machado" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Machado:</label>
                    <input type="number" id="axe" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.archer}" width="18" height="18" title="Arqueiro" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Arqueiro:</label>
                    <input type="number" id="archer" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.spy}" width="18" height="18" title="Espião" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Espião:</label>
                    <input type="number" id="spy" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.light}" width="18" height="18" title="Cavalaria Leve" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Cavalaria L.:</label>
                    <input type="number" id="light" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.marcher}" width="18" height="18" title="Arqueiro a Cavalo" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Arqueiro C.:</label>
                    <input type="number" id="marcher" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.heavy}" width="18" height="18" title="Cavalaria Pesada" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Cavalaria P.:</label>
                    <input type="number" id="heavy" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.ram}" width="18" height="18" title="Ariete" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Ariete:</label>
                    <input type="number" id="ram" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.catapult}" width="18" height="18" title="Catapulta" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Catapulta:</label>
                    <input type="number" id="catapult" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.knight}" width="18" height="18" title="Paladino" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Paladino:</label>
                    <input type="number" id="knight" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <img src="${unitImages.snob}" width="18" height="18" title="Nobre" onerror="this.style.display='none'" style="flex-shrink:0;">
                    <label style="width:65px; font-size:11px;">Nobre:</label>
                    <input type="number" id="snob" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                </div>
            </div>
            
            <div style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
                <button id="limparTropas" style="padding:4px 8px; background:#95a5a6; color:white; border:none; border-radius:2px; cursor:pointer; font-size:10px;">🗑️ Limpar</button>
                <button id="preencherAtaque" style="padding:4px 8px; background:#e74c3c; color:white; border:none; border-radius:2px; cursor:pointer; font-size:10px;">⚔️ Ataque</button>
                <button id="preencherDefesa" style="padding:4px 8px; background:#3498db; color:white; border:none; border-radius:2px; cursor:pointer; font-size:10px;">🛡️ Defesa</button>
                <button id="preencherNobre" style="padding:4px 8px; background:#9b59b6; color:white; border:none; border-radius:2px; cursor:pointer; font-size:10px;">👑 Nobre</button>
            </div>
        </div>
        
        <div style="display:flex; gap:4px; margin-bottom:12px; flex-wrap:wrap;">
            <button id="gerar" style="flex:2; padding:8px; background:#27ae60; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600;">📋 Gerar BBCode</button>
            <button id="copiar" style="flex:1; padding:8px; background:#2980b9; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">📄 Copiar</button>
            <button id="salvar" style="padding:8px 12px; background:#8e44ad; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">💾 Salvar</button>
        </div>
        
        <div>
            <label style="font-weight:600; color:#2c3e50;">📊 Resultado:</label>
            <textarea id="saida" style="width:100%; height:150px; padding:6px; margin-top:4px; font-family:monospace; font-size:10px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; resize:vertical;"></textarea>
        </div>
    `;
    document.body.appendChild(panel);

    // --- Função auxiliar ---
    function getTropas() {
        return {
            spear: parseInt(document.getElementById('spear').value) || 0,
            sword: parseInt(document.getElementById('sword').value) || 0,
            axe: parseInt(document.getElementById('axe').value) || 0,
            archer: parseInt(document.getElementById('archer').value) || 0,
            spy: parseInt(document.getElementById('spy').value) || 0,
            light: parseInt(document.getElementById('light').value) || 0,
            marcher: parseInt(document.getElementById('marcher').value) || 0,
            heavy: parseInt(document.getElementById('heavy').value) || 0,
            ram: parseInt(document.getElementById('ram').value) || 0,
            catapult: parseInt(document.getElementById('catapult').value) || 0,
            knight: parseInt(document.getElementById('knight').value) || 0,
            snob: parseInt(document.getElementById('snob').value) || 0
        };
    }

    // --- Função para carregar configurações salvas ---
    function carregarConfiguracoes() {
        try {
            const configSalva = localStorage.getItem('twPanelConfig');
            if (configSalva) {
                const config = JSON.parse(configSalva);
                
                if (config.destinos) panel.querySelector('#destinos').value = config.destinos;
                if (config.origens) panel.querySelector('#origens').value = config.origens;
                if (config.tipoCalculo) panel.querySelector('#tipoCalculo').value = config.tipoCalculo;
                if (config.bonusSinal) panel.querySelector('#bonusSinal').value = config.bonusSinal;
                if (config.tipoOrdenacao) panel.querySelector('#tipoOrdenacao').value = config.tipoOrdenacao;
                if (config.horaChegada) panel.querySelector('#horaChegada').value = config.horaChegada;
                if (config.horaLancamento) panel.querySelector('#horaLancamento').value = config.horaLancamento;
                if (config.incrementarSegundos !== undefined) {
                    panel.querySelector('#incrementarSegundos').checked = config.incrementarSegundos;
                }
                
                if (config.tropas) {
                    for (const [unidade, quantidade] of Object.entries(config.tropas)) {
                        const input = document.getElementById(unidade);
                        if (input) input.value = quantidade;
                    }
                }
                
                panel.querySelector('#tipoCalculo').dispatchEvent(new Event('change'));
                console.log('✅ Configurações carregadas!');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configurações:', error);
        }
    }

    // --- Evento para alternar entre os tipos de cálculo ---
    panel.querySelector('#tipoCalculo').onchange = function() {
        const tipo = this.value;
        const campoChegada = panel.querySelector('#campoHoraChegada');
        const campoLancamento = panel.querySelector('#campoHoraLancamento');
        
        if (tipo === 'chegada') {
            campoChegada.style.display = 'block';
            campoLancamento.style.display = 'none';
        } else {
            campoChegada.style.display = 'none';
            campoLancamento.style.display = 'block';
        }
    };

    // --- Função para mostrar mensagens ---
    function mostrarMensagem(mensagem, cor) {
        const alertDiv = document.createElement('div');
        alertDiv.innerHTML = mensagem;
        Object.assign(alertDiv.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: cor,
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            border: `1px solid ${cor}`,
            fontWeight: '600',
            zIndex: 1000000,
            fontSize: '13px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        });
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 1500);
    }

    // --- Gera tabela com VALIDAÇÃO COMPLETA ---
    panel.querySelector('#gerar').onclick = () => {
        try {
            // Pega e valida destinos
            const destinosRaw = panel.querySelector('#destinos').value.trim();
            if (!destinosRaw) {
                mostrarMensagem('❌ Informe pelo menos um destino!', '#e74c3c');
                return;
            }
            const destinos = destinosRaw.split(/\s+/).map(coord => {
                try {
                    return sanitizarCoordenada(coord);
                } catch (e) {
                    return null;
                }
            }).filter(coord => coord !== null);

            const destinosInvalidos = destinosRaw.split(/\s+/).filter(coord => {
                return !validarCoordenada(coord);
            });
            if (destinosInvalidos.length > 0) {
                mostrarMensagem(`❌ Coordenadas inválidas: ${destinosInvalidos.join(', ')}`, '#e74c3c');
                return;
            }
            
            // Pega e valida origens
            const origensRaw = panel.querySelector('#origens').value.trim();
            if (!origensRaw) {
                mostrarMensagem('❌ Informe pelo menos uma origem!', '#e74c3c');
                return;
            }
            const origens = origensRaw.split(/\s+/).map(coord => {
                try {
                    return sanitizarCoordenada(coord);
                } catch (e) {
                    return null;
                }
            }).filter(coord => coord !== null);

            const origensInvalidas = origensRaw.split(/\s+/).filter(coord => {
                return !validarCoordenada(coord);
            });
            if (origensInvalidas.length > 0) {
                mostrarMensagem(`❌ Coordenadas inválidas: ${origensInvalidas.join(', ')}`, '#e74c3c');
                return;
            }
            
            const tipoCalculo = panel.querySelector('#tipoCalculo').value;
            const tipoOrdenacao = panel.querySelector('#tipoOrdenacao').value;
            const bonusSinal = parseInt(panel.querySelector('#bonusSinal').value) || 0;
            const incrementarSegundos = panel.querySelector('#incrementarSegundos').checked;
            const tropas = getTropas();
            
            // Valida se há tropas selecionadas
            const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
            if (!unidadeMaisLenta) {
                mostrarMensagem('❌ Selecione pelo menos uma tropa!', '#e74c3c');
                return;
            }
            
            // Pega e valida hora base
            let horaBase;
            if (tipoCalculo === 'chegada') {
                horaBase = panel.querySelector('#horaChegada').value.trim();
                if (!horaBase) {
                    mostrarMensagem('❌ Informe a hora de chegada!', '#e74c3c');
                    return;
                }
            } else {
                horaBase = panel.querySelector('#horaLancamento').value.trim();
                if (!horaBase) {
                    mostrarMensagem('❌ Informe a hora de lançamento!', '#e74c3c');
                    return;
                }
            }
            
            // Valida formato da data/hora
            if (!validarDataHora(horaBase)) {
                mostrarMensagem('❌ Formato de data inválido! Use: DD/MM/AAAA HH:MM:SS', '#e74c3c');
                return;
            }

            // Array para armazenar todas as combinações
            const combinacoes = [];
            const coordenadasNaoEncontradas = [];
            
            for (const o of origens) {
                const vid = villageMap[o];
                if (!vid) {
                    coordenadasNaoEncontradas.push(o);
                    continue;
                }
                
                for (const d of destinos) {
                    const [x, y] = d.split('|');
                    
                    let horaLancamento, horaChegada;
                    
                    if (tipoCalculo === 'chegada') {
                        horaLancamento = calcularHorarioLancamento(o, d, horaBase, tropas, bonusSinal);
                        horaChegada = horaBase;
                    } else {
                        horaLancamento = horaBase;
                        horaChegada = calcularHorarioChegada(o, d, horaBase, tropas, bonusSinal);
                    }
                    
                    const distancia = calcularDistancia(o, d);
                    
                    combinacoes.push({
                        origem: o,
                        destino: d,
                        horaLancamento: horaLancamento,
                        horaChegada: horaChegada,
                        distancia: distancia,
                        timestampLancamento: parseDataHora(horaLancamento).getTime(),
                        timestampChegada: parseDataHora(horaChegada).getTime(),
                        vid: vid,
                        x: x,
                        y: y
                    });
                }
            }
            
            // Alerta sobre coordenadas não encontradas
            if (coordenadasNaoEncontradas.length > 0) {
                console.warn('⚠️ Coordenadas não encontradas no mapa:', coordenadasNaoEncontradas.join(', '));
                mostrarMensagem(`⚠️ ${coordenadasNaoEncontradas.length} coordenada(s) não encontrada(s)`, '#f39c12');
            }
            
            // Verifica se há combinações válidas
            if (combinacoes.length === 0) {
                mostrarMensagem('❌ Nenhuma combinação válida foi gerada!', '#e74c3c');
                return;
            }
            
            // APLICA ORDENAÇÃO CONFORME SELECIONADO
            switch(tipoOrdenacao) {
                case 'lancamento':
                    combinacoes.sort((a, b) => a.timestampLancamento - b.timestampLancamento);
                    break;
                case 'chegada':
                    combinacoes.sort((a, b) => a.timestampChegada - b.timestampChegada);
                    break;
                case 'distancia':
                    combinacoes.sort((a, b) => a.distancia - b.distancia);
                    break;
                case 'digitacao':
                default:
                    // Mantém a ordem original (digitação)
                    break;
            }
            
            // APLICA INCREMENTO DE SEGUNDOS SE SOLICITADO
            if (incrementarSegundos) {
                let segundoIncremento = 0;
                
                combinacoes.forEach((comb, index) => {
                    if (index > 0) {
                        segundoIncremento += 5; // Incrementa 5 segundo por ataque
                        
                        // Ajusta tanto o horário de lançamento quanto o de chegada
                        const lancamentoDate = parseDataHora(comb.horaLancamento);
                        const chegadaDate = parseDataHora(comb.horaChegada);
                        
                        lancamentoDate.setSeconds(lancamentoDate.getSeconds() + segundoIncremento);
                        chegadaDate.setSeconds(chegadaDate.getSeconds() + segundoIncremento);
                        
                        comb.horaLancamento = formatarDataHora(lancamentoDate);
                        comb.horaChegada = formatarDataHora(chegadaDate);
                        comb.timestampLancamento = lancamentoDate.getTime();
                        comb.timestampChegada = chegadaDate.getTime();
                    }
                });
                
                console.log(`⏱️ Incremento aplicado: ${segundoIncremento} segundo(s) no total`);
            }
            
            let out = `[table][**]Unidade[||]Origem[||]Destino[||]Lançamento[||]Chegada[||]Enviar[/**]\n`;
            
            combinacoes.forEach((comb) => {
                let qs = Object.entries(tropas).map(([k,v])=>`att_${k}=${v}`).join('&');
                const link = `https://${location.host}/game.php?village=${comb.vid}&screen=place&x=${comb.x}&y=${comb.y}&from=simulator&${qs}`;
                
                out += `[*][unit]${unidadeMaisLenta}[/unit] [|] ${comb.origem} [|] ${comb.destino} [|] ${comb.horaLancamento} [|] ${comb.horaChegada} [|] [url=${link}]ENVIAR[/url]\n`;
            });
            
            out += `[/table]`;
            panel.querySelector('#saida').value = out;
            
            mostrarMensagem(`✅ ${combinacoes.length} ataque(s) gerado(s)!${incrementarSegundos ? ' (com incremento de segundos)' : ''}`, '#27ae60');
            
        } catch (error) {
            console.error('❌ Erro ao gerar BBCode:', error);
            mostrarMensagem(`❌ Erro: ${error.message}`, '#e74c3c');
        }
    };

    // --- Botão Copiar BBCode ---
    panel.querySelector('#copiar').onclick = () => {
        const saida = panel.querySelector('#saida');
        if (saida.value.trim() === '') {
            mostrarMensagem('❌ Nenhum BBCode para copiar! Gere o código primeiro.', '#e74c3c');
            return;
        }
        
        saida.select();
        saida.setSelectionRange(0, 99999);
        
        try {
            navigator.clipboard.writeText(saida.value).then(() => {
                mostrarMensagem('✅ BBCode copiado!', '#27ae60');
            }).catch(err => {
                document.execCommand('copy');
                mostrarMensagem('✅ BBCode copiado!', '#27ae60');
            });
        } catch (err) {
            document.execCommand('copy');
            mostrarMensagem('✅ BBCode copiado!', '#27ae60');
        }
    };

    // --- Botão Salvar ---
    panel.querySelector('#salvar').onclick = () => {
        const config = {
            destinos: panel.querySelector('#destinos').value,
            origens: panel.querySelector('#origens').value,
            tipoCalculo: panel.querySelector('#tipoCalculo').value,
            bonusSinal: panel.querySelector('#bonusSinal').value,
            tipoOrdenacao: panel.querySelector('#tipoOrdenacao').value,
            horaChegada: panel.querySelector('#horaChegada').value,
            horaLancamento: panel.querySelector('#horaLancamento').value,
            incrementarSegundos: panel.querySelector('#incrementarSegundos').checked,
            tropas: getTropas()
        };
        
        try {
            localStorage.setItem('twPanelConfig', JSON.stringify(config));
            mostrarMensagem('✅ Configurações salvas!', '#8e44ad');
        } catch (error) {
            mostrarMensagem('❌ Erro ao salvar configurações!', '#e74c3c');
            console.error('Erro ao salvar:', error);
        }
    };

    // --- Botão Fechar ---
    panel.querySelector('#fechar').onclick = () => {
        panel.remove();
        window.__TW_PANEL__ = false;
    };

    // --- Botão Limpar Tropas ---
    panel.querySelector('#limparTropas').onclick = () => {
        const inputs = panel.querySelectorAll('input[type="number"]');
        inputs.forEach(input => input.value = '0');
    };

    // --- Botão Preencher Ataque ---
    panel.querySelector('#preencherAtaque').onclick = () => {
        document.getElementById('spear').value = '0';
        document.getElementById('sword').value = '0';
        document.getElementById('axe').value = '0';
        document.getElementById('archer').value = '0';
        document.getElementById('spy').value = '5';
        document.getElementById('light').value = '3000';
        document.getElementById('marcher').value = '6000';
        document.getElementById('heavy').value = '0';
        document.getElementById('ram').value = '300';
        document.getElementById('catapult').value = '0';
        document.getElementById('knight').value = '0';
        document.getElementById('snob').value = '0';
    };

    // --- Botão Preencher Defesa ---
    panel.querySelector('#preencherDefesa').onclick = () => {
        document.getElementById('spear').value = '1000';
        document.getElementById('sword').value = '1000';
        document.getElementById('axe').value = '0';
        document.getElementById('archer').value = '0';
        document.getElementById('spy').value = '0';
        document.getElementById('light').value = '0';
        document.getElementById('marcher').value = '0';
        document.getElementById('heavy').value = '0';
        document.getElementById('ram').value = '0';
        document.getElementById('catapult').value = '0';
        document.getElementById('knight').value = '0';
        document.getElementById('snob').value = '0';
    };

    // --- Botão Preencher Ataque Nobre ---
    panel.querySelector('#preencherNobre').onclick = () => {
        document.getElementById('spear').value = '0';
        document.getElementById('sword').value = '0';
        document.getElementById('axe').value = '0';
        document.getElementById('archer').value = '0';
        document.getElementById('spy').value = '5';
        document.getElementById('light').value = '25';
        document.getElementById('marcher').value = '0';
        document.getElementById('heavy').value = '0';
        document.getElementById('ram').value = '0';
        document.getElementById('catapult').value = '0';
        document.getElementById('knight').value = '0';
        document.getElementById('snob').value = '1';
    };

    // --- Tornar o painel arrastável ---
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    const titleBar = panel.querySelector('h3');
    
    titleBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - panel.offsetLeft;
        dragOffset.y = e.clientY - panel.offsetTop;
        panel.style.cursor = 'grabbing';
        titleBar.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            panel.style.left = (e.clientX - dragOffset.x) + 'px';
            panel.style.top = (e.clientY - dragOffset.y) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        panel.style.cursor = 'default';
        titleBar.style.userSelect = 'auto';
    });

    // --- Carregar configurações salvas ao iniciar ---
    carregarConfiguracoes();

    // --- Focar no primeiro campo ao abrir ---
    setTimeout(() => {
        panel.querySelector('#destinos').focus();
    }, 100);

    console.log('✅ Coordenador de Ataques TW carregado com sucesso!');
})();
