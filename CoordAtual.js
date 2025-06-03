(function () {
    'use strict';

    const panelId = 'twSDK-panel';
    if (document.getElementById(panelId)) return;

    const village = game_data.village;

    const FIX_KEY = 'twSDK-fix-panel';

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.style = `
        position: fixed;
        top: 120px;
        right: 40px;
        width: 300px;
        background: #f4e4bc;
        border: 2px solid #804000;
        border-radius: 10px;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
        padding: 10px;
        z-index: 9999;
        font-family: Verdana, sans-serif;
        cursor: move;
    `;

    const isFixed = localStorage.getItem(FIX_KEY) === 'true';

    panel.innerHTML = `
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">🏰 ${village.name}</div>
        <div style="margin-bottom: 10px;">
            <b>Coordenadas:</b> <span id="village-coord">${village.coord}</span><br>
            <b>Pontos:</b> ${village.points.toLocaleString()}
        </div>
        <div style="margin-bottom: 10px;">
            <label><input type="checkbox" id="fix-panel"${isFixed ? ' checked' : ''}> Fixar painel</label>
        </div>
        <button id="btn-copy" class="btn btn-confirm" style="margin-right: 5px;">Copiar Coordenada</button>
        <button id="btn-close" class="btn btn-cancel">Fechar</button>
    `;

    document.body.appendChild(panel);

    // Copiar coordenada
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

    // Atualiza o localStorage ao marcar/desmarcar "Fixar painel"
    document.getElementById('fix-panel').addEventListener('change', (e) => {
        localStorage.setItem(FIX_KEY, e.target.checked ? 'true' : 'false');
    });

    // Botão fechar
    document.getElementById('btn-close').addEventListener('click', () => {
        if (!document.getElementById('fix-panel').checked) {
            panel.remove();
            localStorage.removeItem(FIX_KEY);
        } else {
            UI.InfoMessage('Painel fixado. Desmarque para fechá-lo.');
        }
    });

    // Arrastar painel
    let isDragging = false;
    let offsetX, offsetY;

    panel.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
        isDragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        panel.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
            panel.style.right = 'auto'; // Anula right fixo
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.cursor = 'move';
        }
    });
})();
