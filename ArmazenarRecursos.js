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

    // === PAINEL VISUAL ===
    const style = document.createElement('style');
    style.textContent = `
    #twRES-painel { position: fixed; top: 150px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none;
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1;
      z-index: 9996; transition: transform 0.3s ease-in-out; transform: translateX(-200px); }
    #twRES-toggle { position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023;
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1;
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; }
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
    #twRES-intervalo { width: 100%; margin-top: 6px; padding: 4px; background-color: #3a3a3a; color: #f1e1c1;
      border: 1px solid #654321; border-radius: 6px; }
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

    // === FUNÇÃO ROBUSTA QUE MANIPULA MODO MULTI E NORMAL ===
    function executarArmazenamento() {
        const proximo = Date.now() + currentInterval * 1000;
        salvarEstado({ active: true, nextRun: proximo });

        // 1) Verifica existência de selects de múltiplas aldeias
        const multiSelects = Array.from(document.querySelectorAll('select[name="coin_amount"], select[name="coin_amount[]"]'));
        const selectAnchor = document.querySelector('#select_anchor_top') || document.querySelector('a#select_anchor_top');
        const submitButtons = Array.from(document.querySelectorAll('input[type="submit"].btn, input[type="submit"]'))
            .filter(i => (i.value || '').toLowerCase().includes('armazenar'));

        if (multiSelects.length > 0) {
            // Modo múltiplas aldeias detectado
            UI.InfoMessage(`Modo multi detectado: ${multiSelects.length} selects — aplicando Máximo...`, 2000, "info");

            // Define -1 em todos os selects e dispara change
            multiSelects.forEach((sel) => {
                try {
                    sel.value = "-1";
                    // dispara evento change compatível
                    const ev = new Event('change', { bubbles: true });
                    sel.dispatchEvent(ev);
                } catch (e) {
                    console.warn('Erro ao ajustar select coin_amount', e);
                }
            });

            // Se existir a função Snob.Coin.setCoinAmount, chamamos diretamente (mais confiável)
            if (window.Snob && Snob.Coin && typeof Snob.Coin.setCoinAmount === 'function') {
                try {
                    Snob.Coin.setCoinAmount();
                } catch (e) {
                    console.warn('Erro ao chamar Snob.Coin.setCoinAmount()', e);
                    if (selectAnchor) selectAnchor.click();
                }
            } else if (selectAnchor) {
                // clicamos no link "Selecionar" (caso exista)
                selectAnchor.click();
            }

            // Após um pequeno atraso, clicamos nos botões de "Armazenar" (um por um)
            if (submitButtons.length > 0) {
                UI.InfoMessage(`Clicando em ${submitButtons.length} botão(ões) Armazenar...`, 2000, "info");
                submitButtons.forEach((btnEl, idx) => {
                    setTimeout(() => {
                        try {
                            btnEl.click();
                        } catch (e) {
                            console.warn('Erro ao clicar Armazenar', e);
                        }
                    }, 600 + idx * 500); // espaço entre cliques
                });
                // recarrega depois do último clique
                setTimeout(() => { if (window.twRES_running) location.reload(); }, 800 + submitButtons.length * 600);
                return;
            } else {
                // Não encontrou botão Armazenar; tenta submeter formulários individuais
                const forms = Array.from(document.querySelectorAll('form')).filter(f => f.querySelector('select[name="coin_amount"], input[name*="coin"]'));
                if (forms.length > 0) {
                    forms.forEach((f, i) => {
                        setTimeout(() => {
                            try {
                                // tenta submeter o form (se existir um input submit dentro do mesmo, clicamos nele)
                                const sub = f.querySelector('input[type="submit"].btn, input[type="submit"]');
                                if (sub) sub.click();
                                else f.submit();
                            } catch (e) { console.warn('Erro ao submeter form multi', e); }
                        }, 600 + i * 500);
                    });
                    setTimeout(() => { if (window.twRES_running) location.reload(); }, 800 + forms.length * 600);
                    return;
                }

                UI.InfoMessage('Modo multi: não encontrei botão "Armazenar" nem formulários acionáveis.', 3000, "warning");
            }
        }

        // 2) Se não for modo multialdeias, tenta o formulário normal action=reserve
        const form = document.querySelector('form[action*="action=reserve"], form[action*="action=reserveResources"], form[action*="action=reserve_coin"]');
        if (form) {
            const select = form.querySelector('select[name="factor"], select[name="factor[]"]');
            const submitBtn = form.querySelector('input[type="submit"]');
            if (select && submitBtn) {
                // escolhe maior opção disponível no select (como antes)
                const valores = Array.from(select.options).map(o => parseInt(o.value, 10) || 0);
                const maxVal = Math.max(...valores);
                select.value = maxVal.toString();
                // dispara change para garantir atualização
                try { select.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
                setTimeout(() => submitBtn.click(), 700);
                setTimeout(() => { if (window.twRES_running) location.reload(); }, 1500);
                return;
            }
        }

        UI.InfoMessage("⚠️ Nenhum formulário de armazenamento encontrado (nem multi nem normal).", 3500, "warning");
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
            segundosRestantes = currentInterval;
            window.twRES_running = true;
            updateUI();
            const proximo = Date.now() + currentInterval * 1000;
            salvarEstado({ active: true, nextRun: proximo });
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

    const estado = carregarEstado();
    if (estado) {
        if (estado.active) {
            let nextRun = estado.nextRun || (Date.now() + currentInterval * 1000);
            if (nextRun <= Date.now()) nextRun = Date.now() + currentInterval * 1000;
            salvarEstado({ active: true, nextRun });
            ativarFluxo(nextRun);
        } else updateUI();
    } else updateUI();
})();
