(function () {
    if (!location.href.includes('screen=snob')) {
        UI.InfoMessage("Abra a tela de cunhagem (snob) para usar o script.", 3000, "error");
        return;
    }

    if (window.mintScriptRunning) {
        UI.InfoMessage("O script já está em execução.", 3000, "warning");
        return;
    }

    window.mintScriptRunning = false;
    let contadorId = null;
    let segundosRestantes = 0;

    const html = `
        <div id="conteudoCunhagem">
            <div style="margin-bottom:10px;">
                <label><b>⛁ Cunhagem Automática</b></label><br><br>
                <label>Intervalo (segundos): </label>
                <select id="intervaloCunhagem" class="vis">
                    <option value="10">10</option>
                    <option value="30">30</option>
                    <option value="60">60</option>
                </select>
            </div>
            <div style="margin-top:10px;">
                <button id="iniciarCunhagem" class="btn btn-confirm">Iniciar</button>
                <button id="pararCunhagem" class="btn btn-cancel" disabled>Parar</button>
                <span id="contadorTempo" style="margin-left:10px;font-weight:bold;"></span>
            </div>
        </div>
    `;

    Dialog.show("cunhagem_auto", html);

    function executarCunhagem() {
        console.log("[Cunhagem] Selecionando aldeias...");
        document.querySelector('#select_anchor_top')?.click();

        setTimeout(() => {
            console.log("[Cunhagem] Cunhando moedas...");
            document.querySelector('.mint_multi_button')?.click();
        }, 1000);
    }

    function atualizarContador() {
        $('#contadorTempo').text(`Próximo em: ${segundosRestantes}s`);
        segundosRestantes--;
        if (segundosRestantes < 0) {
            segundosRestantes = parseInt($('#intervaloCunhagem').val(), 10);
            executarCunhagem();
        }
    }

    $(document).on('click', '#iniciarCunhagem', function () {
        if (window.mintScriptRunning) return;

        const delaySegundos = parseInt($('#intervaloCunhagem').val(), 10);
        segundosRestantes = delaySegundos;
        window.mintScriptRunning = true;

        $('#iniciarCunhagem').attr('disabled', true);
        $('#pararCunhagem').attr('disabled', false);

        executarCunhagem();
        contadorId = setInterval(atualizarContador, 1000);
    });

    $(document).on('click', '#pararCunhagem', function () {
        if (!window.mintScriptRunning) return;

        clearInterval(contadorId);
        window.mintScriptRunning = false;
        $('#contadorTempo').text('');
        $('#iniciarCunhagem').attr('disabled', false);
        $('#pararCunhagem').attr('disabled', true);
        console.log("[Cunhagem] Script parado.");
    });
})();
