javascript:
(async function () {
    const LS_PREFIX = 'twGroupVillageList';
    const GROUP_ID = localStorage.getItem(`${LS_PREFIX}_chosen_group`) || 0;

    const translations = {
        pt_BR: {
            'Village Groups': 'Grupos de Aldeias',
            'Group': 'Grupo',
            'Village': 'Aldeia',
            'Coords': 'Coordenadas',
            'Villages list could not be fetched!': 'Não foi possível carregar a lista de aldeias!',
        },
    };
    const tt = (txt) => translations[game_data.locale]?.[txt] || txt;

    // Fetch village groups
    async function fetchVillageGroups() {
        const res = await $.get('/game.php?screen=overview_villages&mode=groups&ajax=load_group_menu');
        return res.result;
    }

    // Fetch villages from selected group
    async function fetchVillages(groupId) {
        const res = await $.post('/game.php?screen=overview_villages&mode=groups&ajax=load_villages_from_group', {
            group_id: groupId,
        });
        const doc = new DOMParser().parseFromString(res.html, 'text/html');
        const rows = doc.querySelectorAll('#group_table tbody tr:not(:first-child)');
        return Array.from(rows).map(row => {
            const name = row.querySelector('td:nth-child(1)')?.textContent.trim();
            const coords = row.querySelector('td:nth-child(2)')?.textContent.trim();
            return { name, coords };
        });
    }

    // Render groups dropdown
    function renderGroupsFilter(groups, selectedId) {
        let html = `<select id="twGroupSelect">`;
        for (const group of Object.values(groups)) {
            if (!group.name) continue;
            const selected = group.group_id == selectedId ? 'selected' : '';
            html += `<option value="${group.group_id}" ${selected}>${group.name}</option>`;
        }
        html += `</select>`;
        return html;
    }

    // Render village table
    function renderVillageTable(villages) {
        if (!villages.length) {
            return `<p>${tt('Villages list could not be fetched!')}</p>`;
        }

        return `
        <table class="vis" style="width:100%;">
            <thead>
                <tr>
                    <th>${tt('Village')}</th>
                    <th>${tt('Coords')}</th>
                </tr>
            </thead>
            <tbody>
                ${villages.map(v => `
                    <tr>
                        <td>${v.name}</td>
                        <td>${v.coords}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    }

    // UI
    function renderUI(groups, villages, selectedId) {
        const html = `
            <div class="ra-single-village-planner" id="twGroupVillageList">
                <h2>${tt('Village Groups')}</h2>
                <div style="margin-bottom: 10px;">
                    <label><b>${tt('Group')}:</b></label>
                    ${renderGroupsFilter(groups, selectedId)}
                </div>
                <div id="twVillageListWrapper">
                    ${renderVillageTable(villages)}
                </div>
            </div>
            <style>
                .ra-single-village-planner {
                    padding: 10px;
                    background: #f4e4bc;
                    border: 1px solid #603000;
                }
                .ra-single-village-planner table {
                    background: white;
                }
                .ra-single-village-planner select {
                    width: 100%;
                    padding: 4px;
                }
            </style>
        `;
        Dialog.show('tw_group_villages', html);
    }

    // Init
    const groups = await fetchVillageGroups();
    const villages = await fetchVillages(GROUP_ID);
    renderUI(groups, villages, GROUP_ID);

    setTimeout(() => {
        $('#twGroupSelect').on('change', async function () {
            const newId = this.value;
            localStorage.setItem(`${LS_PREFIX}_chosen_group`, newId);
            const newVillages = await fetchVillages(newId);
            $('#twVillageListWrapper').html(renderVillageTable(newVillages));
        });
    }, 100);
})();
