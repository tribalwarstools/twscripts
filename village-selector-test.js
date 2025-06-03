(function () {
    'use strict';

    if (document.getElementById('tw-village-switcher')) return;

    const rows = document.querySelectorAll('table.village_list tbody tr');
    if (!rows.length) {
        UI.ErrorMessage("Não foi possível encontrar a lista de aldeias.");
        return;
    }

    const villages = [];

    rows.forEach(row => {
        // Normalmente o link da aldeia está no primeiro <td> ou na coluna com nome, com href contendo ?village=ID
        const link = row.querySelector('a[href*="village="]');
        if (!link) return;

        // Extrai id da aldeia do href
        const href = link.getAttribute('href');
        const idMatch = href.match(/village=(\d+)/);
        if (!idMatch) return;
        const id = parseInt(idMatch[1], 10);

        // Nome da aldeia
        const name = link.textContent.trim();

        // Coord pode estar numa coluna ou dentro do nome, tenta pegar do texto
        // No overview, geralmente tem uma coluna com classe 'coordinate'
        let coord = '';
        const coordTd = row.querySelector('td.coordinate');
        if (coordTd) {
            coord = coordTd.textContent.trim();
        }

        villages.push({id, name, coord});
    });

    if (!villages.length) {
        UI.ErrorMessage("Não foi possível extrair as aldeias da tabela.");
        return;
    }

    // Cria painel
    const panel = document.createElement('div');
    panel.id = 'tw-village-switcher';
    panel.style = `
        position: fixed;
        top: 100px;
        left: 40px;
        width: 350px;
        max-height: 450px;
        overflow-y: auto;
        background: #f4e4bc;
        border: 2px solid #804000;
        border-radius: 10px;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
        padding: 10px;
        z-index: 9999;
        font-family: Verdana, sans-serif;
    `;

    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <b style="font-size: 16px;">🏰 Minhas Aldeias</b>
            <button id="close-village-switcher" style="background: transparent; border: none; font-size: 18px; cursor: pointer;">✖</button>
        </div>
        <div id="village-list" style="display: flex; flex-direction: column; gap: 5px;"></div>
    `;

    document.body.appendChild(panel);

    const listContainer = panel.querySelector('#village-list');

    villages.forEach(v => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-confirm';
        btn.style = 'text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        btn.title = `${v.name} (${v.coord})`;
        btn.textContent = `🏰 ${v.name} (${v.coord})`;
        btn.addEventListener('click', () => {
            selectVillage(v.id);
            UI.SuccessMessage(`Mudando para: ${v.name} (${v.coord})`);
        });
        listContainer.appendChild(btn);
    });

    document.getElementById('close-village-switcher').addEventListener('click', () => {
        panel.remove();
    });
})();
