(function () {
    'use strict';

    // Função para injetar o botão no popup
    function addCopyButtonToPopup() {
        const popup = document.getElementById('map_popup');
        if (!popup || popup.querySelector('#copy-coord-btn')) return;

        const th = popup.querySelector('th[colspan="2"]');
        if (!th) return;

        const coordMatch = th.textContent.match(/\((\d{3}\|\d{3})\)/);
        if (!coordMatch) return;

        const coord = coordMatch[1];

        // Encontrar a linha que contém os botões padrão
        const actionRow = Array.from(popup.querySelectorAll('tr')).find(row =>
            row.querySelector('a[href*="info_player"]') || row.querySelector('a[href*="screen=info_village"]')
        );

        if (!actionRow) return;

        const td = actionRow.querySelector('td[colspan="2"]');
        if (!td) return;

        // Criar botão e estilizar
        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = 'btn';
        btn.id = 'copy-coord-btn';
        btn.textContent = '📌 Copiar Coordenada';
        btn.style.marginLeft = '5px';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(coord).then(() => {
                UI.SuccessMessage(`Coordenada ${coord} copiada!`);
            }).catch(() => {
                UI.ErrorMessage('Erro ao copiar coordenada.');
            });
        });

        // Inserir botão no mesmo local dos demais
        td.appendChild(btn);
    }

    // Observar mudanças no corpo do documento
    const observer = new MutationObserver(() => {
        const popup = document.getElementById('map_popup');
        if (popup && popup.style.display !== 'none') {
            addCopyButtonToPopup();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Mostrar aviso de que o script está rodando
    UI.InfoMessage('📌 Script "Copiar Coordenada" ativo!', 3000);
})();
