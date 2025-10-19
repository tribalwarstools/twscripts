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
    let currentFactor = localStorage.getItem("twRES_factor") || "2";

    function carregarEstado() {
        try {
            const raw = localStorage.getItem("twRES_estado");
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

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

    const style = document.createElement('style');
    style.textContent = `
    #twRES-painel { 
      position: fixed; top: 150px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none; 
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
      z-index: 9996; transition: transform 0.3s ease-in-out; transform: translateX(-200px); 
    }
    #twRES-toggle { 
      position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023; 
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; 
    }
    #twRES-conteudo { padding: 8px; width: 180px; }
    #twRES-conteudo h4 { margin: 0 0 6px 0; font-size: 13px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 4px; }
    .twRES-btn { display: block; width: 100%; margin: 5px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px; 
      color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; text-align: center; }
    .twRES-btn.on { background: #2e7d32 !important; }
    .twRES-btn.off { background: #8b0000 !important; }
    .twRES-btn:hover { filter: brightness(1.1); }
    #twRES-painel.ativo { transform: translateX(0); }
    .twRES-status { font-size: 12px; margin-top: 6px; text-align: center; }
    #twRES-contador { font-size: 11px; margin-top: 3px; text-align: center; color: #aaa; }
    #twRES-intervalo, #twRES-factor { width: 100%; margin-top: 6px; padding: 4px; background-color: #3a3a3a; color: #f1e1c1; border: 1px solid #654321; border-radius: 6px; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'twRES-painel';
    panel.innerHTML = `
        <div id="twRES-toggle">☰</div>
        <div id="twRES-conteudo">
            <h4>Armazenamento</h4>
            <button id="twRES-btn" class="twRES-btn off">Iniciar</button>
            <label for="twRES-factor">Multiplicador:</label>
            <select id="twRES-factor">
                <option value="0">Nada</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="4">4x</option>
            </select>
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
    const selectFactor = document.getElementById('twRES-factor');

    selectInterval.value = currentInterval;
    selectFactor.value = currentFactor;

    toggle.addEventListener('click', () => panel.classList.toggle('ativo'));

    function updateUI() {
        if (window.twRES_running) {
            btn.textContent = 'Parar';
            btn.classList.remove('off');
            btn.classList.add('on');
            statusEl.textContent = 'Ativo';
            statusEl.style.color = '#a1d490';
        } else {
            btn.textContent = 'Iniciar';
            btn.classList.remove('on');
            btn.classList.add('off');
            statusEl.textContent = 'Parado';
            statusEl.style.color = '#d49090';
            countdownEl.textContent = '--';
        }
    }

    function executarArmazenamento() {
        const proximo = Date.now() + currentInterval * 1000;
        salvarEstado({ active: true, nextRun: proximo, factor: currentFactor });

        const form = document.querySelector('form[action*="action=reserve"]');
        if (form) {
            const select = form.querySelector('select[name="factor"]');
            const btn = form.querySelector('input[type="submit"]');
            if (select && btn) {
                select.value = currentFactor;
                setTimeout(() => btn.click(), 1000);
            }
        } else {
            UI.InfoMessage("⚠️ Não há formulário de armazenamento na página.", 3000, "warning");
        }

        setTimeout(() => { if (window.twRES_running) location.reload(); }, 1500);
    }

    function atualizarContador() {
        countdownEl.textContent = `Próximo em: ${formatarTempo(segundosRestantes)}`;
        segundosRestantes--;
        if (segundosRestantes < 0) {
            clearInterval(contadorId);
            executarArmazenamento();
        }
    }

    function formatarTempo(segundos) {
        const h = Math.floor(segundos / 3600);
        const m = Math.floor((segundos % 3600) / 60);
        const s = segundos % 60;
        return [h > 0 ? h + "h" : "", m > 0 ? m + "m" : "", s + "s"].filter(Boolean).join(" ");
    }

    function ativarFluxo(nextRunTimestamp) {
        if (contadorId) clearInterval(contadorId);
        window.twRES_running = true;
        updateUI();
        const restante = Math.ceil((nextRunTimestamp - Date.now()) / 1000);
        segundosRestantes = restante > 0 ? restante : currentInterval;
        countdownEl.textContent = `Próximo em: ${formatarTempo(segundosRestantes)}`;
        contadorId = setInterval(atualizarContador, 1000);
    }

    btn.addEventListener('click', () => {
        if (!window.twRES_running) {
            currentInterval = parseInt(selectInterval.value, 10);
            currentFactor = selectFactor.value;
            segundosRestantes = currentInterval;
            window.twRES_running = true;
            updateUI();
            const proximo = Date.now() + currentInterval * 1000;
            salvarEstado({ active: true, nextRun: proximo, factor: currentFactor });
            contadorId = setInterval(atualizarContador, 1000);
        } else {
            desativarFluxo();
            updateUI();
        }
    });

    selectInterval.addEventListener('change', () => {
        const novo = selectInterval.value;
        localStorage.setItem("twRES_intervalo", novo);
        currentInterval = parseInt(novo, 10);
    });

    selectFactor.addEventListener('change', () => {
        const novo = selectFactor.value;
        localStorage.setItem("twRES_factor", novo);
        currentFactor = novo;
    });

    const estado = carregarEstado();
    if (estado) {
        currentFactor = estado.factor || currentFactor;
        selectFactor.value = currentFactor;
        if (estado.active) {
            let nextRun = estado.nextRun || (Date.now() + currentInterval * 1000);
            if (nextRun <= Date.now()) nextRun = Date.now() + currentInterval * 1000;
            salvarEstado({ active: true, nextRun, factor: currentFactor });
            ativarFluxo(nextRun);
        } else updateUI();
    } else updateUI();
})();
