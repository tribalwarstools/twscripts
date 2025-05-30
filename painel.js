(function () {
    'use strict';

    window.twSDK = window.twSDK || {
        scriptData: {},
        translations: {},
        allowedMarkets: ['br'],
        allowedScreens: ['map'],
        allowedModes: [],
        enableCountApi: true,
        isDebug: true,
        isMobile: jQuery('#mobileHeader').length > 0,
        delayBetweenRequests: 200,
    };

    const SDK = window.twSDK;
    const market = window.location.hostname.split('.')[0];
    const screen = game_data.screen;
    const mode = game_data.mode;

    if (!SDK.allowedMarkets.includes(market)) return;
    if (SDK.allowedScreens.length && !SDK.allowedScreens.includes(screen)) return;
    if (SDK.allowedModes.length && !SDK.allowedModes.includes(mode)) return;

    SDK.translations = {
        br: {
            title: 'Painel Exemplo',
            description: 'Este é um painel de exemplo para scripts.',
            btn1: 'Executar Ação',
            btn2: 'Fechar',
        },
        en: {
            title: 'Example Panel',
            description: 'This is an example panel for scripts.',
            btn1: 'Run Action',
            btn2: 'Close',
        },
    };

    const lang = SDK.translations[market] || SDK.translations['en'];
    const log = (...args) => SDK.isDebug && console.log('[twSDK]', ...args);

    function main() {
        log('Painel iniciado.');
        createPanel();
    }

    function createPanel() {
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
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${lang.title}</div>
            <div style="margin-bottom: 10px;">${lang.description}</div>
            <button id="twSDK-btn1" style="margin-right: 5px;">${lang.btn1}</button>
            <button id="twSDK-btn2">${lang.btn2}</button>
        `;

        document.body.appendChild(panel);

        // Botão de ação
        document.getElementById('twSDK-btn1').addEventListener('click', () => {
            log('Botão de ação clicado');
            UI.InfoMessage('Ação executada!', 3000, 'success');
        });

        // Botão de fechar
        document.getElementById('twSDK-btn2').addEventList
