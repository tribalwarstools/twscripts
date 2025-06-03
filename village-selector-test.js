(async function () {
    if (document.getElementById('painel-grupos')) return;

    const panel = document.createElement('div');
    panel.id = 'painel-grupos';
    panel.style = `
        position: fixed;
        top: 120px;
        right: 40px;
        width: 300px;
        background: #fff8dc;
        border: 2px solid #a0522d;
        border-radius: 10px;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
        padding: 10px;
        z-index: 9999;
        font-family: Verdana, sans-serif;
    `;
    panel.innerHTML = `
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">📂 Grupos de Aldeias</div>
        <select id="grupo-select" style="width: 100%; margin-bottom: 10px;"></select>
        <div id="aldeias-list" style="max-height: 200px; overflow-y: auto;"></div>
    `;
    document.body.appendChild(panel);

    // Obter grupos
    async function fetchVillageGroups() {
        const res = await $.get('/game.php?screen=overview_villages&mode=groups');
        const options = Array.from($(res).find('select[name="group_id"] option')).map(opt => ({
            id: opt.value,
            name: opt.innerText
        }));
        return options;
    }

    // Obter aldeias do grupo
    async function fetchAllPlayerVillagesByGroup(groupId) {
        const res = await $.get(`/game.php?screen=overview_villages&mode=combined&group=${groupId}`);
        return Array.from($(res).find('.quickedit-vn')).map(span => {
            const labelEl = $(span).find('.quickedit-label')[0];
const fullText = labelEl?.textContent.trim() ?? '';
const name = $(labelEl).data('text') ?? fullText;
const coordMatch = fullText.match(/\((\d+\|\d+)\)/);

            const coordMatch = name.match(/\((\d+\|\d+)\)/);
            return {
                name: name.trim(),
                coords: coordMatch ? coordMatch[1] : '??|??'
            };
        });
    }

    // Preencher grupos
    const grupoSelect = document.getElementById('grupo-select');
    const grupos = await fetchVillageGroups();
    grupos.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.name;
        grupoSelect.appendChild(option);
    });

    async function atualizarAldeias(groupId) {
        const lista = document.getElementById('aldeias-list');
        lista.innerHTML = '<i>Carregando...</i>';
        const aldeias = await fetchAllPlayerVillagesByGroup(groupId);
        if (aldeias.length === 0) {
            lista.innerHTML = '<i>Nenhuma aldeia encontrada nesse grupo.</i>';
            return;
        }
        lista.innerHTML = '';
        aldeias.forEach(v => {
            const div = document.createElement('div');
            div.style.marginBottom = '4px';
            div.innerHTML = `🏰 <b>${v.name}</b> <small>[${v.coords}]</small>`;
            lista.appendChild(div);
        });
    }

    grupoSelect.addEventListener('change', () => {
        atualizarAldeias(grupoSelect.value);
    });

    atualizarAldeias(grupoSelect.value);
})();
