// ==UserScript==
// @name         Painel de Aldeias por Grupo (Completo)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Exibe todos os grupos (manuais e dinâmicos) e suas aldeias num painel flutuante no Tribal Wars
// @author       Você
// @match        https://*.tribalwars.com.br/game.php*screen=overview_villages*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('village-group-panel')) return;

    async function fetchAllGroups() {
        const groups = [{ id: '0', name: 'Todas as aldeias' }];
        try {
            const res = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
            res.result.forEach(group => {
                groups.push({ id: group.group_id.toString(), name: group.name });
            });
        } catch (e) {
            UI.ErrorMessage("Erro ao carregar os grupos");
            console.error("Erro ao buscar grupos:", e);
        }
        return groups;
    }

    async function fetchVillagesByGroup(groupId) {
        if (groupId === '0') {
            const url = `/game.php?screen=overview_villages&mode=combined&group=0`;
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
                    villages.push({ name, coords });
                }
            });
            return villages;
        } else {
            try {
                const res = await $.post('/game.php?screen=groups&ajax=load_villages_from_group', {
                    group_id: groupId
                });
                return res.villages.map(v => ({
                    name: v.name,
                    coords: v.coord
                }));
            } catch (e) {
                UI.ErrorMessage("Erro ao carregar aldeias do grupo");
                console.error("Erro ao buscar aldeias:", e);
                return [];
            }
        }
    }

    function makeDraggable(el) {
        let isDragging = false, offsetX = 0, offsetY = 0;
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
        header.innerHTML = '<span>🟤 Painel de Aldeias 3.0</span>';

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
        const groups = await fetchAllGroups();

        const groupSelect = document.createElement('select');
        groupSelect.id = 'village-group-select';
        groups.forEach(group => {
            const opt = document.createElement('option');
            opt.value = group.id;
            opt.textContent = group.name;
            groupSelect.appendChild(opt);
        });

        const groupContainer = document.createElement('div');
        const label = document.createElement('label');
        label.innerHTML = '<b>Grupo:</b><br>';
        groupContainer.appendChild(label);
        groupContainer.appendChild(groupSelect);

        const villageList = document.createElement('div');
        villageList.id = 'village-list';
        villageList.style = 'margin-top: 10px; max-height: 300px; overflow-y: auto;';

        content.innerHTML = '';
        content.appendChild(groupContainer);
        content.appendChild(villageList);

        async function updateVillages(groupId) {
            villageList.innerHTML = '<i>Carregando...</i>';
            const villages = await fetchVillagesByGroup(groupId);
            if (!villages.length) {
                villageList.innerHTML = '<i>Nenhuma aldeia encontrada</i>';
                return;
            }
            villageList.innerHTML = '<table class="vis" width="100%">' +
                '<tr><th>Aldeia</th><th>Coord.</th><th></th></tr>' +
                villages.map(v => `<tr><td>${v.name}</td><td>${v.coords}</td><td><button onclick="navigator.clipboard.writeText('${v.coords}'); UI.SuccessMessage('Copiado: ${v.coords}');">📋</button></td></tr>`).join('') +
                '</table>';
        }

        groupSelect.addEventListener('change', () => updateVillages(groupSelect.value));
        groupSelect.value = '0';
        updateVillages('0');
    }

    init();
})();
