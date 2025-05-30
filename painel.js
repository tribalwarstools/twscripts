(function () {
    'use strict';

    const btnId = 'btn-copy-map-coord';
    let currentCoord = null;

    // Remove botão antigo, se existir
    const oldBtn = document.getElementById(btnId);
    if (oldBtn) oldBtn.remove();

    // Cria botão flutuante escondido
    const btn = document.createElement('button');
    btn.id = btnId;
    btn.textContent = 'Copiar Coordenada';
    btn.style = `
        position: fixed;
        top: 100px;
        right: 40px;
        padding: 8px 12px;
        background: #f4e4bc;
        border: 2px solid #804000;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        z-index: 9999;
        display: none;
    `;
    document.body.appendChild(btn);

    // Função para atualizar botão
    function updateButton() {
        const popup = document.getElementById('map_popup');
        if (!popup || popup.style.display === 'none') {
            btn.style.display = 'none';
            currentCoord = null;
            return;
        }

        const match = popup.innerText.match(/\d{3}\|\d{3}/);
        if (!match) {
            btn.style.display = 'none';
            currentCoord = null;
            return;
        }

        currentCoord = match[0];
        btn.style.display = 'block';
    }

    // Atualiza o botão sempre que o mouse se move na página (podemos filtrar para mapa)
    document.addEventListener('mousemove', () => {
        updateButton();
    });

    // Copiar coordenada ao clicar no botão
    btn.addEventListener('click', () => {
        if (!currentCoord) return;

        navigator.clipboard.writeText(currentCoord).then(() => {
            UI.SuccessMessage(`Coordenada ${currentCoord} copiada!`);
        }).catch(() => {
            UI.ErrorMessage('Erro ao copiar coordenada.');
        });
    });
})();
