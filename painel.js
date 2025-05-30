(function () {
    'use strict';

    const map = document.getElementById('map');
    const popup = document.getElementById('map_popup');

    if (!map || !popup) {
        UI.ErrorMessage('❌ Mapa ou popup não encontrados.');
        return;
    }

    function getCoordFromPopup() {
        const match = popup.innerText.match(/\d{3}\|\d{3}/);
        return match ? match[0] : null;
    }

    function insertCopyButton(coord) {
        // Evita inserir botão duplicado
        if (popup.querySelector('#btn-copy-coord')) return;

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

        // Tenta encontrar local apropriado dentro do popup
        const buttonContainer = popup.querySelector('.popup_menu') || popup;

        buttonContainer.appendChild(btn);
    }

    map.addEventListener('click', () => {
        setTimeout(() => {
            if (popup.style.display !== 'none') {
                const coord = getCoordFromPopup();
                if (coord) insertCopyButton(coord);
            }
        }, 100); // pequeno delay para garantir o preenchimento do popup
    });
})();
