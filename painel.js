(function () {
    'use strict';

    const btnId = 'btn-copy-map-coord';
    let currentCoord = null;
    let isFollowing = false;
    let hideTimeout = null;

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
        if (!isFollowing) return;
        const offsetX = 15;
        const offsetY = 15;
        btn.style.left = (e.clientX + offsetX) + 'px';
        btn.style.top = (e.clientY + offsetY) + 'px';
    }

    // Mostra botão e começa a seguir o mouse
    function startFollowing() {
        isFollowing = true;
        btn.style.display = 'block';
        document.addEventListener('mousemove', moveButton);
        clearTimeout(hideTimeout);
    }

    // Para de seguir e fixa a posição
    function stopFollowing() {
        isFollowing = false;
        document.removeEventListener('mousemove', moveButton);
        // Esconde depois de 3 segundos se não clicar
        hideTimeout = setTimeout(() => {
            btn.style.display = 'none';
            currentCoord = null;
        }, 3000);
    }

    // Atualiza botão conforme tooltip
    function updateButton() {
        const popup = document.getElementById('map_popup');
        if (!popup || popup.style.display === 'none') {
            btn.style.display = 'none';
            currentCoord = null;
            isFollowing = false;
            document.removeEventListener('mousemove', moveButton);
            clearTimeout(hideTimeout);
            return;
        }

        const match = popup.innerText.match(/\d{3}\|\d{3}/);
        if (!match) {
            btn.style.display = 'none';
            currentCoord = null;
            isFollowing = false;
            document.removeEventListener('mousemove', moveButton);
            clearTimeout(hideTimeout);
            return;
        }

        currentCoord = match[0];
        if (!btn.style.display || btn.style.display === 'none') {
            startFollowing();
        }
    }

    // Atualiza a cada movimento do mouse
    document.addEventListener('mousemove', updateButton);

    // Quando mouse entrar no botão, para de seguir
    btn.addEventListener('mouseenter', () => {
        stopFollowing();
    });

    // Quando mouse sair do botão, volta a seguir (se tooltip ativo)
    btn.addEventListener('mouseleave', () => {
        if (currentCoord) {
            startFollowing();
        }
    });

    // Copiar coordenada ao clicar no botão
    btn.addEventListener('click', () => {
        if (!currentCoord) return;

        navigator.clipboard.writeText(currentCoord).then(() => {
            UI.SuccessMessage(`Coordenada ${currentCoord} copiada!`);
            // Esconde o botão logo após clicar
            btn.style.display = 'none';
            currentCoord = null;
            isFollowing = false;
            document.removeEventListener('mousemove', moveButton);
        }).catch(() => {
            UI.ErrorMessage('Erro ao copiar coordenada.');
        });
    });
})();
