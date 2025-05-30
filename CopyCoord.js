(function () {
    'use strict';

    const panelId = 'twSDK-panel';
    if (document.getElementById(panelId)) return;

    const village = game_data.village;

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.style = `
        position: fixed;
        top: 120px;
        right: 40px;
        width: 320px;
        background: #f4e4bc;
        border: 2px solid #804000;
        border-radius: 10px;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
        padding: 10px;
        z-index: 9999;
        font-family: Verdana, sans-serif;
    `;

    panel.innerHTML = `
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">🏰 ${village.name}</div>
        <div style="margin-bottom: 10px;">
            <b>Coordenadas:</b> <span id="village-coord">${village.coord}</span><br>
            <b>Pontos:</b> ${village.points.toLocaleString()}
        </div>
        <button id="btn-copy" class="btn btn-confirm" style="margin-right: 5px;">Copiar Coordenada</button>
        <button id="btn-copy-all" class="btn btn-default" style="margin-right: 5px;">Copiar Todas Coordenadas</button>
        <button id="btn-close" class="btn btn-cancel">Fechar</button>
    `;

    document.body.appendChild(panel);

    // Copiar coordenada da aldeia atual
    document.getElementById('btn-copy').addEventListener('click', () => {
        const coord = village.coord;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(coord).then(() => {
                UI.SuccessMessage(`Coordenada ${coord} copiada!`);
            }).catch(() => {
                UI.ErrorMessage('Erro ao copiar coordenada.');
            });
        } else {
            UI.ErrorMessage('Clipboard não suportado.');
        }
    });

    // Copiar todas as coordenadas das aldeias (extraído da lista superior)
    document.getElementById('btn-copy-all').addEventListener('click', () => {
        const entries = Array.from(document.querySelectorAll('#village_switch_list a'));
        if (!entries.length) {
            UI.ErrorMessage('Não foi possível encontrar a lista de aldeias.');
            return;
        }

        const coordsList = entries.map(el => {
            const name = el.textContent.trim();
            const match = name.match(/\d+\|\d+/);
            const coord = match ? match[0] : '';
            const label = name.replace(/\(\d+\|\d+\)/, '').trim();
            return `${label} - ${coord}`;
        }).join('\n');

        navigator.clipboard.writeText(coordsList).then(() => {
            UI.SuccessMessage('Coordenadas de todas as suas aldeias copiadas!');
        }).catch(() => {
            UI.ErrorMessage('Erro ao copiar coordenadas.');
        });
    });

    // Fechar painel
    document.getElementById('btn-close').addEventListener('click', () => {
        panel.remove();
    });
})();
