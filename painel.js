(function () {
    'use strict';

    const mapElement = document.getElementById('map');
    const popup = document.getElementById('map_popup');

    if (!mapElement || !popup) {
        UI.ErrorMessage('Mapa ou popup não encontrados.');
        return;
    }

    // Função para criar ou atualizar o botão
    function addCopyButton(coord) {
        // Verifica se o botão já existe
        if (document.getElementById('btn-copy-coord')) return;

        // Cria o botão
        const btn = document.createElement('a');
        btn.href = '#';
        btn.id = 'btn-copy-coord';
        btn.className = 'btn';
        btn.innerText = 'Copiar Coordenada';
        btn.style.marginTop = '5px';
        btn.style.display = 'inline-block';

        // Ao clicar, copia a coordenada
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (navigator.clipboard) {
                navigator.clipboard.writeText(coord).then(() => {
                    UI.SuccessMessage(`📍 Coordenada ${coord} copiada!`);
                }).catch(() => {
                    UI.ErrorMessage('Erro ao copiar.');
                });
            } else {
                UI.ErrorMessage('Clipboard não suportado.');
            }
        });

        // Adiciona ao popup
        popup.querySelector('.popup_box_content').appendChild(btn);
    }

    // Escuta clique no mapa
    mapElement.addEventListener('click', function () {
        setTimeout(() => {
            if (popup.style.display !== 'none') {
                const match = popup.innerText.match(/\d{3}\|\d{3}/);
                if (match) {
                    const coord = match[0];
                    addCopyButton(coord);
                }
            }
        }, 100); // pequeno delay para garantir que o popup foi preenchido
    });
})();
