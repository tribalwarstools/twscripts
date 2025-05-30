(function () {
    'use strict';

    const btnId = 'btn-copy-map-coord';
    let currentCoord = null;

    // Remove botão antigo se existir
    const oldBtn = document.getElementById(btnId);
    if (oldBtn) oldBtn.remove();

    // Cria botão flutuante escondido
    const btn = document.createElement('button');
    btn.id = btnId;
    btn.textContent = 'Copiar Coordenada';
    btn.style = `
        position: fixed;
        padding: 6px 10px;
        background: #f4e4bc;
        border: 2px solid #804000;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        z-index: 9999;
        display: none;
        pointer-events: auto;
        user-select: none;
    `;
    document.body.appendChild(btn);

    // Atualiza a posição do botão perto do mouse
    function moveButton(e) {
        const offsetX = 15; // deslocamento horizontal do cursor
        const offsetY = 15; // deslocamento vertical do cursor
        btn.style.left = (e.clientX + offsetX) + 'px';
        btn.style.top = (e.clientY + offsetY) + 'px';
    }

    // Função para atualizar visibilidade e coordenada do botão
    function updateButton() {
        const popup = document.getElementById('map_popup');
        if (!popup || popup.style.display === 'none') {
            btn.style.display = 'none';
            currentCoord = null;
            document.removeEventListener('mousemove', moveButton);
            return;
        }

        const match = popup.innerText.match(/\d{3}\|\d{3}/);
        if (!match) {
            btn.style.display = 'none';
            currentCoord = null;
            document.removeEventListener('mousemove', moveButton);
            return;
        }

        currentCoord = match[0];
        btn.style.display = 'block';
        document.addEventListener('mousemove', moveButton);
    }

    // Atualiza a cada movimento do mouse
    document.addEventListener('mousemove', updateButton);

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
