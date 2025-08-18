// ==UserScript==
// @name         TW Agendador de Envio (Unificado + Arrastável)
// @namespace    giovanni.agendador
// @version      1.1
// @description  Botão único Iniciar/Cancelar + salvamento + painel arrastável
// @match        *://*/game.php*screen=place*
// @grant        none
// ==/UserScript==

(function () {
    if (!window.TribalWars) {
        alert("Este script deve ser executado dentro do Tribal Wars.");
        return;
    }

    function aplicarEstiloTWPadrao() {
        const style = document.createElement('style');
        style.textContent = `
            .twPainelAgendador {
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
            .twPainelAgendador h3 {
                margin: 0 0 5px;
                font-size: 13px;
                color: #f0e2b6;
                text-align: center;
                cursor: move;  /* 👈 mostra que pode arrastar */
            }
            .twPainelAgendador label { display: flex; flex-direction: column; gap: 2px; }
            .twPainelAgendador input[type="date"],
            .twPainelAgendador input[type="time"],
            .twPainelAgendador input[type="number"] {
                font-size: 12px; padding: 3px 4px; border-radius: 4px;
                border: 1px solid #b79755; background-color: #1c1c1c; color: #f5deb3;
            }
            .twPainelAgendador button {
                font-size: 12px; padding: 4px; border-radius: 4px;
                border: 1px solid #b79755; background-color: #1c1c1c; color: #f5deb3;
                width: 100%;
            }
            .twPainelAgendador button:hover { background-color: #3a3a3a; cursor: pointer; }
            .twPainelAgendador .radioGroup { display: flex; flex-direction: row; justify-content: space-between; gap: 6px; }
            .twPainelAgendador .radioGroup label { display: flex; align-items: center; gap: 4px; font-size: 12px; }
            .twPainelAgendador .contador { font-size: 13px; font-weight: bold; text-align: center; color: #ffd700; margin-top: 4px; }
        `;
        document.head.appendChild(style);
    }

    aplicarEstiloTWPadrao();

    let agendamentoAtivo = null;
    let intervaloCountdown = null;

    const painel = document.createElement("div");
    painel.className = "twPainelAgendador";
    painel.innerHTML = `
        <h3 id="painel_header">⚔️ Envio</h3>
        <label>📅 Data:<input id="ag_data" type="date"></label>
        <label>⏰ Hora:<input id="ag_hora" type="time" step="1"></label>
        <label>⚙️ Ajuste (ms):<input id="ajuste_fino" type="number" value="0" step="10"></label>
        <div class="radioGroup">
          <label><input type="radio" name="modo" value="saida" checked> 🚀 Saída</label>
          <label><input type="radio" name="modo" value="chegada"> 🎯 Chegada</label>
        </div>
        <button id="btn_toggle">▶️ Iniciar</button>
        <div id="ag_status" class="contador"></div>
    `;
    document.body.appendChild(painel);

    const status = document.getElementById("ag_status");
    const btnToggle = document.getElementById("btn_toggle");

    function salvarConfig(ativo) {
        const cfg = {
            data: document.getElementById("ag_data").value,
            hora: document.getElementById("ag_hora").value,
            ajuste: document.getElementById("ajuste_fino").value,
            modo: document.querySelector('input[name="modo"]:checked').value,
            ativo: ativo,
            pos: { top: painel.style.top, left: painel.style.left } // salva posição
        };
        localStorage.setItem("tw_agendamento", JSON.stringify(cfg));
    }

    function carregarConfig() {
        const cfg = JSON.parse(localStorage.getItem("tw_agendamento") || "{}");
        if (cfg.data) document.getElementById("ag_data").value = cfg.data;
        if (cfg.hora) document.getElementById("ag_hora").value = cfg.hora;
        if (cfg.ajuste) document.getElementById("ajuste_fino").value = cfg.ajuste;
        if (cfg.modo) document.querySelector(`input[name="modo"][value="${cfg.modo}"]`).checked = true;
        if (cfg.pos) {
            painel.style.top = cfg.pos.top || "60%";
            painel.style.left = cfg.pos.left || "20px";
            painel.style.transform = "translateY(0)"; // remove centralização
        }
        return cfg;
    }

    function duracaoParaMs(str) {
        const [h, m, s] = str.split(":").map(Number);
        return ((h * 3600) + (m * 60) + s) * 1000;
    }

    function agendar() {
        salvarConfig(true);
        const dataRaw = document.getElementById("ag_data").value;
        const hora = document.getElementById("ag_hora").value;
        const ajuste = parseInt(document.getElementById("ajuste_fino").value, 10) || 0;
        const modo = document.querySelector('input[name="modo"]:checked').value;

        if (!dataRaw || !hora) {
            status.textContent = "❌ Preencha data e hora!";
            return;
        }

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
        const millis = horarioEnvio - new Date() + ajuste;

        if (millis <= 0) {
            status.textContent = "⛔ Já passou!";
            salvarConfig(false);
            return;
        }

        const btn = document.getElementById("troop_confirm_submit");
        if (!btn) {
            status.textContent = "❌ Botão não encontrado!";
            salvarConfig(false);
            return;
        }

        status.textContent = "⏳ Aguardando...";
        btnToggle.textContent = "🛑 Cancelar";

        agendamentoAtivo = setTimeout(() => {
            btn.click();
            status.textContent = `✔️ Enviado (${ajuste}ms)`;
            fim();
        }, millis);

        const inicio = Date.now();
        intervaloCountdown = setInterval(() => {
            const restante = millis - (Date.now() - inicio);
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
        salvarConfig(false);
    }

    function fim() {
        agendamentoAtivo = null;
        btnToggle.textContent = "▶️ Iniciar";
    }

    btnToggle.addEventListener("click", () => {
        if (agendamentoAtivo) {
            cancelar();
        } else {
            agendar();
        }
    });

    // 🔄 Restaura
    const cfg = carregarConfig();
    if (cfg.ativo) {
        agendar();
    }

    // ====================
    // 🔀 Arrastar painel
    // ====================
    (function tornarArrastavel() {
        const header = document.getElementById("painel_header");
        let offsetX = 0, offsetY = 0, arrastando = false;

        header.addEventListener("mousedown", (e) => {
            arrastando = true;
            offsetX = e.clientX - painel.offsetLeft;
            offsetY = e.clientY - painel.offsetTop;
            document.body.style.userSelect = "none"; // evita selecionar texto
        });

        document.addEventListener("mousemove", (e) => {
            if (arrastando) {
                painel.style.left = (e.clientX - offsetX) + "px";
                painel.style.top = (e.clientY - offsetY) + "px";
            }
        });

        document.addEventListener("mouseup", () => {
            if (arrastando) {
                arrastando = false;
                document.body.style.userSelect = "auto";
                salvarConfig(!!agendamentoAtivo); // salva posição nova
            }
        });
    })();

})();
