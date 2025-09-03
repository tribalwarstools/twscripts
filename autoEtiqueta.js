(function() {
    'use strict';

    const RELOAD_INTERVAL = 60; // segundos
    const STORAGE_KEY = 'twLBL-enabled';
    let enabled = sessionStorage.getItem(STORAGE_KEY) === 'true';

    // === Estilo ===
    const style = document.createElement('style');
    style.textContent = `
    #twLBL-painel { 
      position: fixed; top: 180px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none; 
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
      z-index: 9999; transition: transform 0.3s ease-in-out; transform: translateX(-180px); 
    }
    #twLBL-toggle { 
      position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023; 
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; 
    }
    #twLBL-conteudo { padding: 8px; width: 180px; }
    #twLBL-conteudo h4 { margin: 0 0 6px 0; font-size: 13px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 4px; }
    .twLBL-btn { display: block; width: 100%; margin: 5px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px; 
      color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; text-align: center; }
    .twLBL-btn.on { background: #2e7d32 !important; }
    .twLBL-btn.off { background: #8b0000 !important; }
    .twLBL-btn:hover { filter: brightness(1.1); }
    #twLBL-painel.ativo { transform: translateX(0); }
    .twLBL-status { font-size: 12px; margin-top: 6px; text-align: center; }
    #twLBL-contador { font-size: 11px; margin-top: 3px; text-align: center; color: #aaa; }
    `;
    document.head.appendChild(style);

    // === Painel ===
    const panel = document.createElement('div');
    panel.id = 'twLBL-painel';
    panel.innerHTML = `
        <div id="twLBL-toggle">☰</div>
        <div id="twLBL-conteudo">
            <h4>Auto Etiquetador</h4>
            <button id="twLBL-btn" class="twLBL-btn off">Ligar</button>
            <div id="twLBL-status" class="twLBL-status">Status: Inativo</div>
            <div id="twLBL-contador">Recarregando em ${RELOAD_INTERVAL}s</div>
        </div>
    `;
    document.body.appendChild(panel);

    // === Elementos ===
    const btn = document.getElementById('twLBL-btn');
    const statusEl = document.getElementById('twLBL-status');
    const countdownEl = document.getElementById('twLBL-contador');
    const toggle = document.getElementById('twLBL-toggle');

    let recarregarPermitido = true;
    let monitorInterval = null;
    let countdownInterval = null;
    let countdown = RELOAD_INTERVAL;

    // === Toggle lateral ===
    toggle.addEventListener('click', () => {
        panel.classList.toggle('ativo');
    });

    // === Atualiza UI ===
    function updateUI() {
        if (enabled) {
            btn.textContent = 'Desligar';
            btn.classList.remove('off');
            btn.classList.add('on');
            statusEl.textContent = 'Status: Ativo';
            statusEl.style.color = '#a1d490';
        } else {
            btn.textContent = 'Ligar';
            btn.classList.remove('on');
            btn.classList.add('off');
            statusEl.textContent = 'Status: Inativo';
            statusEl.style.color = '#d49090';
            countdownEl.textContent = `Recarregando em ${RELOAD_INTERVAL}s`;
        }
    }

    // === Botão ON/OFF ===
    btn.addEventListener('click', () => {
        enabled = !enabled;
        sessionStorage.setItem(STORAGE_KEY, enabled);
        updateUI();
        if (enabled) {
            runAutoLabel();
            startCountdown();
        } else {
            clearInterval(monitorInterval);
            clearInterval(countdownInterval);
        }
    });

    // === Função que faz a etiquetagem ===
    function autoEtiqueta() {
        if (!enabled) return;

        let encontrou = false;
        const linhas = Array.from(document.querySelectorAll('tr'));

        linhas.forEach(linha => {
            const nomeEl = linha.querySelector('span.quickedit-label');
            if (!nomeEl) return;
            const nome = nomeEl.textContent.trim();
            if (nome === "Ataque") {
                const checkbox = linha.querySelector('input[type="checkbox"][name^="id_"]:not(:disabled)');
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    encontrou = true;
                }
            }
        });

        if (encontrou) {
            recarregarPermitido = false;
            setTimeout(() => {
                const btnEtiqueta = document.querySelector('input.btn[type="submit"][name="label"]');
                if (btnEtiqueta && !btnEtiqueta.disabled && btnEtiqueta.offsetParent !== null) {
                    btnEtiqueta.click();
                    console.log('Auto Etiquetador: Etiquetas aplicadas.');
                } else {
                    console.warn('Auto Etiquetador: Botão aplicar etiquetas não encontrado.');
                }
            }, 500);
        } else {
            recarregarPermitido = true;
        }
    }

    // === Verifica ataques pendentes SOMENTE na tela de ataques ===
    function checkAtaquesERecarregar() {
        if (!enabled) return;

        const urlParams = new URLSearchParams(window.location.search);
        const isAtaquesPage = urlParams.get('mode') === 'incomings' && urlParams.get('subtype') === 'attacks';

        if (isAtaquesPage) {
            autoEtiqueta();
        }
    }

    // === Loop principal ===
    function runAutoLabel() {
        clearInterval(monitorInterval);
        checkAtaquesERecarregar();

        monitorInterval = setInterval(() => {
            if (enabled) {
                checkAtaquesERecarregar();
            }
        }, 15000); // 15s
    }

    // === Contador regressivo ===
    function startCountdown() {
        countdown = RELOAD_INTERVAL;
        countdownEl.textContent = `Recarregando em ${countdown}s`;
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            countdown--;
            countdownEl.textContent = `Recarregando em ${countdown}s`;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                if (recarregarPermitido) {
                    console.log('[Reload] Nenhuma etiqueta pendente. Recarregando...');
                    location.reload();
                } else {
                    startCountdown();
                }
            }
        }, 1000);
    }

    // === Inicialização ===
    updateUI();
    if (enabled) {
        runAutoLabel();
        startCountdown();
    }
})();
