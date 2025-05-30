(function () {
    'use strict';

    const btnId = 'copy-coord-draggable-btn';

    // Cria botão arrastável próximo ao mapa
    function createButton() {
        if (document.getElementById(btnId)) return;

        const btn = document.createElement('button');
        btn.id = btnId;
        btn.textContent = '📌 Copiar Coordenada';
        btn.style.position = 'absolute';
        btn.style.padding = '6px 10px';
        btn.style.backgroundColor = '#804000';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'move'; // cursor de mover
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.5)';
        btn.style.zIndex = 9999;

        // Vai ser filho do mapa para posicionar relativo a ele
        const map = document.getElementById('map');
        if (!map) return;
        map.style.position = map.style.position || 'relative';

        // Posição inicial no canto inferior direito
        btn.style.top = (map.clientHeight - 40) + 'px';
        btn.style.left = (map.clientWidth - 160) + 'px';

        // Variáveis para drag
        let isDragging = false;
        let dragStartX, dragStartY, btnStartLeft, btnStartTop;

        btn.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            btnStartLeft = parseInt(btn.style.left, 10);
            btnStartTop = parseInt(btn.style.top, 10);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let deltaX = e.clientX - dragStartX;
            let deltaY = e.clientY - dragStartY;
            let newLeft = btnStartLeft + deltaX;
            let newTop = btnStartTop + deltaY;

            // Limita para ficar dentro do mapa
            newLeft = Math.min(Math.max(0, newLeft), map.clientWidth - btn.offsetWidth);
            newTop = Math.min(Math.max(0, newTop), map.clientHeight - btn.offsetHeight);

            btn.style.left = newLeft + 'px';
            btn.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // para não fechar popup ao clicar no botão
            const coord = btn.getAttribute('data-coord');
            if (coord) {
                navigator.clipboard.writeText(coord).then(() => {
                    UI.SuccessMessage(`Coordenada ${coord} copiada!`);
                }).catch(() => {
                    UI.ErrorMessage('Erro ao copiar coordenada.');
                });
            }
        });

        map.appendChild(btn);
    }

    // Atualiza coordenada do botão
    function updateButtonCoord() {
        const popup = document.getElementById('map_popup');
        if (!popup || popup.style.display === 'none') {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'none';
            return;
        }

        const th = popup.querySelector('th[colspan="2"]');
        if (!th) return;

        const match = th.textContent.match(/\((\d{3}\|\d{3})\)/);
        if (!match) return;

        const coord = match[1];

        createButton();
        const btn = document.getElementById(btnId);
        btn.style.display = 'block';
        btn.setAttribute('data-coord', coord);
        btn.textContent = `📌 Copiar ${coord}`;
    }

    // Observer para detectar popup
    const observer = new MutationObserver(() => {
        updateButtonCoord();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Mensagem inicial
    UI.InfoMessage('📌 Script "Copiar Coordenada" ativo e arrastável!', 3000);
})();
