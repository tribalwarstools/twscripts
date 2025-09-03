(function () {
    if (!window.TribalWars) {
        alert("Este script deve ser executado dentro do Tribal Wars.");
        return;
    }

    const villageId = game_data.village.id;
    const storageKey = 'agendamentoTW_' + villageId;

    // === Estilo corrigido do Agendador ===
    function aplicarEstiloAgendador() {
        const style = document.createElement('style');
        style.textContent = `
        #tw-agendador {
            position: fixed;
            top: 180px;
            left: 0;
            background: #2b2b2b;
            border: 2px solid #654321;
            border-left: none;
            border-radius: 0 10px 10px 0;
            box-shadow: 2px 2px 8px #000;
            font-family: Verdana, sans-serif;
            color: #f1e1c1;
            z-index: 9995;
            transition: transform 0.3s ease-in-out;
            transform: translateX(-220px);
            width: 220px;
        }
        #tw-agendador.ativo { transform: translateX(0); }

        #tw-agendador-toggle {
            position: absolute;
            top: 0;
            right: -28px;
            width: 28px;
            height: 40px;
            background: #5c4023;
            border: 2px solid #654321;
            border-left: none;
            border-radius: 0 6px 6px 0;
            color: #f1e1c1;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 2px 2px 6px #000;
        }

        #tw-agendador-conteudo {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 10px;
        }
        #tw-agendador-conteudo h4 {
            margin: 0 0 4px 0;
            font-size: 13px;
            text-align: center;
            border-bottom: 1px solid #654321;
            padding-bottom: 4px;
        }

        #tw-agendador-conteudo label {
            display: flex;
            flex-direction: column;
            font-size: 12px;
            gap: 2px;
        }

        #tw-agendador-conteudo input {
            font-size: 12px;
            padding: 4px;
            border-radius: 4px;
            border: 1px solid #b79755;
            background-color: #1c1c1c;
            color: #f5deb3;
        }

        #tw-agendador-conteudo .radioGroup {
            display: flex;
            justify-content: space-between;
            gap: 6px;
        }
        #tw-agendador-conteudo .radioGroup label {
            flex-direction: row;
            align-items: center;
            gap: 4px;
            font-size: 12px;
        }

        #tw-agendador-conteudo button {
            background: #5c4023;
            border: 1px solid #3c2f2f;
            border-radius: 6px;
            color: #f1e1c1;
            padding: 6px;
            cursor: pointer;
            font-size: 12px;
            text-align: center;
            margin-top: 4px;
        }
        #tw-agendador-conteudo button:hover { filter: brightness(1.1); }

        #tw-ag-status {
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            color: #ffd700;
            margin-top: 4px;
        }
        `;
        document.head.appendChild(style);
    }
    aplicarEstiloAgendador();

    // === Criar painel ===
    const painel = document.createElement("div");
    painel.id = "tw-agendador";
    painel.innerHTML = `
        <div id="tw-agendador-toggle">⚔️</div>
        <div id="tw-agendador-conteudo">
            <h4>⚔️ Agendador</h4>
            <label>📅 Data:<input id="ag_data" type="date"></label>
            <label>⏰ Hora:<input id="ag_hora" type="time" step="1"></label>
            <label>⚙️ Ajuste (ms):<input id="ajuste_fino" type="number" value="0" step="10"></label>
            <div class="radioGroup">
                <label><input type="radio" name="modo" value="saida" checked> 🚀 Saída</label>
                <label><input type="radio" name="modo" value="chegada"> 🎯 Chegada</label>
            </div>
            <button id="btn_toggle">Iniciar</button>
            <div id="tw-ag-status"></div>
        </div>
    `;
    document.body.appendChild(painel);

    let intervaloCountdown = null;
    const status = document.getElementById("tw-ag-status");
    const btnToggle = document.getElementById("btn_toggle");

    (function preencherAgora() {
        const agora = new Date();
        const yyyy = agora.getFullYear();
        const mm = String(agora.getMonth() + 1).padStart(2, "0");
        const dd = String(agora.getDate()).padStart(2, "0");
        const hh = String(agora.getHours()).padStart(2, "0");
        const mi = String(agora.getMinutes()).padStart(2, "0");
        const ss = String(agora.getSeconds()).padStart(2, "0");
        document.getElementById("ag_data").value = `${yyyy}-${mm}-${dd}`;
        document.getElementById("ag_hora").value = `${hh}:${mi}:${ss}`;
    })();

    function horaServidor() {
        const srvElem = document.getElementById("serverTime");
        if (!srvElem) return new Date();
        const [h, m, s] = srvElem.textContent.trim().split(":").map(Number);
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s);
    }

    function duracaoParaMs(str) {
        const [h, m, s] = str.split(":").map(Number);
        return ((h * 3600) + (m * 60) + s) * 1000;
    }

    function salvarAgendamento(dataRaw, hora, ajuste, modo) {
        localStorage.setItem(storageKey, JSON.stringify({ dataRaw, hora, ajuste, modo }));
    }

    function removerAgendamento() {
        localStorage.removeItem(storageKey);
    }

    function agendar(agData = null, agHora = null, agAjuste = null, agModo = null) {
        const dataRaw = agData || document.getElementById("ag_data").value;
        const hora = agHora || document.getElementById("ag_hora").value;
        const ajuste = agAjuste != null ? agAjuste : (parseInt(document.getElementById("ajuste_fino").value, 10) || 0);
        const modo = agModo || document.querySelector('input[name="modo"]:checked').value;

        if (!dataRaw || !hora) { status.textContent = "❌ Preencha data e hora!"; return; }

        const [yyyy, mm, dd] = dataRaw.split("-");
        const target = new Date(yyyy, mm - 1, dd, ...hora.split(":").map(Number));

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

        if (horarioEnvio - horaServidor() <= 0) {
            status.textContent = "Horário já passou.";
            return;
        }

        const btn = document.getElementById("troop_confirm_submit");
        if (!btn) { status.textContent = "❌ Botão não encontrado!"; return; }

        // Salvar no localStorage
        salvarAgendamento(dataRaw, hora, ajuste, modo);

        btnToggle.textContent = "Cancelar";

        function atualizarCountdown() {
            const restante = horarioEnvio - horaServidor() + ajuste;
            if (restante <= 0) {
                clearInterval(intervaloCountdown);
                btn.click();
                status.textContent = `✔️ Enviado (${ajuste}ms)`;
                fim();
                removerAgendamento();
                return;
            }
            const seg = Math.floor(restante / 1000);
            const h = Math.floor(seg / 3600);
            const m = Math.floor((seg % 3600) / 60);
            const s = seg % 60;
            status.textContent = `⏳ ${h}h ${m}m ${s}s`;
        }
        atualizarCountdown();
        intervaloCountdown = setInterval(atualizarCountdown, 250);
    }

    function cancelar() {
        clearInterval(intervaloCountdown);
        fim();
        removerAgendamento();
        status.textContent = "❌ Cancelado.";
    }

    function fim() {
        intervaloCountdown = null;
        btnToggle.textContent = "Iniciar";
    }

    btnToggle.addEventListener("click", () => {
        if (intervaloCountdown) { cancelar(); } else { agendar(); }
    });

    // === Toggle abrir/fechar painel ===
    document.getElementById("tw-agendador-toggle").addEventListener("click", () => {
        painel.classList.toggle("ativo");
    });

    // === Ao carregar, verificar se há agendamento salvo para esta aldeia ===
    const agendamentoSalvo = JSON.parse(localStorage.getItem(storageKey));
    if (agendamentoSalvo) {
        document.getElementById("ag_data").value = agendamentoSalvo.dataRaw;
        document.getElementById("ag_hora").value = agendamentoSalvo.hora;
        document.getElementById("ajuste_fino").value = agendamentoSalvo.ajuste;
        document.querySelector(`input[name="modo"][value="${agendamentoSalvo.modo}"]`).checked = true;
        agendar(agendamentoSalvo.dataRaw, agendamentoSalvo.hora, agendamentoSalvo.ajuste, agendamentoSalvo.modo);
    }

})();
