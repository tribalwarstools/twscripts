(function () {
    'use strict';

    const btnId = 'copy-coord-fixed-btn';

    // Cria botão fixo se não existir
    function createButton() {
        if (document.getElementById(btnId)) return;

        const btn = document.createElement('button');
        btn.id = btnId;
        btn.textContent = '📌 Copiar Coordenada';
        btn.style.position = 'fixed';
        btn.style.top = '150px';
        btn.style.right = '40px';
        btn.style.zIndex = 9999;
        btn.style.padding = '8px 12px';
        btn.style.backgroundColor = '#804000';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.5)';

        btn.addEventListener('click', () => {
            const coord = btn.getAttribute('data-coord');
            if (coord) {
                navigator.clipboard.writeText(coord).then(() => {
                    UI.SuccessMessage(`Coordenada ${coord} copiada!`);
                }).catch(() => {
                    UI.ErrorMessage('Erro ao copiar coordenada.');
                });
            }
        });

        document.body.appendChild(btn);
    }

    // Atualiza coordenada do botão fixo baseado no popup aberto
    function updateButtonCoord() {
        const popup = document.getElementById('map_popup');
        if (!popup || popup.style.display === 'none') return;

        const th = popup.querySelector('th[colspan="2"]');
        if (!th) return;

        const match = th.textContent.match(/\((\d{3}\|\d{3})\)/);
        if (!match) return;

        const coord = match[1];

        createButton();
        const btn = document.getElementById(btnId);
        btn.setAttribute('data-coord', coord);
        btn.textContent = `📌 Copiar ${coord}`;
    }

    // Observer para detectar popup aberto
    const observer = new MutationObserver(() => {
        updateButtonCoord();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Mensagem inicial
    UI.InfoMessage('📌 Script "Copiar Coordenada" ativo!2', 3000);
})();
