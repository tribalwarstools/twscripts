// ==UserScript==
// @name         Painel de Aldeias por Grupo
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Painel flutuante com lista de aldeias filtradas por grupo no Tribal Wars (correção: inclui grupo atual no select e inicia em "Todas as aldeias")
// @author       Você
// @match        https://*.tribalwars.com.br/game.php*screen=overview_villages*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('village-group-panel')) return;

    async function fetchVillageGroups() {
        const res = await fetch('/game.php?screen=overview_villages&mode=combined');
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const groupMenu = doc.querySelector('.vis_item');

        const groups = [];
        const ids = new Set();

        // Adicionar grupo ativo, mesmo sem link
        const activeSpan = groupMenu?.querySelector('span.menu-highlight');
        if (activeSpan) {
            const name = activeSpan.textContent.trim().replace(/^\s*\[|\]\s*$/g, '') || 'Todas as aldeias';
            const id = game_data.group || '0';
            groups.push({ id, name });
            ids.add(id);
        }

        // Adicionar outros grupos clicáveis
        const groupLinks = groupMenu?.querySelectorAll('a[href*="group="]');
        groupLinks?.forEach(link => {
            const href = link.getAttribute('href');
            const idMatch = href.match(/group=(\d+)/);
            if (idMatch) {
                const id = idMatch[1];
                if (!ids.has(id)) {
                    groups.push({
                        id,
                        name: link.textContent.trim().replace(/^\s*\[|\]\s*$/g, '')
                    });
                    ids.add(id);
                }
            }
        });

        return groups.length > 0 ? groups : [{ id: '0', name: 'Todas as aldeias' }];
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
            if (index === 0) return;
            const link = row.querySelector('td:nth-child(2) a');
            if (link) {
                const fullText = link.textContent.trim();
                const coordsMatch = fullText.match(/\((\d+\|\d+)\)/);
                const coords = coordsMatch ? coordsMatch[1] : '??|??';
                const name = fullText.replace(/\s*\(\d+\|\d+\)\s*K\d+/, '').trim();
                const href = link.getAttribute('href');
                villages.push({ name, coords, url: href });
            }
        });
        return villages;
    }

    function makeDraggable(el) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        el.addEventListener('mousedown', function (e) {
            if (e.target.classList.contains('drag-handle')) {
                isDragging = true;
                offsetX = e.clientX - el.offsetLeft;
                offsetY = e.clientY - el.offsetTop;
                document.addEventListener('mousemove', move);
                document.addEventListener('mouseup', stop);
            }
        });

        function move(e) {
            if (!isDragging) return;
            el.style.left = `${e.clientX - offsetX}px`;
            el.style.top = `${e.clientY - offsetY}px`;
            el.style.right = 'auto';
        }

        function stop() {
            isDragging = false;
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', stop);
        }
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
            z-index: 10000;
            width: 320px;
            font-size: 12px;
        `;

        const header = document.createElement('div');
        header.style = 'background: #dec196; padding: 5px; cursor: move; font-weight: bold; display: flex; justify-content: space-between; align-items: center;';
        header.classList.add('drag-handle');
        header.innerHTML = '<span>🟤 Painel de Aldeias 2.3</span>';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✖';
        closeBtn.style = 'cursor: pointer; color: #800000; font-weight: bold;';
        closeBtn.addEventListener('click', () => panel.remove());
        header.appendChild(closeBtn);

        const content = document.createElement('div');
        content.id = 'panel-content';
        content.style = 'padding: 10px; max-height: 400px; overflow-y: auto;';
        content.innerHTML = '<b>Carregando grupos e aldeias...</b>';

        panel.appendChild(header);
        panel.appendChild(content);
        document.body.appendChild(panel);
        makeDraggable(panel);
        return content;
    }

    async function init() {
        const content = createPanel();

        const groups = await fetchVillageGroups();
        let groupSelect = '<select id="village-group-select">';
const preferredGroupId = '0';
groups.forEach(group => {
    groupSelect += `<option value="${group.id}"${group.id === preferredGroupId ? ' selected' : ''}>${group.name}</option>`;
});
groupSelect += '</select>';

        content.innerHTML = `
            <div>
                <label><b>Grupo:</b></label><br>${groupSelect}
                <div id="village-list" style="margin-top: 10px; max-height: 300px; overflow-y: auto;"></div>
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
                '<tr><th>Aldeia</th><th>Coord.</th><th></th></tr>' +
                villages.map(v => `<tr><td><a href="${v.url}" target="_self">${v.name}</a></td><td>${v.coords}</td><td><button onclick="navigator.clipboard.writeText('${v.coords}'); UI.SuccessMessage('Copiado: ${v.coords}');">📋</button></td></tr>`).join('') +
                '</table>';
        }

        document.getElementById('village-group-select').addEventListener('change', function () {
            updateVillages(this.value);
        });

        document.getElementById('village-group-select').value = '0';
        updateVillages('0');
    }

    init();
})();
