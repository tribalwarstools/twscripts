/**
 * CopyCoord.js
 * Painel rápido para exibir dados da aldeia e copiar coordenadas no Tribal Wars
 * Autor: [tribalwarstools]
 * Versão: 1.0
 * Compatível com: Tribal Wars BR
 */

﻿(function () {
    'use strict';

    const panelId = 'twSDK-panel';
    if (document.getElementById(panelId)) return;

    const village = game_data.village;

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
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">🏰 Aldeia Atual</div>
        <div style="margin-bottom: 10px;">
            <b>Nome:</b> ${village.name}<br>
            <b>Coordenadas:</b> <span id="village-coord">${village.coord}</span><br>
            <b>Pontos:</b> ${village.points.toLocaleString()}<br>
            <b>ID:</b> ${village.id}
        </div>
        <button id="btn-copy" class="btn btn-confirm" style="margin-right: 5px;">Copiar Coordenada</button>
        <button id="btn-close" class="btn btn-cancel">Fechar</button>
    `;

    document.body.appendChild(panel);

    // Copiar coordenada para a área de transferência
    document.getElementById('btn-copy').addEventListener('click', () => {
        const coord = village.coord;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(coord).then(() => {
                UI.SuccessMessage(`Coordenada ${coord} copiada!`);
            }).catch(() => {
                UI.ErrorMessage('Erro ao copiar coordenada.');
            });
        } else {
            UI.ErrorMessage('Clipboard não suportado.');
        }
    });

    // Fechar painel
    document.getElementById('btn-close').addEventListener('click', () => {
        panel.remove();
    });
})();
