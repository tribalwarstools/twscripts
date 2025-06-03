(function () {
    'use strict';

    if (document.getElementById('tw-test-village-panel')) return;

    const mobile = false;

    // Simula as funções do jogo
    window.selectVillage = function (village_id, group_id, new_tab) {
        UI.SuccessMessage(`Selecionada aldeia ID: ${village_id}, Grupo: ${group_id}, Nova aba: ${new_tab}`);
    };

    window.MDS = {
        selectVillage: function (village_id, group_id) {
            UI.SuccessMessage(`[Mobile] Aldeia ID: ${village_id}, Grupo: ${group_id}`);
        }
    };

    // Cria painel
    const panel = document.createElement('div');
    panel.id = 'tw-test-village-panel';
    panel.style = `
        position: fixed;
        top: 100px;
        left: 50px;
        background: #f0e0b0;
        border: 2px solid #804000;
        padding: 10px;
        border-radius: 8px;
        z-index: 9999;
        font-family: Verdana, sans-serif;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.4);
    `;

    panel.innerHTML = `
        <b>Selecione uma aldeia de teste:</b>
        <ul style="list-style: none; padding: 0; margin: 8px 0;">
            <li><a href="#" class="select-village" data-village-id="123" data-group-id="1">🏰 Aldeia 123 (Grupo 1)</a></li>
            <li><a href="#" class="select-village" data-village-id="456" data-group-id="2">🏰 Aldeia 456 (Grupo 2)</a></li>
            <li><a href="#" class="select-village" data-village-id="789">🏰 Aldeia 789 (Sem grupo)</a></li>
        </ul>
        <button id="close-panel" class="btn btn-cancel">Fechar</button>
    `;

    document.body.appendChild(panel);

    // Eventos de clique
    document.querySelectorAll('.select-village').forEach(el => {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            const village_id = this.dataset.villageId;
            const group_id = this.dataset.groupId ?? 0;

            if (mobile) {
                MDS.selectVillage(village_id, group_id);
            } else {
                const new_tab = (e.which === 2 || e.button === 4 || e.ctrlKey);
                selectVillage(village_id, group_id, new_tab);
            }
        });

        el.addEventListener('auxclick', function (e) {
            e.preventDefault();
            const village_id = this.dataset.villageId;
            const group_id = this.dataset.groupId ?? 0;
            const new_tab = true;
            selectVillage(village_id, group_id, new_tab);
        });
    });

    document.getElementById('close-panel').addEventListener('click', () => panel.remove());
})();
