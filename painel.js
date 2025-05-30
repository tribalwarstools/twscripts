(function () {
    'use strict';

    // Painel simples com botão
    const panelId = 'twSDK-panel';

    // Evita duplicar
    if (document.getElementById(panelId)) return;

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.style = `
        position: fixed;
        top: 120px;
        right: 40px;
        width: 300px;
        background: #f4e4bc;
        border: 2px solid #804000;
        border-radius: 10px;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
        padding: 10px;
        z-index: 9999;
        font-family: Verdana, sans-serif;
    `;

    panel.innerHTML = `
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">Painel Teste</div>
        <div style="margin-bottom: 10px;">Painel funcionando!</div>
        <button id="btn-action" style="margin-right: 5px;">Executar</button>
        <button id="btn-close">Fechar</button>
    `;

    document.body.appendChild(panel);

    document.getElementById('btn-action').addEventListener('click', () => {
        UI.InfoMessage('Painel funcionando corretamente!', 3000, 'success');
    });

    document.getElementById('btn-close').addEventListener('click', () => {
        panel.remove();
    });
})();
