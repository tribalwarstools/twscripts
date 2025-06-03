javascript:
(async function () {
    const scriptName = 'Grupos e Aldeias';
    const dialogId = 'tw_group_village_list';

    function tt(msg) {
        return {
            'Loading groups...': 'Carregando grupos...',
            'Loading villages...': 'Carregando aldeias...',
            'Group': 'Grupo',
            'Villages in group': 'Aldeias no grupo',
        }[msg] || msg;
    }

    function createDialog() {
        const html = `
            <div>
                <label for="groupSelector"><b>${tt('Group')}:</b></label>
                <select id="groupSelector" style="min-width:200px;">
                    <option value="" disabled selected>${tt('Loading groups...')}</option>
                </select>
                <hr>
                <b>${tt('Villages in group')}:</b>
                <ul id="villageList" style="list-style: none; padding-left: 0; margin-top: 5px;"></ul>
            </div>
        `;
        Dialog.show(dialogId, html);
    }

    async function fetchVillageGroups() {
        const response = await $.get('/game.php?screen=overview_villages&ajax=load_group_menu');
        return response.result;
    }

    async function fetchVillagesInGroup(groupId) {
        const response = await $.post('/game.php?screen=overview_villages&mode=groups&ajax=load_villages_from_group', {
            group_id: groupId,
        });
        const doc = new DOMParser().parseFromString(response.html, 'text/html');
        const rows = doc.querySelectorAll('#group_table tbody tr:not(:first-child)');

        return Array.from(rows).map(row => {
            const name = row.querySelector('td:nth-child(1)')?.textContent.trim();
            const coords = row.querySelector('td:nth-child(2)')?.textContent.trim();
            return { name, coords };
        });
    }

    async function populateGroups() {
        const groups = await fetchVillageGroups();
        const select = document.getElementById('groupSelector');
        select.innerHTML = '';

        Object.values(groups).forEach(group => {
            const option = document.createElement('option');
            option.value = group.group_id;
            option.textContent = group.name;
            select.appendChild(option);
        });

        select.addEventListener('change', async function () {
            const groupId = this.value;
            const list = document.getElementById('villageList');
            list.innerHTML = `<li>${tt('Loading villages...')}</li>`;
            const villages = await fetchVillagesInGroup(groupId);
            list.innerHTML = '';
            villages.forEach(v => {
                const li = document.createElement('li');
                li.textContent = `${v.name} (${v.coords})`;
                list.appendChild(li);
            });
        });
    }

    createDialog();
    await populateGroups();
})();
