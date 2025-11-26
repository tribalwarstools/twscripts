(async function() {
    if (window.__TW_PANEL__) {
        alert("Painel já aberto!");
        return;
    }
    window.__TW_PANEL__ = true;

    // === CONFIGURAÇÃO DE VELOCIDADES (EDITÁVEL) ===
    let velocidadesUnidades = {
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

    // === FUNÇÕES AUXILIARES ===
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

    function calcularDistancia(coord1, coord2) {
        const [x1, y1] = coord1.split('|').map(Number);
        const [x2, y2] = coord2.split('|').map(Number);
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    function calcularTempoViagem(origem, destino, unidadeMaisLenta, bonusSinal = 0) {
        const distancia = calcularDistancia(origem, destino);
        const velocidadeBase = velocidadesUnidades[unidadeMaisLenta];
        const fatorBonus = 1 + (bonusSinal / 100);
        const tempoMinutos = distancia * velocidadeBase / fatorBonus;
        return tempoMinutos * 60000;
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

    function calcularHorarioLancamento(origem, destino, horaChegada, tropas, bonusSinal = 0) {
        const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
        const tempoViagem = calcularTempoViagem(origem, destino, unidadeMaisLenta, bonusSinal);
        const chegadaDate = parseDataHora(horaChegada);
        const lancamentoDate = new Date(chegadaDate.getTime() - tempoViagem);
        return formatarDataHora(lancamentoDate);
    }

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

// REMOVER a função antiga:
/*
    function getUnidadeMaisLenta(tropas) {
        for (const unidade of unidadesPorVelocidade) {
            if (tropas[unidade] > 0) {
                return unidade;
            }
        }
        return null;
    }
*/

// SUBSTITUIR PELA NOVA FUNÇÃO:
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

    // --- CRIA O PAINEL PRINCIPAL ---
    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'fixed',
        top: '50px',
        left: '50px',
        width: '500px',
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
            <h3 style="margin:0; color:#2c3e50; cursor:move; font-size:14px; font-weight:600;">Coordenador de Ataques 2.2</h3>
            <button id="fechar" style="background:#e74c3c; color:white; border:none; padding:3px 8px; border-radius:3px; cursor:pointer; font-size:10px;">✕</button>
        </div>
        
        <!-- ABA PRINCIPAL -->
        <div id="abaPrincipal">
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
                        ⏱️ Incrementar por ataque
                    </label>
                    <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                        <input type="number" id="valorIncremento" value="5" min="1" max="60" style="width:60px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;">
                        <span style="font-size:10px; color:#7f8c8d;">segundo(s) por ataque</span>
                    </div>
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
                    ${Object.entries(unitImages).map(([unidade, img]) => `
                        <div style="display:flex; align-items:center; gap:4px;">
                            <img src="${img}" width="18" height="18" title="${unidade}" onerror="this.style.display='none'" style="flex-shrink:0;">
                            <label style="width:65px; font-size:11px;">${getNomeUnidade(unidade)}:</label>
                            <input type="number" id="${unidade}" style="width:50px; padding:3px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:2px; font-size:11px;" value="0" min="0">
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
                    <button id="limparTropas" style="padding:4px 8px; background:#95a5a6; color:white; border:none; border-radius:2px; cursor:pointer; font-size:10px;">🗑️ Limpar</button>
                    <button id="preencherAtaque" style="padding:4px 8px; background:#e74c3c; color:white; border:none; border-radius:2px; cursor:pointer; font-size:10px;">⚔️ Ataque</button>
                    <button id="preencherDefesa" style="padding:4px 8px; background:#3498db; color:white; border:none; border-radius:2px; cursor:pointer; font-size:10px;">🛡️ Defesa</button>
                    <button id="preencherNobre" style="padding:4px 8px; background:#9b59b6; color:white; border:none; border-radius:2px; cursor:pointer; font-size:10px;">👑 Nobre</button>
                </div>
            </div>
            
            <!-- BOTÕES PRINCIPAIS COM O BOTÃO DE VELOCIDADES -->
            <div style="display:flex; gap:4px; margin-bottom:12px; flex-wrap:wrap;">
                <button id="gerar" style="flex:2; padding:8px; background:#27ae60; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600;">📋 Gerar BBCode</button>
                <button id="copiar" style="flex:1; padding:8px; background:#2980b9; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">📄 Copiar</button>
                <button id="salvar" style="padding:8px 12px; background:#8e44ad; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">💾 Salvar</button>
                <button id="btnConfigVelocidades" style="padding:8px 12px; background:#f39c12; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">⚙️ Velocidades</button>
            </div>
        </div>

        <!-- ABA CONFIGURAÇÃO DE VELOCIDADES -->
        <div id="abaVelocidades" style="display:none;">
            <div style="margin-bottom:12px;">
                <h4 style="margin:0 0 8px 0; color:#2c3e50;">⚙️ Configuração de Velocidades</h4>
                <small style="color:#7f8c8d;">Ajuste as velocidades conforme o mundo (minutos por campo)</small>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
                ${Object.entries(unitImages).map(([unidade, img]) => `
                    <div style="display:flex; align-items:center; gap:4px;">
                        <img src="${img}" width="16" height="16" title="${unidade}" onerror="this.style.display='none'">
                        <label style="width:80px; font-size:11px;">${getNomeUnidade(unidade)}:</label>
                        <input type="number" id="vel_${unidade}" style="width:60px; padding:4px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;" min="1" max="100">
                    </div>
                `).join('')}
            </div>
            
            <div style="display:flex; gap:4px; margin-bottom:12px; flex-wrap:wrap;">
                <button id="salvarVelocidades" style="padding:8px 12px; background:#27ae60; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">💾 Salvar Velocidades</button>
                <button id="restaurarPadrao" style="padding:8px 12px; background:#95a5a6; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">🔄 Padrão</button>
                <button id="voltarPrincipal" style="padding:8px 12px; background:#2980b9; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">← Voltar</button>
            </div>
        </div>
        
        <div>
            <label style="font-weight:600; color:#2c3e50;">📊 Resultado:</label>
            <textarea id="saida" style="width:100%; height:150px; padding:6px; margin-top:4px; font-family:monospace; font-size:10px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; resize:vertical;"></textarea>
        </div>
    `;
    document.body.appendChild(panel);

    // --- FUNÇÕES AUXILIARES ---
    function getNomeUnidade(unidade) {
        const nomes = {
            spear: 'Lança', sword: 'Espada', axe: 'Machado', archer: 'Arqueiro',
            spy: 'Espião', light: 'Cavalaria L.', marcher: 'Arqueiro C.',
            heavy: 'Cavalaria P.', ram: 'Ariete', catapult: 'Catapulta',
            knight: 'Paladino', snob: 'Nobre'
        };
        return nomes[unidade] || unidade;
    }

    function getTropas() {
        const tropas = {};
        for (const unidade of Object.keys(velocidadesUnidades)) {
            tropas[unidade] = parseInt(document.getElementById(unidade).value) || 0;
        }
        return tropas;
    }

    function carregarConfiguracoes() {
        try {
            const configSalva = localStorage.getItem('twPanelConfig');
            if (configSalva) {
                const config = JSON.parse(configSalva);
                
                // Carrega configurações básicas
                if (config.destinos) document.getElementById('destinos').value = config.destinos;
                if (config.origens) document.getElementById('origens').value = config.origens;
                if (config.tipoCalculo) document.getElementById('tipoCalculo').value = config.tipoCalculo;
                if (config.bonusSinal) document.getElementById('bonusSinal').value = config.bonusSinal;
                if (config.tipoOrdenacao) document.getElementById('tipoOrdenacao').value = config.tipoOrdenacao;
                if (config.horaChegada) document.getElementById('horaChegada').value = config.horaChegada;
                if (config.horaLancamento) document.getElementById('horaLancamento').value = config.horaLancamento;
                if (config.incrementarSegundos !== undefined) {
                    document.getElementById('incrementarSegundos').checked = config.incrementarSegundos;
                }
                if (config.valorIncremento !== undefined) {
                    document.getElementById('valorIncremento').value = config.valorIncremento;
                }
                
                // Carrega tropas
                if (config.tropas) {
                    for (const [unidade, quantidade] of Object.entries(config.tropas)) {
                        const input = document.getElementById(unidade);
                        if (input) input.value = quantidade;
                    }
                }
                
                // Carrega velocidades
                if (config.velocidades) {
                    velocidadesUnidades = { ...velocidadesUnidades, ...config.velocidades };
                }
                
                document.getElementById('tipoCalculo').dispatchEvent(new Event('change'));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configurações:', error);
        }
    }

    function preencherCamposVelocidade() {
        for (const [unidade, velocidade] of Object.entries(velocidadesUnidades)) {
            const input = document.getElementById(`vel_${unidade}`);
            if (input) {
                input.value = velocidade;
            }
        }
    }

    function mostrarAba(aba) {
        document.getElementById('abaPrincipal').style.display = aba === 'principal' ? 'block' : 'none';
        document.getElementById('abaVelocidades').style.display = aba === 'velocidades' ? 'block' : 'none';
    }

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
            fontWeight: '600',
            zIndex: 1000000,
            fontSize: '13px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        });
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 1500);
    }

    // --- EVENT LISTENERS ---
    
    // Alternar entre cálculo por chegada/lançamento
    document.getElementById('tipoCalculo').onchange = function() {
        const isChegada = this.value === 'chegada';
        document.getElementById('campoHoraChegada').style.display = isChegada ? 'block' : 'none';
        document.getElementById('campoHoraLancamento').style.display = isChegada ? 'none' : 'block';
    };

    // Botão Gerar
    document.getElementById('gerar').onclick = () => {
        try {
            // [Código de geração mantido - igual à versão anterior]
            const destinosRaw = document.getElementById('destinos').value.trim();
            const origensRaw = document.getElementById('origens').value.trim();
            const tipoCalculo = document.getElementById('tipoCalculo').value;
            const bonusSinal = parseInt(document.getElementById('bonusSinal').value) || 0;
            const incrementarSegundos = document.getElementById('incrementarSegundos').checked;
            const valorIncremento = parseInt(document.getElementById('valorIncremento').value) || 5;
            const tropas = getTropas();
            
            if (!destinosRaw || !origensRaw) {
                mostrarMensagem('❌ Informe origens e destinos!', '#e74c3c');
                return;
            }

            const destinos = destinosRaw.split(/\s+/).map(sanitizarCoordenada).filter(Boolean);
            const origens = origensRaw.split(/\s+/).map(sanitizarCoordenada).filter(Boolean);
            
            const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
            if (!unidadeMaisLenta) {
                mostrarMensagem('❌ Selecione pelo menos uma tropa!', '#e74c3c');
                return;
            }

            let horaBase = tipoCalculo === 'chegada' 
                ? document.getElementById('horaChegada').value.trim()
                : document.getElementById('horaLancamento').value.trim();
            
            if (!horaBase || !validarDataHora(horaBase)) {
                mostrarMensagem('❌ Informe uma data válida!', '#e74c3c');
                return;
            }

            // Gera combinações
            const combinacoes = [];
            for (const o of origens) {
                const vid = villageMap[o];
                if (!vid) continue;
                
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
                mostrarMensagem('❌ Nenhuma combinação válida!', '#e74c3c');
                return;
            }

            // Ordenação
            const ordenacao = document.getElementById('tipoOrdenacao').value;
            switch(ordenacao) {
                case 'lancamento': combinacoes.sort((a, b) => a.timestampLancamento - b.timestampLancamento); break;
                case 'chegada': combinacoes.sort((a, b) => a.timestampChegada - b.timestampChegada); break;
                case 'distancia': combinacoes.sort((a, b) => a.distancia - b.distancia); break;
            }

            // Incremento de segundos
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

            // Gera BBCode
            let out = `[table][**]Unidade[||]Origem[||]Destino[||]Lançamento[||]Chegada[||]Enviar[/**]\n`;
            combinacoes.forEach((comb) => {
                let qs = Object.entries(tropas).map(([k,v])=>`att_${k}=${v}`).join('&');
                const link = `https://${location.host}/game.php?village=${comb.vid}&screen=place&x=${comb.x}&y=${comb.y}&from=simulator&${qs}`;
                out += `[*][unit]${unidadeMaisLenta}[/unit] [|] ${comb.origem} [|] ${comb.destino} [|] ${comb.horaLancamento} [|] ${comb.horaChegada} [|] [url=${link}]ENVIAR[/url]\n`;
            });
            out += `[/table]`;
            
            document.getElementById('saida').value = out;
            mostrarMensagem(`✅ ${combinacoes.length} ataque(s) gerado(s)!`, '#27ae60');
            
        } catch (error) {
            mostrarMensagem(`❌ Erro: ${error.message}`, '#e74c3c');
        }
    };

    // Botão Copiar
    document.getElementById('copiar').onclick = () => {
        const saida = document.getElementById('saida');
        if (saida.value.trim() === '') {
            mostrarMensagem('❌ Nenhum BBCode para copiar!', '#e74c3c');
            return;
        }
        saida.select();
        try {
            navigator.clipboard.writeText(saida.value);
            mostrarMensagem('✅ BBCode copiado!', '#27ae60');
        } catch (err) {
            document.execCommand('copy');
            mostrarMensagem('✅ BBCode copiado!', '#27ae60');
        }
    };

    // Botão Salvar
    document.getElementById('salvar').onclick = () => {
        const config = {
            destinos: document.getElementById('destinos').value,
            origens: document.getElementById('origens').value,
            tipoCalculo: document.getElementById('tipoCalculo').value,
            bonusSinal: document.getElementById('bonusSinal').value,
            tipoOrdenacao: document.getElementById('tipoOrdenacao').value,
            horaChegada: document.getElementById('horaChegada').value,
            horaLancamento: document.getElementById('horaLancamento').value,
            incrementarSegundos: document.getElementById('incrementarSegundos').checked,
            valorIncremento: document.getElementById('valorIncremento').value,
            tropas: getTropas(),
            velocidades: velocidadesUnidades
        };
        try {
            localStorage.setItem('twPanelConfig', JSON.stringify(config));
            mostrarMensagem('✅ Configurações salvas!', '#8e44ad');
        } catch (error) {
            mostrarMensagem('❌ Erro ao salvar!', '#e74c3c');
        }
    };

    // Botão Fechar
    document.getElementById('fechar').onclick = () => {
        panel.remove();
        window.__TW_PANEL__ = false;
    };

    // Botões de tropas
    document.getElementById('limparTropas').onclick = () => {
        Object.keys(velocidadesUnidades).forEach(unidade => {
            document.getElementById(unidade).value = '0';
        });
    };

    document.getElementById('preencherAtaque').onclick = () => {
        const ataque = {spear: , sword: , axe: , archer: , spy: ,
            light: , marcher: , heavy: , ram: , catapult: ,
            knight: , snob:  };
        Object.keys(velocidadesUnidades).forEach(unidade => {
            document.getElementById(unidade).value = ataque[unidade] || 0;
        });
    };

    document.getElementById('preencherDefesa').onclick = () => {
        const defesa = {spear: , sword: , axe: , archer: , spy: ,
            light: , marcher: , heavy: , ram: , catapult: ,
            knight: , snob:  };
        Object.keys(velocidadesUnidades).forEach(unidade => {
            document.getElementById(unidade).value = defesa[unidade] || 0;
        });
    };

    document.getElementById('preencherNobre').onclick = () => {
        const nobre = {spear: , sword: , axe: , archer: , spy: ,
            light: , marcher: , heavy: , ram: , catapult: ,
            knight: , snob:  };
        Object.keys(velocidadesUnidades).forEach(unidade => {
            document.getElementById(unidade).value = nobre[unidade] || 0;
        });
    };

    // Botões de velocidades
    document.getElementById('btnConfigVelocidades').onclick = () => {
        preencherCamposVelocidade();
        mostrarAba('velocidades');
    };

    document.getElementById('voltarPrincipal').onclick = () => {
        mostrarAba('principal');
    };

    document.getElementById('salvarVelocidades').onclick = () => {
        try {
            for (const unidade of Object.keys(velocidadesUnidades)) {
                const input = document.getElementById(`vel_${unidade}`);
                if (input) {
                    velocidadesUnidades[unidade] = parseInt(input.value) || velocidadesUnidades[unidade];
                }
            }
            const configSalva = localStorage.getItem('twPanelConfig');
            let config = configSalva ? JSON.parse(configSalva) : {};
            config.velocidades = velocidadesUnidades;
            localStorage.setItem('twPanelConfig', JSON.stringify(config));
            mostrarMensagem('✅ Velocidades salvas!', '#27ae60');
        } catch (error) {
            mostrarMensagem('❌ Erro ao salvar velocidades!', '#e74c3c');
        }
    };

    document.getElementById('restaurarPadrao').onclick = () => {
        velocidadesUnidades = {
            spear: 18, sword: 22, axe: 18, archer: 18, spy: 9,
            light: 10, marcher: 10, heavy: 11, ram: 30, catapult: 30,
            knight: 10, snob: 35
        };
        preencherCamposVelocidade();
        mostrarMensagem('✅ Velocidades padrão restauradas!', '#27ae60');
    };

    // --- ARRASTAR O PAINEL ---
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    const titleBar = panel.querySelector('h3');
    
    titleBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - panel.offsetLeft;
        dragOffset.y = e.clientY - panel.offsetTop;
        panel.style.cursor = 'grabbing';
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
    });

    // --- INICIALIZAÇÃO ---
    carregarConfiguracoes();
    setTimeout(() => document.getElementById('destinos').focus(), 100);
    console.log('✅ Coordenador de Ataques TW 2.1 carregado!');
})();
