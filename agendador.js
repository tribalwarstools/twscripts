(function () {
    if (!window.TribalWars) {
        alert("Este script deve ser executado dentro do Tribal Wars.");
        return;
    }

    function aplicarEstiloTWPadrao() {
        const style = document.createElement('style');
        style.textContent = `
            .twPainel {
                position: fixed;
                top: 60%;
                left: 20px;
                transform: translateY(-50%);
                background: #2e2e2e;
                border: 2px solid #b79755;
                border-radius: 6px;
                padding: 8px;
                font-family: Verdana, sans-serif;
                font-size: 12px;
                color: #f5deb3;
                z-index: 99999;
                box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.7);
                width: 180px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .twPainel h3 {
                margin: 0 0 5px;
                font-size: 13px;
                color: #f0e2b6;
                text-align: center;
            }

            .twPainel input, .twPainel button {
                font-size: 12px;
                padding: 3px 4px;
                border-radius: 4px;
                border: 1px solid #b79755;
                background-color: #1c1c1c;
                color: #f5deb3;
                width: 100%;
            }

            .twPainel button:hover {
                background-color: #3a3a3a;
                cursor: pointer;
            }

            .twPainel .contador {
                font-size: 13px;
                font-weight: bold;
                text-align: center;
                color: #ffd700;
                margin-top: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    aplicarEstiloTWPadrao();

    let agendamentoAtivo = null;
    let intervaloCountdown = null;

    const painel = document.createElement("div");
    painel.className = "twPainel";
    painel.innerHTML = `
        <h3>⚔️ Envio</h3>
        <label>📅 Data:<input id="ag_data" type="date"></label>
        <label>⏰ Hora:<input id="ag_hora" type="time" step="1"></label>
        <label>⚙️ Ajuste (ms):<input id="ajuste_fino" type="number" value="0" step="10"></label>
        <div>
          <label><input type="radio" name="modo" value="saida" checked> 🚀 Saída</label>
          <label><input type="radio" name="modo" value="chegada"> 🎯 Chegada</label>
        </div>
        <button id="btn_agendar">▶️ Iniciar</button>
        <button id="btn_cancelar" style="display:none;background:#f44336;color:white;">🛑 Cancelar</button>
        <div id="ag_status" class="contador"></div>
    `;
    document.body.appendChild(painel);

    const status = document.getElementById("ag_status");

    function duracaoParaMs(str) {
        const [h, m, s] = str.split(":").map(Number);
        return ((h * 3600) + (m * 60) + s) * 1000;
    }

    function agendar() {
        const dataRaw = document.getElementById("ag_data").value; // yyyy-mm-dd
        const hora = document.getElementById("ag_hora").value;    // hh:mm:ss
        const ajuste = parseInt(document.getElementById("ajuste_fino").value, 10) || 0;
        const modo = document.querySelector('input[name="modo"]:checked').value;

        if (!dataRaw || !hora) {
            status.textContent = "❌ Preencha data e hora!";
            return;
        }

        // Converter para dd/mm/aaaa
        const [yyyy, mm, dd] = dataRaw.split("-");
        const dataFormatada = `${dd}/${mm}/${yyyy}`;

        const [td, tm, ty] = dataFormatada.split("/").map(Number);
        const [th, tmin, ts] = hora.split(":").map(Number);
        const target = new Date(ty, tm - 1, td, th, tmin, ts);

        // tempo de viagem da página
        const duracaoTexto = (() => {
            const linhas = document.querySelectorAll("table.vis tr");
            for (const linha of linhas) {
                const celulas = linha.querySelectorAll("td");
                if (celulas.length === 2 && celulas[0].textContent.trim() === "Duração:") {
                    return celulas[1].textContent.trim();
                }
            }
            return "0:0:0";
        })();

        const tempoViagem = duracaoParaMs(duracaoTexto);
        let horarioEnvio = (modo === "chegada") ? new Date(target.getTime() - tempoViagem) : target;
        const millis = horarioEnvio - new Date() + ajuste;

        if (millis <= 0) {
            status.textContent = "⛔ Já passou!";
            return;
        }

        const btn = document.getElementById("troop_confirm_submit");
        if (!btn) {
            status.textContent = "❌ Botão não encontrado!";
            return;
        }

        status.textContent = "⏳ Aguardando...";
        document.getElementById("btn_agendar").disabled = true;
        document.getElementById("btn_cancelar").style.display = "block";

        agendamentoAtivo = setTimeout(() => {
            btn.click();
            status.textContent = `✔️ Enviado (${ajuste}ms)`;
            fim();
        }, millis);

        const inicio = Date.now();
        intervaloCountdown = setInterval(() => {
            const decorrido = Date.now() - inicio;
            const restante = millis - decorrido;
            if (restante <= 0) {
                clearInterval(intervaloCountdown);
                return;
            }
            const seg = Math.floor(restante / 1000);
            const h = Math.floor(seg / 3600);
            const m = Math.floor((seg % 3600) / 60);
            const s = seg % 60;
            status.textContent = `⏳ ${h}h ${m}m ${s}s`;
        }, 250);
    }

    function cancelar() {
        clearTimeout(agendamentoAtivo);
        clearInterval(intervaloCountdown);
        fim();
        status.textContent = "❌ Cancelado.";
    }

    function fim() {
        agendamentoAtivo = null;
        document.getElementById("btn_agendar").disabled = false;
        document.getElementById("btn_cancelar").style.display = "none";
    }

    document.getElementById("btn_agendar").addEventListener("click", agendar);
    document.getElementById("btn_cancelar").addEventListener("click", cancelar);
})();
