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

    // Botão: Copiar coordenada atual
    document.getElementById('btn-copy').addEventListener('click', () => {
        const coord = village.coord;
        navigator.clipboard.writeText(coord).then(() => {
            UI.SuccessMessage(`Coordenada ${coord} copiada!`);
        }).catch(() => {
            UI.ErrorMessage('Erro ao copiar coordenada.');
        });
    });

    // Botão: Copiar todas as coordenadas após abrir menu
    document.getElementById('btn-copy-all').addEventListener('click', () => {
        const toggle = document.getElementById('village_switch_right');
        if (!toggle) return UI.ErrorMessage('Seletor de aldeia não encontrado.');

        toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        toggle.click(); // Abre o menu

        setTimeout(() => {
            const links = document.querySelectorAll('#village_switch_list a');
            if (!links.length) {
                UI.ErrorMessage('A lista de aldeias não carregou. Tente novamente.');
                return;
            }

            const resultado = Array.from(links).map(link => {
                const nome = link.textContent.trim();
                const coordMatch = nome.match(/\d{3}\|\d{3}/);
                const coord = coordMatch ? coordMatch[0] : '';
                const nomeLimpo = nome.replace(/\s*\(\d{3}\|\d{3}\)/, '').trim();
                return `${nomeLimpo} - ${coord}`;
            }).join('\n');

            navigator.clipboard.writeText(resultado).then(() => {
                UI.SuccessMessage('Coordenadas copiadas com sucesso!');
            }).catch(() => {
                UI.ErrorMessage('Erro ao copiar.');
            });
        }, 300); // espera o menu abrir
    });

    // Botão: Fechar painel
    document.getElementById('btn-close').addEventListener('click', () => {
        panel.remove();
    });
})();
