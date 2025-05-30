(function () {
    'use strict';

    const scriptName = 'CopyCoord.js';
    const map = document.getElementById('map');
    const popup = document.getElementById('map_popup');

    if (!map || !popup) {
        UI.ErrorMessage(`[${scriptName}] Mapa ou popup não encontrados.`);
        return;
    }

    // Mostra painel de status
    const statusPanel = document.createElement('div');
    statusPanel.style = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f4e4bc;
        color: #000;
        padding: 10px 14px;
        border: 2px solid #804000;
        border-radius: 10px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
        font-family: Verdana, sans-serif;
    `;
    statusPanel.innerText = `✅ ${scriptName} está ativo`;
    document.body.appendChild(statusPanel);
    setTimeout(() => statusPanel.remove(), 4000); // remove após 4s

    // Função para inserir o botão no popup
    function insertCopyButton(coord) {
        // Evita duplicar botão
        if (document.getElementById('btn-copy-coord')) return;

        const btn = document.createElement('a');
        btn.href = '#';
        btn.id = 'btn-copy-coord';
        btn.className = 'btn';
        btn.innerText = '📋 Copiar Coordenada';
        btn.style.display = 'inline-block';
        btn.style.marginTop = '5px';

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            navigator.clipboard.writeText(coord).then(() => {
                UI.SuccessMessage(`📍 Coordenada ${coord} copiada!`);
            }).catch(() => {
                UI.ErrorMessage('Erro ao copiar coordenada.');
            });
        });

        // Tenta adicionar logo abaixo do conteúdo do popup
        const popupContent = popup.querySelector('.popup_content') || popup;
        popupContent.appendChild(btn);
    }

    // Aguarda clique no mapa
    map.addEventListener('click', () => {
        setTimeout(() => {
            if (popup.style.display !== 'none') {
                const match = popup.innerText.match(/\d{3}\|\d{3}/);
                if (match) {
                    insertCopyButton(match[0]);
                }
            }
        }, 150); // espera o conteúdo do popup carregar
    });
})();
