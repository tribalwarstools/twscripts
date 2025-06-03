(function () {
    'use strict';

    if (document.getElementById('tw-village-switcher')) return;

    const villages = window.villages || game_data.villages || [];

    if (!villages.length) {
        UI.ErrorMessage("Não foi possível carregar as aldeias.");
        return;
    }

    const panel = document.createElement('div');
    panel.id = 'tw-village-switcher';
    panel.style = `
        position: fixed;
        top: 120px;
        left: 40px;
        width: 320px;
        max-height: 400px;
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <b style="font-size: 16px;">🏰 Minhas Aldeias</b>
            <button id="close-village-switcher" style="background: transparent; border: none; font-size: 16px; cursor: pointer;">✖</button>
        </div>
        <div id="village-list" style="display: flex; flex-direction: column; gap: 5px;"></div>
    `;

    document.body.appendChild(panel);

    const listContainer = panel.querySelector('#village-list');

    villages.forEach(v => {
        const item = document.createElement('button');
        item.className = 'btn btn-confirm';
        item.style = 'text-align: left;';
        item.textContent = `🏰 ${v.name} (${v.coord})`;
        item.addEventListener('click', () => {
            selectVillage(v.id);
            UI.SuccessMessage(`Mudando para: ${v.name} (${v.coord})`);
        });
        listContainer.appendChild(item);
    });

    document.getElementById('close-village-switcher').addEventListener('click', () => {
        panel.remove();
    });
})();
