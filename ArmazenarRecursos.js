(function () {
    if (!location.href.includes('screen=snob')) {
        UI.InfoMessage("Abra a tela da Academia (snob) para usar o script de armazenamento.", 3000, "error");
        return;
    }

    if (window.twRES_running) {
        UI.InfoMessage("O script de armazenamento já está em execução.", 3000, "warning");
        return;
    }

    window.twRES_running = false;
    let contadorId = null;
    let segundosRestantes = 0;
    let currentInterval = parseInt(localStorage.getItem("twRES_intervalo") || "10", 10);

    function salvarEstado(estado) {
        localStorage.setItem("twRES_estado", JSON.stringify(estado));
    }

    function desativarFluxo() {
        if (contadorId) clearInterval(contadorId);
        window.twRES_running = false;
        $('#twRES-btn').text('Iniciar');
        $('#twRES-status').text('Parado');
        salvarEstado({ active: false, nextRun: null });
    }

    // ---- Painel ----
    const style = document.createElement('style');
    style.textContent = `
    #twRES-painel { position: fixed; top: 150px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none; 
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
      z-index: 9996; transition: transform 0.3s ease-in-out; transform: translateX(-200px); }
    #twRES-toggle { position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023; 
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; }
    #twRES-conteudo { padding: 8px; width: 180px; }
    .twRES-btn { display: block; width: 100%; margin: 5px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px; 
      color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; text-align: center; }
    .twRES-btn.on { background: #2e7d32 !important; }
    .twRES-btn.off { background: #8b0000 !important; }
    .twRES-btn:hover { filter: brightness(1.1); }
    #twRES-painel.ativo { transform: translateX(0); }
    .twRES-status { font-size: 12px; margin-top: 6px; text-align: center; }
    #twRES-contador { font-size: 11px; margin-top: 3px; text-align: center; color: #aaa; }
    #twRES-intervalo { width: 100%; margin-top: 6px; padding: 4px; background-color: #3a3a3a; color: #f1e1c1; border: 1px solid #654321; border-radius: 6px; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'twRES-painel';
    panel.innerHTML = `
        <div id="twRES-toggle">☰</div>
        <div id="twRES-conteudo">
            <h4>Armazenamento</h4>
            <button id="twRES-btn" class="twRES-btn off">Iniciar</button>
            <label for="twRES-intervalo">Intervalo:</label>
            <select id="twRES-intervalo">
                <option value="10">10s</option>
                <option value="30">30s</option>
                <option value="60">1m</option>
                <option value="300">5m</option>
                <option value="600">10m</option>
                <option value="1800">30m</option>
                <option value="3600">1h</option>
                <option value="7200">2h</option>
                <option value="14400">4h</option>
                <option value="28800">8h</option>
            </select>
            <div id="twRES-status" class="twRES-status">Parado</div>
            <div id="twRES-contador">--</div>
        </div>
    `;
    document.body.appendChild(panel);

    const btn = document.getElementById('twRES-btn');
    const statusEl = document.getElementById('twRES-status');
    const countdownEl = document.getElementById('twRES-contador');
    const toggle = document.getElementById('twRES-toggle');
    const selectInterval = document.getElementById('twRES-intervalo');

    selectInterval.value = currentInterval;
    toggle.addEventListener('click', () => panel.classList.toggle('ativo'));

    function updateUI() {
        if (window.twRES_running) {
            btn.textContent = 'Parar';
            btn.classList.remove('off'); btn.classList.add('on');
            statusEl.textContent = 'Ativo'; statusEl.style.color = '#a1d490';
        } else {
            btn.textContent = 'Iniciar';
            btn.classList.remove('on'); btn.classList.add('off');
            statusEl.textContent = 'Parado'; statusEl.style.color = '#d49090';
            countdownEl.textContent = '--';
        }
    }

    // ---- EXECUTAR ARMAZENAMENTO (Maximo -1x → Selecionar → Armazenar) ----
    function executarArmazenamento() {
        salvarEstado({ active: true, nextRun: Date.now() + currentInterval*1000 });
        const select = document.querySelector('select[name="coin_amount"]');
        const btnSelecionar = document.querySelector('a.btn');
        const btnArmazenar = document.querySelector('input[type="submit"]');

        if (!select || !btnSelecionar || !btnArmazenar) {
            UI.InfoMessage("⚠️ Elementos não encontrados na página.", 3000, "warning");
            return;
        }

        select.value = "-1";
        if (typeof Snob?.Coin?.syncInputs === "function") Snob.Coin.syncInputs(select);
        btnSelecionar.click();

        setTimeout(() => {
            btnArmazenar.click();
            UI.InfoMessage("✅ Armazenamento realizado!", 1500, "success");
        }, 800);
    }

    function atualizarContador() {
        countdownEl.textContent = `Próximo em: ${segundosRestantes}s`;
        segundosRestantes--;
        if (segundosRestantes < 0) {
            clearInterval(contadorId);
            executarArmazenamento();
            segundosRestantes = currentInterval;
            contadorId = setInterval(atualizarContador, 1000);
        }
    }

    btn.addEventListener('click', () => {
        if (!window.twRES_running) {
            currentInterval = parseInt(selectInterval.value,10);
            segundosRestantes = currentInterval;
            window.twRES_running = true;
            updateUI();
            contadorId = setInterval(atualizarContador, 1000);
        } else {
            desativarFluxo();
            updateUI();
        }
    });

    selectInterval.addEventListener('change', () => {
        currentInterval = parseInt(selectInterval.value,10);
        localStorage.setItem("twRES_intervalo", currentInterval);
    });

    // Restaurar estado anterior
    const estado = JSON.parse(localStorage.getItem("twRES_estado")||"{}");
    if (estado.active) {
        segundosRestantes = currentInterval;
        window.twRES_running = true;
        updateUI();
        contadorId = setInterval(atualizarContador, 1000);
    } else updateUI();

})();
