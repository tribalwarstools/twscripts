(async function() {
    if (window.__TW_PANEL__) {
        alert("Painel já aberto!");
        return;
    }
    window.__TW_PANEL__ = true;

    // --- Carrega o village.txt ---
    const res = await fetch('/map/village.txt');
    const text = await res.text();
    const lines = text.trim().split('\n');
    const villageMap = {};
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 6) {
            const x = parts[2], y = parts[3], id = parts[5];
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
    'snob',      // Nobre — 35 min (mais lento)
    'catapult',  // Catapulta — 30 min
    'ram',       // Ariete — 30 min
    'sword',     // Espadachim — 22 min
    'spear',     // Lanceiro — 18 min
    'archer',    // Arqueiro — 18 min (se houver arqueiros)
    'axe',       // Machado — 18 min
    'heavy',     // Cavalaria Pesada — 11 min
    'light',     // Cavalaria Leve — 10 min
    'marcher',   // Arqueiro a Cavalo — 10 min (se houver arqueiros)
    'knight',    // Paladino — 10 min
    'spy'        // Batedor — 9 min (mais rápido)
];


    // --- Função para encontrar a unidade mais lenta presente ---
    function getUnidadeMaisLenta(tropas) {
        for (const unidade of unidadesPorVelocidade) {
            if (tropas[unidade] > 0) {
                return unidade;
            }
        }
        return 'spy'; // fallback
    }

    // --- Cria painel na tela ---
    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'fixed',
        top: '50px',
        left: '50px',
        width: '420px',
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
            <label style="font-weight:600; color:#2c3e50;">⏰ Hora de Lançamento:</label>
            <input id="hora" type="text" style="width:100%; padding:6px; margin-top:4px; background:white; color:#333; border:1px solid #bdc3c7; border-radius:3px; font-size:11px;" placeholder="13/11/2025 18:30:00">
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
            <button id="voltar" style="padding:8px 12px; background:#8e44ad; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">↩️ Voltar</button>
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

    // --- Gera tabela ---
    panel.querySelector('#gerar').onclick = () => {
        const origens = panel.querySelector('#origens').value.trim().split(/\s+/);
        const destinos = panel.querySelector('#destinos').value.trim().split(/\s+/);
        const hora = panel.querySelector('#hora').value.trim();
        const tropas = getTropas();

        let out = `[table][**]Unidade[||]Origem[||]Destino[||]Hora de Lançamento[||]Enviar[/**]\n`;
        for (const o of origens) {
            const vid = villageMap[o];
            for (const d of destinos) {
                const [x,y] = d.split('|');
                let qs = Object.entries(tropas).map(([k,v])=>`att_${k}=${v}`).join('&');
                const link = `https://${location.host}/game.php?village=${vid||0}&screen=place&x=${x}&y=${y}&from=simulator&${qs}`;
                
                // CORREÇÃO: Usa a unidade mais lenta em vez de sempre catapulta
                const unidadeMaisLenta = getUnidadeMaisLenta(tropas);
                out += `[*][unit]${unidadeMaisLenta}[/unit] [|] ${o} [|] ${d} [|] ${hora} [|] [url=${link}]ENVIAR[/url]\n`;
            }
        }
        out += `[/table]`;
        panel.querySelector('#saida').value = out;
    };

    // --- Botão Copiar BBCode ---
    panel.querySelector('#copiar').onclick = () => {
        const saida = panel.querySelector('#saida');
        if (saida.value.trim() === '') {
            alert('❌ Nenhum BBCode para copiar! Gere o código primeiro.');
            return;
        }
        
        saida.select();
        saida.setSelectionRange(0, 99999);
        
        try {
            navigator.clipboard.writeText(saida.value).then(() => {
                const alertDiv = document.createElement('div');
                alertDiv.innerHTML = '✅ BBCode copiado!';
                Object.assign(alertDiv.style, {
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(39, 174, 96, 0.95)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    border: '1px solid #27ae60',
                    fontWeight: '600',
                    zIndex: 1000000,
                    fontSize: '13px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                });
                document.body.appendChild(alertDiv);
                
                setTimeout(() => {
                    alertDiv.remove();
                }, 1500);
            }).catch(err => {
                document.execCommand('copy');
                alert('✅ BBCode copiado!');
            });
        } catch (err) {
            document.execCommand('copy');
            alert('✅ BBCode copiado!');
        }
    };

    // --- Botão Voltar ---
    panel.querySelector('#voltar').onclick = () => {
        panel.style.left = '50px';
        panel.style.top = '50px';
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

    // --- Focar no primeiro campo ao abrir ---
    setTimeout(() => {
        panel.querySelector('#destinos').focus();
    }, 100);
})();
