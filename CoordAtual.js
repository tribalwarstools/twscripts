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

    panel.innerHTML = `
        <div id="drag-header" style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">🏰 ${village.name}</div>
        <div style="margin-bottom: 10px;">
            <b>Coordenadas:</b> <span id="village-coord">${village.coord}</span><br>
            <b>Pontos:</b> ${village.points.toLocaleString()}
        </div>
        <button id="btn-copy" class="btn btn-confirm" style="margin-right: 5px;">Copiar Coordenada</button>
        <button id="btn-copy-multiple" class="btn btn-confirm" style="margin-right: 5px;">Copiar em Massa</button>
        <button id="btn-close" class="btn btn-cancel">Fechar</button>
    `;

    document.body.appendChild(panel);

    // Botão: Copiar coordenada única
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

    // Botão: Copiar coordenadas em massa
    document.getElementById('btn-copy-multiple').addEventListener('click', () => {
        const coordSet = new Set();
        document.querySelectorAll('td.nowrap:has(a[href*="info_village"])').forEach(cell => {
            const match = cell.innerText.match(/\d{3}\|\d{3}/);
            if (match) coordSet.add(match[0]);
        });

        const coords = Array.from(coordSet).join(' ');
        if (!coords) {
            UI.ErrorMessage('Nenhuma coordenada encontrada na página.');
            return;
        }

        navigator.clipboard.writeText(coords).then(() => {
            UI.SuccessMessage(`${coordSet.size} coordenadas copiadas!`);
        }).catch(() => {
            UI.ErrorMessage('Erro ao copiar coordenadas.');
        });
    });

    // Botão: Fechar painel
    document.getElementById('btn-close').addEventListener('click', () => {
        panel.remove();
    });

    // Função para tornar o painel arrastável
    const header = document.getElementById('drag-header');
    let isDragging = false, offsetX = 0, offsetY = 0;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', function (e) {
        isDragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
        }, { once: true });
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
        panel.style.right = 'auto'; // Remove alinhamento fixo à direita
    }
})();
