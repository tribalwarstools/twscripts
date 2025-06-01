javascript:
(function () {
    const win = window.frames.length > 0 ? window.main : window;
    const data = win.game_data;

    if (data.screen !== 'place') {
        location.search = `?village=${data.village.id}&screen=place`;
        return;
    }

    const availableUnits = [
        'spear', 'sword', 'axe', 'archer', 'spy', 'light',
        'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'
    ];

    const containerId = 'attack-interface-container';
    if (document.getElementById(containerId)) return;

    const form = document.createElement('div');
    form.id = containerId;
    form.style = 'position:fixed;top:100px;left:50%;transform:translateX(-50%);background:#f4e4bc;border:2px solid #603000;padding:15px;z-index:9999;font-family:Verdana;font-size:12px;';
    
    let html = '<h3 style="margin-top:0">Planejador de Ataque</h3>';
    html += '<label>Coordenadas (separadas por espaço):<br><input id="coords" type="text" style="width:100%;margin-bottom:10px;"></label>';

    availableUnits.forEach(unit => {
        if (win.$(`input[name=${unit}]`).length > 0) {
            html += `<label>${unit}: <input id="unit_${unit}" type="number" min="0" value="0" style="width:60px;"></label><br>`;
        }
    });

    html += '<hr><label>Nome do Preset: <input id="presetName" type="text" style="width:60%"></label>';
    html += '<button id="savePreset">Salvar Preset</button>';
    html += '<br><label>Presets Salvos: <select id="loadPreset"><option value="">-- Escolher --</option></select></label>';
    html += '<button id="applyPreset">Carregar</button>';
    html += '<hr>';
    html += '<button id="sendNext" style="margin-top:10px;">Enviar Próximo Ataque</button>';
    html += '<button id="closeInterface" style="margin-left:10px;">Fechar</button>';

    form.innerHTML = html;
    document.body.appendChild(form);

    const presetStorageKey = "tw_attack_presets";
    const coordIndexKey = "tw_coord_index";

    const savePresets = () => {
        const name = document.getElementById('presetName').value.trim();
        if (!name) return alert("Dê um nome ao preset!");
        const coords = document.getElementById('coords').value.trim();
        const troops = {};
        availableUnits.forEach(unit => {
            const input = document.getElementById(`unit_${unit}`);
            if (input) troops[unit] = parseInt(input.value) || 0;
        });
        let presets = JSON.parse(localStorage.getItem(presetStorageKey) || "{}");
        presets[name] = { coords, troops };
        localStorage.setItem(presetStorageKey, JSON.stringify(presets));
        alert("Preset salvo!");
        loadPresetOptions();
    };

    const loadPresetOptions = () => {
        const presets = JSON.parse(localStorage.getItem(presetStorageKey) || "{}");
        const selector = document.getElementById('loadPreset');
        selector.innerHTML = '<option value="">-- Escolher --</option>';
        Object.keys(presets).forEach(name => {
            selector.innerHTML += `<option value="${name}">${name}</option>`;
        });
    };

    const applyPreset = () => {
        const name = document.getElementById('loadPreset').value;
        if (!name) return;
        const presets = JSON.parse(localStorage.getItem(presetStorageKey) || "{}");
        const preset = presets[name];
        if (!preset) return;

        document.getElementById('coords').value = preset.coords;
        availableUnits.forEach(unit => {
            const input = document.getElementById(`unit_${unit}`);
            if (input && preset.troops[unit] !== undefined) {
                input.value = preset.troops[unit];
            }
        });
    };

    const sendNextAttack = () => {
        const coordsText = document.getElementById('coords').value.trim();
        if (!coordsText) return alert("Insira pelo menos uma coordenada!");

        const coordsList = coordsText.split(" ").filter(c => c.match(/^\\d{3}\\|\\d{3}$/));
        if (coordsList.length === 0) return alert("Nenhuma coordenada válida encontrada!");

        let index = parseInt(localStorage.getItem(coordIndexKey) || "0");
        if (index >= coordsList.length) index = 0;

        const [x, y] = coordsList[index].split('|');
        win.$('input[name=x]').val(x);
        win.$('input[name=y]').val(y);

        availableUnits.forEach(unit => {
            const input = document.getElementById(`unit_${unit}`);
            if (input && win.$(`input[name=${unit}]`).length > 0) {
                win.$(`input[name=${unit}]`).val(parseInt(input.value) || 0);
            }
        });

        localStorage.setItem(coordIndexKey, index + 1);
        win.$('input[name=attack]').click();
    };

    loadPresetOptions();

    document.getElementById('savePreset').addEventListener('click', savePresets);
    document.getElementById('applyPreset').addEventListener('click', applyPreset);
    document.getElementById('sendNext').addEventListener('click', sendNextAttack);
    document.getElementById('closeInterface').addEventListener('click', () => {
        document.getElementById(containerId).remove();
    });
})();
