// ==UserScript==
// @name         Painel de Aldeias por Grupo
// @namespace    https://exemplo.com
// @version      1.0
// @description  Exibe painel flutuante com aldeias filtradas por grupo
// @author       ChatGPT
// @match        https://*.tribalwars.com.br/game.php*screen=overview_villages*
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    const styles = `
        #tw-panel {
            position: fixed;
            top: 100px;
            right: 20px;
            width: 400px;
            max-height: 500px;
            overflow-y: auto;
            background: #f4e4bc;
            border: 2px solid #804000;
            padding: 10px;
            z-index: 9999;
            font-size: 12px;
        }
        #tw-panel h3 {
            margin-top: 0;
            font-size: 14px;
        }
        #tw-panel select, #tw-panel table {
            width: 100%;
            margin-bottom: 10px;
        }
        #tw-panel table {
            border-collapse: collapse;
        }
        #tw-panel td, #tw-panel th {
            padding: 4px;
            border: 1px solid #d4c19c;
        }
        #tw-panel-close {
            float: right;
            cursor: pointer;
            color: red;
        }
    `;

    function injectStyles(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    function createPanel(content) {
        const panel = document.createElement('div');
        panel.id = 'tw-panel';
        panel.innerHTML = `
            <h3>Minhas Aldeias <span id="tw-panel-close">[Fechar]</span></h3>
            ${content}
        `;
        document.body.appendChild(panel);

        document.getElementById('tw-panel-close').addEventListener('click', () => {
            panel.remove();
        });
    }

    function renderGroupsFilter(groups) {
        return `
            <label for="tw-group-select">Grupo:</label>
            <select id="tw-group-select">
                ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
            </select>
        `;
    }

    function renderVillagesTable(villages) {
        return `
            <table class="vis">
                <tr><th>Nome</th><th>Coordenadas</th></tr>
                ${villages.map(v => `<tr><td>${v.name}</td><td>${v.coords}</td></tr>`).join('')}
            </table>
        `;
    }

    function prepareContent(villages, groups) {
        const groupsFilter = renderGroupsFilter(groups);
        const villagesTable = renderVillagesTable(villages);
        return groupsFilter + villagesTable;
    }

    async function fetchVillageGroups() {
        const response = await $.get('/game.php?screen=overview_villages&mode=combined');
        const html = $(response);
        const options = html.find('select[name="group"] option');

        return options.map((i, el) => ({
            id: el.value,
            name: el.textContent.trim()
        })).get();
    }

    async function fetchAllPlayerVillagesByGroup(groupId) {
        const response = await $.get(`/game.php?screen=overview_villages&mode=combined&group=${groupId}`);
        const html = $(response);

        const rows = html.find('table.vis.overview_table tr:has(a[href*="screen=overview"])');
        return rows.map((i, row) => {
            const $row = $(row);
            const link = $row.find('a[href*="screen=overview"]');
            const name = link.text().trim();
            const coordsMatch = name.match(/\((\d+\|\d+)\)/);
            const coords = coordsMatch ? coordsMatch[1] : '??|??';
            return {
                name: name.replace(/\(\d+\|\d+\)/, '').trim(),
                coords
            };
        }).get();
    }

    injectStyles(styles);

    const groups = await fetchVillageGroups();
    const defaultGroupId = groups[0]?.id || 0;
    let villages = await fetchAllPlayerVillagesByGroup(defaultGroupId);
    const content = prepareContent(villages, groups);
    createPanel(content);

    document.addEventListener('change', async function (e) {
        if (e.target.id === 'tw-group-select') {
            const newGroupId = e.target.value;
            const newVillages = await fetchAllPlayerVillagesByGroup(newGroupId);
            const tableHTML = renderVillagesTable(newVillages);
            document.querySelector('#tw-panel table').outerHTML = tableHTML;
        }
    });
})();
