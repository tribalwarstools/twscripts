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
    let currentInterval = parseInt(localStorage.getItem("cunhagem_intervalo") || "10", 10);

    // Estado persistido: { active: boolean, nextRun: timestamp }
    function carregarEstado() {
        try {
            const raw = localStorage.getItem("cunhagem_estado");
            if (!raw) return null; // distingue "nunca iniciado" de "pausado"
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function salvarEstado(estado) {
        localStorage.setItem("cunhagem_estado", JSON.stringify(estado));
    }

    function desativarFluxo() {
        if (contadorId) clearInterval(contadorId);
        window.mintScriptRunning = false;
        $('#toggleCunhagem').text('Iniciar');
        $('#contadorTempo').text('Parado');
        // salva que está pausado (active false)
        salvarEstado({ active: false, nextRun: null });
    }

    const intervaloSalvo = localStorage.getItem("cunhagem_intervalo") || "10";
    currentInterval = parseInt(intervaloSalvo, 10);

    const style = document.createElement('style');
    style.textContent = `
    #PainelCunhar {
      position: fixed;
      bottom: 270px;
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
    #PainelCunhar h4 {
        margin: 0 0 8px 0;
        font-weight: bold;
        color: #d4b35d;
        text-align: center;
    }
    #PainelCunhar button {
        background: #b79755;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        color: #2e2e2e;
        font-weight: bold;
        width: 100%;
        transition: background 0.3s ease;
        margin-bottom: 8px;
    }
    #PainelCunhar button:hover {
        background: #d4b35d;
    }
    #PainelCunhar label {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
    }
    #PainelCunhar select {
        background-color: #3a3a3a;
        color: #f0e6d2;
        border: 1px solid #b79755;
        border-radius: 4px;
        padding: 4px;
        font-size: 13px;
        width: 100%;
        box-sizing: border-box;
        outline: none;
        appearance: none;
        margin-bottom: 8px;
    }
    #PainelCunhar select:focus {
        border-color: #d4b35d;
        box-shadow: 0 0 4px #d4b35d;
    }
    #PainelCunhar .status {
        margin-top: 6px;
        text-align: center;
        font-weight: normal;
    }
    #twCountdown {
        margin-top: 4px;
        text-align: center;
        font-size: 12px;
        color: #aaa;
    }
    `;
    document.head.appendChild(style);

    const html = `
<div id="PainelCunhar">
  <h4>Cunhagem</h4>
  <button id="toggleCunhagem">Iniciar</button>
  <label for="intervaloCunhagem">Intervalo:</label>
  <select id="intervaloCunhagem">
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
  <div class="status" id="contadorTempo">Parado</div>
  <div id="twCountdown"></div>
</div>
`;
    $('body').append(html);
    $('#intervaloCunhagem').val(intervaloSalvo);

// Painel arrastável (versão mais refinada)
const painel = document.getElementById("PainelCunhar");
const painelTitulo = painel.querySelector('h4'); // usa o H4 como título arrastável
let offsetX, offsetY, isDragging = false;

painelTitulo.style.cursor = "move"; // indica que pode arrastar

painelTitulo.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = painel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    painel.style.transition = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;
    const maxLeft = window.innerWidth - painel.offsetWidth;
    const maxTop = window.innerHeight - painel.offsetHeight;
    painel.style.left = Math.min(Math.max(0, left), maxLeft) + 'px';
    painel.style.top = Math.min(Math.max(0, top), maxTop) + 'px';
    painel.style.right = 'auto';
    painel.style.bottom = 'auto';
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        painel.style.transition = '';
    }
});


document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        painel.style.transition = '';
    }
});


    $(document).on('change', '#intervaloCunhagem', function () {
        const novoValor = $(this).val();
        localStorage.setItem("cunhagem_intervalo", novoValor);
        currentInterval = parseInt(novoValor, 10);
        if (window.mintScriptRunning) {
            const proximo = Date.now() + currentInterval * 1000;
            salvarEstado({ active: true, nextRun: proximo });
            segundosRestantes = Math.ceil((proximo - Date.now()) / 1000);
        }
    });

    function executarCunhagem() {
        const proximo = Date.now() + currentInterval * 1000;
        salvarEstado({ active: true, nextRun: proximo });

        if (document.querySelector('.mint_multi_button')) {
            document.querySelector('#select_anchor_top')?.click();
            setTimeout(() => {
                const botao = document.querySelector('.mint_multi_button');
                if (botao && !botao.disabled) botao.click();
                setTimeout(() => { if (window.mintScriptRunning) location.reload(); }, 1500);
            }, 1000);
        } else if (document.querySelector('#coin_mint_fill_max')) {
            document.querySelector('#coin_mint_fill_max').click();
            setTimeout(() => {
                const botao = document.querySelector('input[type="submit"][value="Cunhar"]');
                if (botao) botao.click();
                setTimeout(() => { if (window.mintScriptRunning) location.reload(); }, 1500);
            }, 1000);
        } else {
            UI.InfoMessage("⚠️ Página não tem botões de cunhagem. Recarregando...", 3000, "warning");
            setTimeout(() => { if (window.mintScriptRunning) location.reload(); }, 1500);
        }
    }

    function atualizarContador() {
        $('#contadorTempo').text(`Próximo em: ${formatarTempo(segundosRestantes)}`);
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
        window.mintScriptRunning = true;
        $('#toggleCunhagem').text('Parar');
        const restante = Math.ceil((nextRunTimestamp - Date.now()) / 1000);
        segundosRestantes = restante > 0 ? restante : currentInterval;
        $('#contadorTempo').text(`Próximo em: ${formatarTempo(segundosRestantes)}`);
        contadorId = setInterval(atualizarContador, 1000);
    }

    $(document).on('click', '#toggleCunhagem', function () {
        if (!window.mintScriptRunning) {
            const delaySegundos = parseInt($('#intervaloCunhagem').val(), 10);
            currentInterval = delaySegundos;
            segundosRestantes = delaySegundos;
            window.mintScriptRunning = true;
            $('#toggleCunhagem').text('Parar');
            $('#contadorTempo').text(`Próximo em: ${formatarTempo(segundosRestantes)}`);
            const proximo = Date.now() + delaySegundos * 1000;
            salvarEstado({ active: true, nextRun: proximo });
            contadorId = setInterval(atualizarContador, 1000);
        } else {
            desativarFluxo();
        }
    });

    // Restaura estado salvo
    const estado = carregarEstado();
    if (estado) {
        if (estado.active) {
            currentInterval = parseInt(localStorage.getItem("cunhagem_intervalo") || currentInterval, 10);
            $('#intervaloCunhagem').val(currentInterval.toString());
            let nextRun = estado.nextRun || (Date.now() + currentInterval * 1000);
            const agora = Date.now();
            if (nextRun <= agora) {
                nextRun = agora + currentInterval * 1000;
            }
            salvarEstado({ active: true, nextRun: nextRun });
            ativarFluxo(nextRun);
        } else {
            // estava pausado: deixa parado (interface já está no padrão)
            window.mintScriptRunning = false;
            $('#toggleCunhagem').text('Iniciar');
            $('#contadorTempo').text('Parado');
        }
    } else {
        // nunca houve estado: auto inicia
        $('#toggleCunhagem').trigger('click');
    }
})();








