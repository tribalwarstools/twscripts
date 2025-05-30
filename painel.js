(function () {
    'use strict';

    // Remove botão antigo se existir
    const oldBtn = document.getElementById('btn-copy-map-coord');
    if (oldBtn) oldBtn.remove();

    // Cria botão flutuante escondido
    const btn = document.createElement('button');
    btn.id = 'btn-copy-map-coord';
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

    let currentCoord = null;

    // Quando clicar no mapa, tenta capturar coordenada do tooltip
    document.addEventListener('click', () => {
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
