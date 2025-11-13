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

    // --- Cria painel na tela ---
    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'fixed',
        top: '50px',
        left: '50px',
        width: '450px',
        background: 'rgba(0,0,0,0.95)',
        color: '#fff',
        padding: '15px',
        border: '2px solid #8B4513',
        borderRadius: '8px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        zIndex: 999999,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    });
    
    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #8B4513; padding-bottom:5px;">
            <h3 style="margin:0; color:#FFD700; cursor:move;">TW Auto Builder - Painel Melhorado</h3>
            <button id="fechar" style="background:#8B0000; color:white; border:none; padding:2px 8px; border-radius:3px; cursor:pointer; font-weight:bold;">X</button>
        </div>
        
        <div style="margin-bottom:10px;">
            <label><strong>🎯 Destino(s):</strong></label><br>
            <input id="destinos" style="width:100%; padding:5px; margin-top:3px; background:#1a1a1a; color:white; border:1px solid #555;" placeholder="559|452 560|453"><br>
            <small style="color:#ccc;">Coordenadas separadas por espaço</small>
        </div>
        
        <div style="margin-bottom:10px;">
            <label><strong>🏠 Origem(ns):</strong></label><br>
            <input id="origens" style="width:100%; padding:5px; margin-top:3px; background:#1a1a1a; color:white; border:1px solid #555;" placeholder="542|433 544|432"><br>
            <small style="color:#ccc;">Coordenadas separadas por espaço</small>
        </div>
        
        <div style="margin-bottom:10px;">
            <label><strong>⏰ Hora de Lançamento:</strong></label><br>
            <input id="hora" type="text" style="width:100%; padding:5px; margin-top:3px; background:#1a1a1a; color:white; border:1px solid #555;" placeholder="13/11/2025 18:30:00">
        </div>
        
        <div style="margin-bottom:15px; border:1px solid #555; padding:10px; border-radius:5px; background:rgba(50,50,50,0.3);">
            <label style="display:block; margin-bottom:8px;"><strong>⚔️ Tropas:</strong></label>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.spear}" width="20" height="20" title="Lança" onerror="this.style.display='none'">
                    <label style="width:70px;">Lança:</label>
                    <input type="number" id="spear" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.sword}" width="20" height="20" title="Espada" onerror="this.style.display='none'">
                    <label style="width:70px;">Espada:</label>
                    <input type="number" id="sword" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.axe}" width="20" height="20" title="Machado" onerror="this.style.display='none'">
                    <label style="width:70px;">Machado:</label>
                    <input type="number" id="axe" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.archer}" width="20" height="20" title="Arqueiro" onerror="this.style.display='none'">
                    <label style="width:70px;">Arqueiro:</label>
                    <input type="number" id="archer" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.spy}" width="20" height="20" title="Espião" onerror="this.style.display='none'">
                    <label style="width:70px;">Espião:</label>
                    <input type="number" id="spy" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.light}" width="20" height="20" title="Cavalaria Leve" onerror="this.style.display='none'">
                    <label style="width:70px;">Cavalaria L.:</label>
                    <input type="number" id="light" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.marcher}" width="20" height="20" title="Arqueiro a Cavalo" onerror="this.style.display='none'">
                    <label style="width:70px;">Arqueiro C.:</label>
                    <input type="number" id="marcher" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.heavy}" width="20" height="20" title="Cavalaria Pesada" onerror="this.style.display='none'">
                    <label style="width:70px;">Cavalaria P.:</label>
                    <input type="number" id="heavy" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.ram}" width="20" height="20" title="Ariete" onerror="this.style.display='none'">
                    <label style="width:70px;">Ariete:</label>
                    <input type="number" id="ram" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.catapult}" width="20" height="20" title="Catapulta" onerror="this.style.display='none'">
                    <label style="width:70px;">Catapulta:</label>
                    <input type="number" id="catapult" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.knight}" width="20" height="20" title="Paladino" onerror="this.style.display='none'">
                    <label style="width:70px;">Paladino:</label>
                    <input type="number" id="knight" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <img src="${unitImages.snob}" width="20" height="20" title="Nobre" onerror="this.style.display='none'">
                    <label style="width:70px;">Nobre:</label>
                    <input type="number" id="snob" style="width:60px; padding:3px; background:#1a1a1a; color:white; border:1px solid #555;" value="0" min="0">
                </div>
            </div>
            
            <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap;">
                <button id="limparTropas" style="padding:5px 10px; background:#8B0000; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">🗑️ Limpar</button>
                <button id="preencherAtaque" style="padding:5px 10px; background:#006400; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">⚔️ Ataque</button>
                <button id="preencherDefesa" style="padding:5px 10px; background:#00008B; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">🛡️ Defesa</button>
                <button id="preencherNobre" style="padding:5px 10px; background:#8B4513; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">👑 Ataque Nobre</button>
            </div>
        </div>
        
        <div style="display:flex; gap:5px; margin-bottom:15px; flex-wrap:wrap;">
            <button id="gerar" style="flex:2; padding:10px; background:#006400; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">📋 Gerar BBCode</button>
            <button id="copiar" style="flex:1; padding:10px; background:#8B4513; color:white; border:none; border-radius:4px; cursor:pointer;">📄 Copiar</button>
            <button id="voltar" style="padding:10px 15px; background:#4B0082; color:white; border:none; border-radius:4px; cursor:pointer;">↩️ Voltar</button>
        </div>
        
        <div>
            <label><strong>📊 Resultado:</strong></label><br>
            <textarea id="saida" style="width:100%; height:180px; padding:8px; margin-top:5px; font-family:monospace; font-size:11px; background:#1a1a1a; color:white; border:1px solid #555; resize:vertical;"></textarea>
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
                out += `[*][unit]catapult[/unit] [|] ${o} [|] ${d} [|] ${hora} [|] [url=${link}]ENVIAR[/url]\n`;
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
        saida.setSelectionRange(0, 99999); // Para mobile
        
        try {
            navigator.clipboard.writeText(saida.value).then(() => {
                // Mostrar alerta personalizado
                const alertDiv = document.createElement('div');
                alertDiv.innerHTML = '✅ BBCode copiado para a área de transferência!';
                Object.assign(alertDiv.style, {
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,100,0,0.9)',
                    color: 'white',
                    padding: '15px 25px',
                    borderRadius: '8px',
                    border: '2px solid #00FF00',
                    fontWeight: 'bold',
                    zIndex: 1000000,
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                });
                document.body.appendChild(alertDiv);
                
                setTimeout(() => {
                    alertDiv.remove();
                }, 2000);
            }).catch(err => {
                // Fallback para navegadores mais antigos
                document.execCommand('copy');
                alert('✅ BBCode copiado para a área de transferência! (método alternativo)');
            });
        } catch (err) {
            // Fallback final
            document.execCommand('copy');
            alert('✅ BBCode copiado para a área de transferência!');
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
        document.getElementById('axe').value = '1000';
        document.getElementById('archer').value = '0';
        document.getElementById('spy').value = '5';
        document.getElementById('light').value = '500';
        document.getElementById('marcher').value = '300';
        document.getElementById('heavy').value = '200';
        document.getElementById('ram').value = '0';
        document.getElementById('catapult').value = '0';
        document.getElementById('knight').value = '0';
        document.getElementById('snob').value = '0';
    };

    // --- Botão Preencher Defesa ---
    panel.querySelector('#preencherDefesa').onclick = () => {
        document.getElementById('spear').value = '1000';
        document.getElementById('sword').value = '800';
        document.getElementById('axe').value = '0';
        document.getElementById('archer').value = '600';
        document.getElementById('spy').value = '3';
        document.getElementById('light').value = '0';
        document.getElementById('marcher').value = '400';
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
        document.getElementById('spy').value = '50';
        document.getElementById('light').value = '2000';
        document.getElementById('marcher').value = '1000';
        document.getElementById('heavy').value = '500';
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
