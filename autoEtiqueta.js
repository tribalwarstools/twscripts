(function() {
    'use strict';

    const RELOAD_INTERVAL = 60; // segundos

    // Estilo do painel
    const style = document.createElement('style');
    style.textContent = `
    #PainelEtiqueta {
      position: fixed;
      bottom: 150px;
      left: 0px;
      background: #2e2e2e;
      border: 2px solid #b79755;
      border-radius: 6px;
      padding: 10px 15px;
      font-family: "Tahoma", sans-serif;
      font-size: 14px;
      color: #f0e6d2;
      box-shadow: 0 0 8px rgba(0,0,0,0.8);
      z-index: 1000;
      width: 180px;
      user-select: none;
      text-align: center;
    }
    
    #PainelEtiqueta h4 {
        margin: 0 0 8px 0;
        font-weight: bold;
        color: #d4b35d;
        text-align: center;
    }
    #PainelEtiqueta button {
        background: #b79755;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        color: #2e2e2e;
        font-weight: bold;
        width: 100%;
        transition: background 0.3s ease;
    }
    #PainelEtiqueta button:hover {
        background: #d4b35d;
    }
    #PainelEtiqueta .status {
        margin-top: 6px;
        text-align: center;
        font-weight: bold;
    }
    #twCountdown {
        margin-top: 4px;
        text-align: center;
        font-size: 12px;
        color: #aaa;
    }
    `;
    document.head.appendChild(style);

    // Painel
    const panel = document.createElement('div');
    panel.id = 'PainelEtiqueta';
    panel.innerHTML = `
        <h4>Auto Etiquetador</h4>
        <button id="twToggleAutoLabel">Carregando...</button>
        <div class="status" id="twStatus">Status: -</div>
        <div id="twCountdown">Recarregando em ${RELOAD_INTERVAL}s</div>
    `;
    document.body.appendChild(panel);

    // Drag
    (function makeDraggable(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        el.onmousedown = dragMouseDown;
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
            el.style.bottom = "auto";
        }
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    })(panel);

    const STORAGE_KEY = 'twAutoLabelEnabled';
    let enabled = sessionStorage.getItem(STORAGE_KEY) === 'true';

    const btn = document.getElementById('twToggleAutoLabel');
    const statusEl = document.getElementById('twStatus');
    const countdownEl = document.getElementById('twCountdown');

    let recarregarPermitido = true;
    let monitorInterval = null;
    let countdownInterval = null;
    let countdown = RELOAD_INTERVAL;

    function updateUI() {
        if (enabled) {
            btn.textContent = 'Desligar';
            statusEl.textContent = 'Status: Ativo';
            statusEl.style.color = '#a1d490';
        } else {
            btn.textContent = 'Ligar';
            statusEl.textContent = 'Status: Inativo';
            statusEl.style.color = '#d49090';
            countdownEl.textContent = `Recarregando em ${RELOAD_INTERVAL}s`;
        }
    }

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

    updateUI();

    // Função que faz a etiquetagem
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
                    console.warn('Auto Etiquetador: Botão para aplicar etiquetas não encontrado ou desabilitado.');
                }
            }, 500);
        } else {
            recarregarPermitido = true;
        }
    }

    // Verifica ataques pendentes SOMENTE se estiver na tela de ataques
    function checkAtaquesERecarregar() {
        if (!enabled) return;

        const urlParams = new URLSearchParams(window.location.search);
        const isAtaquesPage = urlParams.get('mode') === 'incomings' && urlParams.get('subtype') === 'attacks';

        if (isAtaquesPage) {
            autoEtiqueta();
        }
    }

    // Loop principal
    function runAutoLabel() {
        clearInterval(monitorInterval);
        checkAtaquesERecarregar();

        monitorInterval = setInterval(() => {
            if (enabled) {
                checkAtaquesERecarregar();
            }
        }, 15000); // 15s
    }

    // Contador regressivo para reload na página normal
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

    // Inicialização
    if (enabled) {
        runAutoLabel();
        startCountdown();
    }

})();
