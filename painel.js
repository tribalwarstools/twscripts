(function () {
    'use strict';

    // Cria um observador para detectar quando #map_popup for exibido
    const observer = new MutationObserver(() => {
        const popup = document.getElementById('map_popup');
        if (!popup || !popup.innerHTML.includes('K')) return;

        const table = popup.querySelector('table.vis');
        if (!table || table.querySelector('#copy-coord-btn')) return;

        const titleCell = table.querySelector('th[colspan="2"]');
        const coordMatch = titleCell?.innerText.match(/\((\d{3}\|\d{3})\)/);
        if (!coordMatch) return;

        const coord = coordMatch[1];

        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 2;
        cell.style.textAlign = 'center';

        const button = document.createElement('button');
        button.id = 'copy-coord-btn';
        button.className = 'btn';
        button.textContent = '📌 Copiar Coordenada';
        button.addEventListener('click', () => {
            navigator.clipboard.writeText(coord).then(() => {
                UI.SuccessMessage(`Coordenada ${coord} copiada!`);
            }).catch(() => {
                UI.ErrorMessage('Erro ao copiar coordenada.');
            });
        });

        cell.appendChild(button);
        row.appendChild(cell);
        table.appendChild(row);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Mensagem inicial
    UI.InfoMessage('📌 Script Copiar Coordenada ativo!', 3000);
})();
