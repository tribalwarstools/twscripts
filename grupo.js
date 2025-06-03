javascript:
(async function () {
    const LS_PREFIX = 'twGroupVillageList';
    const dialogId = 'tw_group_village_list';
    const chosenGroupId = localStorage.getItem(`${LS_PREFIX}_chosen_group`) || 0;

    const translations = {
        pt_BR: {
            'Village Groups': 'Grupos de Aldeias',
            'Group': 'Grupo',
            'Villages in Group': 'Aldeias no Grupo',
            'Coords': 'Coordenadas',
            'Loading...': 'Carregando...',
        },
        en_DK: {
            'Village Groups': 'Village Groups',
            'Group': 'Group',
            'Villages in Group': 'Villages in Group',
            'Coords': 'Coords',
            'Loading...': 'Loading...',
        }
    };

    const tt = (text) => {
        const lang = game_data.locale in translations ? game_data.locale : 'en_DK';
        return translations[lang][text] || text;
    };

    const fetchVillageGroups = async () => {
        const res = await $.get('/game.php?screen=overview_villages&mode=groups&ajax=load_group_menu');
        return res.result;
    };

    const fetchVillagesInGroup = async (groupId) => {
        const res = await $.post('/game.php?screen=overview_villages&mode=groups&ajax=load_villages_from_group', {
            group_id: groupId
        });

        const doc = new DOMParser().parseFromString(res.html, 'text/html');
        const rows = doc.querySelectorAll('#group_table tbody tr:not(:first-child)');
        return Array.from(rows).map(row => {
            const name = row.querySelector('td:nth-child(1)')?.textContent.trim();
            const coords = row.querySelector('td:nth-child(2)')?.textContent.trim();
            return { name, coords };
        });
    };

    const renderGroupsSelect = (groups, currentId) => {
        let html = `<select id="tw_group_selector" style="padding: 4px; width: 100%;">`;
        for (const group of Object.values(groups)) {
            if (!group.name) continue;
            const selected = group.group_id == currentId ? 'selected' : '';
            html += `<option value="${group.group_id}" ${selected}>${group.name}</option>`;
        }
        html += `</select>`;
        return html;
    };

    const renderVillagesList = (villages) => {
        if (!villages.length) return `<p><i>(${tt('No villages found')})</i></p>`;
        return `
            <table class="vis" width="100%">
                <tr><th>${tt('Village')}</th><th>${tt('Coords')}</th></tr>
                ${villages.map(v => `
                    <tr>
                        <td>${v.name}</td>
                        <td><b>${v.coords}</b></td>
                    </tr>`).join('')}
            </table>
        `;
    };

    const renderUI = (groups, villages, currentGroupId) => {
        const html = `
            <div class="ra-single-village-planner" id="twGroupVillagePanel">
                <h2>${tt('Village Groups')}</h2>
                <div style="margin-bottom: 10px;">
                    <label><b>${tt('Group')}:</b></label>
                    ${renderGroupsSelect(groups, currentGroupId)}
                </div>
                <div>
                    <label><b>${tt('Villages in Group')}:</b></label>
                    <div id="tw_village_list" style="max-height: 300px; overflow-y: auto;">
                        ${renderVillagesList(villages)}
                    </div>
                </div>
            </div>
        `;
        Dialog.show(dialogId, html);
    };

    const init = async (groupId) => {
        const groups = await fetchVillageGroups();
        const villages = await fetchVillagesInGroup(groupId);
        renderUI(groups, villages, groupId);

        setTimeout(() => {
            $('#tw_group_selector').on('change', async function () {
                const newId = this.value;
                localStorage.setItem(`${LS_PREFIX}_chosen_group`, newId);
                const updatedVillages = await fetchVillagesInGroup(newId);
                $('#tw_village_list').html(renderVillagesList(updatedVillages));
            });
        }, 100);
    };

    init(chosenGroupId);
})();
