(function () {
    if (!location.href.includes('screen=snob')) {
        UI.InfoMessage("Abra a tela de cunhagem (snob) para usar o script.", 3000, "error");
        return;
    }

    if (window.twCUNH_running) {
        UI.InfoMessage("O script de cunhagem já está em execução.", 3000, "warning");
        return;
    }

    window.twCUNH_running = false;
    let contadorId = null;
    let segundosRestantes = 0;
    let currentInterval = parseInt(localStorage.getItem("twCUNH_intervalo") || "10", 10);

    function carregarEstado() {
        try {
            const raw = localStorage.getItem("twCUNH_estado");
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function salvarEstado(estado) {
        localStorage.setItem("twCUNH_estado", JSON.stringify(estado));
    }

    function desativarFluxo() {
        if (contadorId) clearInterval(contadorId);
        window.twCUNH_running = false;
        $('#twCUNH-btn').text('Iniciar');
        $('#twCUNH-status').text('Parado');
        salvarEstado({ active: false, nextRun: null });
    }

    const intervaloSalvo = localStorage.getItem("twCUNH_intervalo") || "10";
    currentInterval = parseInt(intervaloSalvo, 10);

    // === Estilo retrátil ===
    const style = document.createElement('style');
    style.textContent = `
    #twCUNH-painel { 
      position: fixed; top: 220px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none; 
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
      z-index: 9999; transition: transform 0.3s ease-in-out; transform: translateX(-200px); 
    }
    #twCUNH-toggle { 
      position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023; 
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; 
    }
    #twCUNH-conteudo { padding: 8px; width: 200px; }
    #twCUNH-conteudo h4 { margin: 0 0 6px 0; font-size: 13px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 4px; }
    .twCUNH-btn { display: block; width: 100%; margin: 5px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px; 
      color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; text-align: center; }
    .twCUNH-btn.on { background: #2e7d32 !important; }
    .twCUNH-btn.off { background: #8b0000 !important; }
    .twCUNH-btn:hover { filter: brightness(1.1); }
    #twCUNH-painel.ativo { transform: translateX(0); }
    .twCUNH-status { font-size: 12px; margin-top: 6px; text-align: center; }
    #twCUNH-contador { font-size: 11px; margin-top: 3px; text-align: center; color: #aaa; }
    #twCUNH-intervalo { width: 100%; margin-top: 6px; padding: 4px; background-color: #3a3a3a; color: #f1e1c1; border: 1px solid #654321; border-radius: 6px; }
    `;
    document.head.appendChild(style);

    // === Painel ===
    const panel = document.createElement('div');
    panel.id = 'twCUNH-painel';
    panel.innerHTML = `
        <div id="twCUNH-toggle">☰</div>
        <div id="twCUNH-conteudo">
            <h4>Cunhagem</h4>
            <button id="twCUNH-btn" class="twCUNH-btn off">Iniciar</button>
            <label for="twCUNH-intervalo">Intervalo:</label>
            <select id="twCUNH-intervalo">
                <option value="10">10 segundos</option>
                <option value="30">30 segundos</option>
                <option value="60">1 minuto</option>
                <option value="300">5 minutos</option>
                <option value="600">10 minutos</option>
                <option value="1800">30 minutos</option>
                <option value="3600">1 hora</option>
                <option value="7200">2 horas</option>
                <option value="14400">4 horas</option>
                <option value="28800">8 horas</option>
            </select>
            <div id="twCUNH-status" class="twCUNH-status">Parado</div>
            <div id="twCUNH-contador">--</div>
        </div>
    `;
    document.body.appendChild(panel);

    // === Elementos ===
    const btn = document.getElementById('twCUNH-btn');
    const statusEl = document.getElementById('twCUNH-status');
    const countdownEl = document.getElementById('twCUNH-contador');
    const toggle = document.getElementById('twCUNH-toggle');
    const select = document.getElementById('twCUNH-intervalo');

    select.value = intervaloSalvo;

    toggle.addEventListener('click', () => {
        panel.classList.toggle('ativo');
    });

    // === Atualiza UI ===
    function updateUI() {
        if (window.twCUNH_running) {
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

    function executarCunhagem() {
        const proximo = Date.now() + currentInterval * 1000;
        salvarEstado({ active: true, nextRun: proximo });

        if (document.querySelector('.mint_multi_button')) {
            document.querySelector('#select_anchor_top')?.click();
            setTimeout(() => {
                const botao = document.querySelector('.mint_multi_button');
                if (botao && !botao.disabled) botao.click();
                setTimeout(() => { if (window.twCUNH_running) location.reload(); }, 1500);
            }, 1000);
        } else if (document.querySelector('#coin_mint_fill_max')) {
            document.querySelector('#coin_mint_fill_max').click();
            setTimeout(() => {
                const botao = document.querySelector('input[type="submit"][value="Cunhar"]');
                if (botao) botao.click();
                setTimeout(() => { if (window.twCUNH_running) location.reload(); }, 1500);
            }, 1000);
        } else {
            UI.InfoMessage("⚠️ Página não tem botões de cunhagem. Recarregando...", 3000, "warning");
            setTimeout(() => { if (window.twCUNH_running) location.reload(); }, 1500);
        }
    }

    function atualizarContador() {
        countdownEl.textContent = `Próximo em: ${formatarTempo(segundosRestantes)}`;
        segundosRestantes--;
        if (segundosRestantes < 0) {
            clearInterval(contadorId);
            executarCunhagem();
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
        window.twCUNH_running = true;
        updateUI();
        const restante = Math.ceil((nextRunTimestamp - Date.now()) / 1000);
        segundosRestantes = restante > 0 ? restante : currentInterval;
        countdownEl.textContent = `Próximo em: ${formatarTempo(segundosRestantes)}`;
        contadorId = setInterval(atualizarContador, 1000);
    }

    btn.addEventListener('click', () => {
        if (!window.twCUNH_running) {
            currentInterval = parseInt(select.value, 10);
            segundosRestantes = currentInterval;
            window.twCUNH_running = true;
            updateUI();
            const proximo = Date.now() + currentInterval * 1000;
            salvarEstado({ active: true, nextRun: proximo });
            contadorId = setInterval(atualizarContador, 1000);
        } else {
            desativarFluxo();
            updateUI();
        }
    });

    select.addEventListener('change', () => {
        const novoValor = select.value;
        localStorage.setItem("twCUNH_intervalo", novoValor);
        currentInterval = parseInt(novoValor, 10);
        if (window.twCUNH_running) {
            const proximo = Date.now() + currentInterval * 1000;
            salvarEstado({ active: true, nextRun: proximo });
            segundosRestantes = Math.ceil((proximo - Date.now()) / 1000);
        }
    });

    // === Restaura estado salvo ===
    const estado = carregarEstado();
    if (estado) {
        if (estado.active) {
            currentInterval = parseInt(localStorage.getItem("twCUNH_intervalo") || currentInterval, 10);
            select.value = currentInterval.toString();
            let nextRun = estado.nextRun || (Date.now() + currentInterval * 1000);
            const agora = Date.now();
            if (nextRun <= agora) {
                nextRun = agora + currentInterval * 1000;
            }
            salvarEstado({ active: true, nextRun: nextRun });
            ativarFluxo(nextRun);
        } else {
            window.twCUNH_running = false;
            updateUI();
        }
    } else {
        updateUI();
    }
})();
