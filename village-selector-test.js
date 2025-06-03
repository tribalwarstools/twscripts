// ==UserScript==
// @name         Painel de Aldeias por Grupo
// @namespace    
// @version      
// @description  
// @author       
// @match        
// @grant        
// ==/UserScript==

(function () {
    'use strict';

    async function fetchVillageGroups() {
        const res = await fetch('/game.php?screen=overview_villages&mode=combined');
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const groupMenu = doc.querySelector('.vis_item');
        const groupLinks = groupMenu?.querySelectorAll('a[href*="group="]');
        const groups = [];

        if (groupLinks) {
            groupLinks.forEach(link => {
                const href = link.getAttribute('href');
                const idMatch = href.match(/group=(\d+)/);
                if (idMatch) {
                    groups.push({
                        id: idMatch[1],
                        name: link.textContent.trim().replace(/^\s*\[|\]\s*$/g, '')
                    });
                }
            });
        }

        return groups.length > 0 ? groups : [{ id: 0, name: 'Todas as aldeias' }];
    }

    async function fetchAllPlayerVillagesByGroup(groupId) {
        const url = `/game.php?screen=overview_villages&mode=combined&group=${groupId}`;
        const res = await fetch(url);
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const rows = doc.querySelectorAll('#combined_table tr');
        const villages = [];
        rows.forEach((row, index) => {
            if (index === 0) return; // pular cabeçalho

            const link = row.querySelector('td:nth-child(2) a');
            if (link) {
                const name = link.textContent.trim();
                const coordsMatch = link.innerHTML.match(/\((\d+\|\d+)\)/);
                const coords = coordsMatch ? coordsMatch[1] : '??|??';
                villages.push({ name, coords });
            }
        });
        return villages;
    }

    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'village-group-panel';
        panel.style = `
            position: fixed;
            top: 80px;
            right: 30px;
            background: #f4e4bc;
            border: 2px solid #804000;
            padding: 10px;
            z-index: 10000;
            max-height: 80vh;
            overflow-y: auto;
            width: 300px;
            font-size: 12px;
        `;
        document.body.appendChild(panel);
        return panel;
    }

    async function init() {
        const panel = createPanel();
        panel.innerHTML = '<b>Carregando grupos e aldeias...</b>';

        const groups = await fetchVillageGroups();
        let groupSelect = '<select id="village-group-select">';
        groups.forEach(group => {
            groupSelect += `<option value="${group.id}">${group.name}</option>`;
        });
        groupSelect += '</select>';

        panel.innerHTML = `
            <div>
                <label><b>Grupo:</b></label><br>${groupSelect}
                <div id="village-list" style="margin-top: 10px;"></div>
            </div>
        `;

        async function updateVillages(groupId) {
            const villages = await fetchAllPlayerVillagesByGroup(groupId);
            const listDiv = document.getElementById('village-list');
            if (villages.length === 0) {
                listDiv.innerHTML = '<i>Nenhuma aldeia encontrada</i>';
                return;
            }
            listDiv.innerHTML = '<table class="vis" width="100%">' +
                '<tr><th>Aldeia</th><th>Coord.</th></tr>' +
                villages.map(v => `<tr><td>${v.name}</td><td>${v.coords}</td></tr>`).join('') +
                '</table>';
        }

        document.getElementById('village-group-select').addEventListener('change', function () {
            updateVillages(this.value);
        });

        updateVillages(groups[0]?.id ?? 0);
    }

    init();
})();
