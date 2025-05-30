(function () {
    'use strict';

    function insertCopyButton() {
        const popup = document.getElementById('map_popup');
        if (!popup || popup.style.display === 'none') return;

        // Já existe botão? Não fazer nada
        if (popup.querySelector('#copy-coord-btn')) return;

        // Buscar título que contém a coordenada
        const th = popup.querySelector('th[colspan="2"]');
        if (!th) return;

        const match = th.textContent.match(/\((\d{3}\|\d{3})\)/);
        if (!match) return;

        const coord = match[1];

        // Encontrar o local correto onde os botões ficam
        const actionContainer = popup.querySelector('table:last-of-type');
        if (!actionContainer || actionContainer.querySelector('#copy-coord-btn')) return;

        const btn = document.createElement('a');
        btn.href = '#';
        btn.id = 'copy-coord-btn';
        btn.className = 'btn';
        btn.textContent = '📌 Copiar Coordenada';
        btn.style.margin = '5px';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(coord).then(() => {
                UI.SuccessMessage(`Coordenada ${coord} copiada!`);
            }).catch(() => {
                UI.ErrorMessage('Erro ao copiar.');
            });
        });

        // Criar nova linha abaixo da tabela para colocar o botão
        const newRow = document.createElement('tr');
        const newCell = document.createElement('td');
        newCell.colSpan = 2;
        newCell.style.textAlign = 'center';
        newCell.appendChild(btn);
        newRow.appendChild(newCell);

        const tbody = popup.querySelector('#info_content tbody');
        if (tbody) {
            tbody.appendChild(newRow);
        }
    }

    // Observar DOM para detectar quando popup aparece
    const observer = new MutationObserver(() => {
        const popup = document.getElementById('map_popup');
        if (popup && popup.style.display !== 'none') {
            setTimeout(insertCopyButton, 100); // aguarda carregamento interno
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    UI.InfoMessage('📌 Script "Copiar Coordenada" ativo!', 3000);
})();
