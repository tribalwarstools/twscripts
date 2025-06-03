(async function () {
    if (document.getElementById('tw-village-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'tw-village-panel';
    panel.style = `
        position: fixed;
        top: 100px;
        right: 40px;
        width: 350px;
        max-height: 500px;
        overflow-y: auto;
        background: #fffbea;
        border: 2px solid #a5884a;
        border-radius: 8px;
        padding: 10px;
        z-index: 9999;
        font-family: Verdana, sans-serif;
        font-size: 13px;
    `;

    panel.innerHTML = `<b>Grupos:</b> <select id="groupSelect"></select>
        <div id="villagesList" style="margin-top: 10px;"></div>`;

    document.body.appendChild(panel);

    // Fetch groups
    async function fetchVillageGroups() {
        const res = await fetch(`/game.php?village=${game_data.village.id}&screen=overview_villages&ajax=load_group_menu`);
        const html = await res.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const options = Array.from(tempDiv.querySelectorAll('option'));
        return options.map(opt => ({ id: opt.value, name: opt.textContent }));
    }

    // Fetch villages by group
    async function fetchAllPlayerVillagesByGroup(groupId) {
        const res = await fetch(`/game.php?village=${game_data.village.id}&screen=overview_villages&mode=combined&group=${groupId}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const rows = Array.from(doc.querySelectorAll('table.vis.overview_table tr'));
        return rows
            .slice(1)
            .map(row => {
                const label = row.querySelector('.quickedit-label');
                if (!label) return null;
                const full = label.textContent.trim();
                const coordMatch = full.match(/\((\d+\|\d+)\)/);
                if (!coordMatch) return null;
                return {
                    name: full.replace(/\(\d+\|\d+\)\s*K\d+/, '').trim(),
                    coord: coordMatch[1],
                };
            })
            .filter(Boolean);
    }

    // Render village list
    async function renderVillages(groupId) {
        const listEl = document.getElementById('villagesList');
        listEl.innerHTML = 'Carregando...';
        try {
            const villages = await fetchAllPlayerVillagesByGroup(groupId);
            if (villages.length === 0) {
                listEl.innerHTML = '<i>Nenhuma aldeia encontrada.</i>';
                return;
            }

            listEl.innerHTML = villages.map(v => `
                <div style="margin: 3px 0;">
                    🏰 <b>${v.name}</b> <span style="color: #888">(${v.coord})</span>
                    <button style="float:right;" onclick="navigator.clipboard.writeText('${v.coord}'); UI.SuccessMessage('Copiado: ${v.coord}');">📋</button>
                </div>
            `).join('');
        } catch (e) {
            listEl.innerHTML = '<span style="color:red;">Erro ao carregar as aldeias.</span>';
            console.error(e);
        }
    }

    // Inicializa painel
    const groups = await fetchVillageGroups();
    const select = document.getElementById('groupSelect');
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        select.appendChild(opt);
    });

    select.addEventListener('change', () => {
        renderVillages(select.value);
    });

    renderVillages(select.value);
})();
