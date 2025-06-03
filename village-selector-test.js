// ==UserScript==
// @name         Painel de Aldeias por Grupo
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Painel flutuante com lista de aldeias filtradas por grupo no Tribal Wars (com botão copiar coordenada, botão fechar e painel arrastável com altura limitada)
// @author       Você
// @match        https://*.tribalwars.com.br/game.php*screen=overview_villages*
// @grant        none
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

    function makeDraggable(el) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        el.addEventListener('mousedown', function (e) {
            isDragging = true;
            offsetX = e.clientX - el.offsetLeft;
            offsetY = e.clientY - el.offsetTop;
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', stop);
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
            padding: 10px 10px 10px 10px;
            z-index: 10000;
            width: 320px;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
        `;

        const closeBtn = document.createElement('div');
        closeBtn.textContent = '✖';
        closeBtn.style = 'position: absolute; top: 5px; right: 10px; cursor: pointer; color: #800000; font-weight: bold;';
        closeBtn.addEventListener('click', () => panel.remove());
        panel.appendChild(closeBtn);

        const dragBar = document.createElement('div');
        dragBar.style = 'cursor: move; font-weight: bold; margin-bottom: 5px;';
        dragBar.textContent = '🟤 Painel de Aldeias';
        panel.appendChild(dragBar);

        document.body.appendChild(panel);
        makeDraggable(panel);
        return panel;
    }

    async function init() {
        const panel = createPanel();
        panel.innerHTML += '<div id="panel-content"><b>Carregando grupos e aldeias...</b></div>';

        const groups = await fetchVillageGroups();
        let groupSelect = '<select id="village-group-select">';
        groups.forEach(group => {
            groupSelect += `<option value="${group.id}">${group.name}</option>`;
        });
        groupSelect += '</select>';

        document.getElementById('panel-content').innerHTML = `
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
                villages.map(v => `<tr><td>${v.name}</td><td>${v.coords}</td><td><button onclick="navigator.clipboard.writeText('${v.coords}'); UI.SuccessMessage('Copiado: ${v.coords}');">📋</button></td></tr>`).join('') +
                '</table>';
        }

        document.getElementById('village-group-select').addEventListener('change', function () {
            updateVillages(this.value);
        });

        updateVillages(groups[0]?.id ?? 0);
    }

    init();
})();
