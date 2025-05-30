(function () {
    'use strict';

    const btnId = 'btn-copy-map-coord';
    let currentCoord = null;
    let isFollowing = false;
    let hideTimeout = null;
    let mouseOverButton = false; // NOVO: flag que indica se mouse está no botão

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

    function moveButton(e) {
        if (!isFollowing) return;
        const offsetX = 15;
        const offsetY = 15;
        btn.style.left = (e.clientX + offsetX) + 'px';
        btn.style.top = (e.clientY + offsetY) + 'px';
    }

    function startFollowing() {
        if (isFollowing) return; // evita duplicar evento
        isFollowing = true;
        btn.style.display = 'block';
        document.addEventListener('mousemove', moveButton);
        clearTimeout(hideTimeout);
    }

    function stopFollowing() {
        isFollowing = false;
        document.removeEventListener('mousemove', moveButton);
        hideTimeout = setTimeout(() => {
            if (!mouseOverButton) {
                btn.style.display = 'none';
                currentCoord = null;
            }
        }, 3000);
    }

    function updateButton() {
        // Se mouse estiver no botão, não ativa seguimento nem altera botão
        if (mouseOverButton) return;

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

    document.addEventListener('mousemove', updateButton);

    // Quando mouse entra no botão
    btn.addEventListener('mouseenter', () => {
        mouseOverButton = true;
        stopFollowing();
        clearTimeout(hideTimeout);
    });

    // Quando mouse sai do botão
    btn.addEventListener('mouseleave', () => {
        mouseOverButton = false;
        if (currentCoord) {
            startFollowing();
        }
    });

    btn.addEventListener('click', () => {
        if (!currentCoord) return;

        navigator.clipboard.writeText(currentCoord).then(() => {
            UI.SuccessMessage(`Coordenada ${currentCoord} copiada!`);
            btn.style.display = 'none';
            currentCoord = null;
            isFollowing = false;
            document.removeEventListener('mousemove', moveButton);
        }).catch(() => {
            UI.ErrorMessage('Erro ao copiar coordenada.');
        });
    });
})();
