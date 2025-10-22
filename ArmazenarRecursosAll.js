// ==UserScript==
// @name         Armazenar Recursos com Painel
// @namespace    https://tribalwars.com.br/
// @version      1.0
// @description  Script para armazenar automaticamente recursos com painel de controle persistente
// @match        *://*.tribalwars.com.br/game.php?*screen=snob*
// @grant        none
// ==/UserScript==

(function () {
    const STORAGE_KEY = "TW_ArmazenarAtivo";
    const isAtivo = localStorage.getItem(STORAGE_KEY) === "true";

    // === Painel ===
    const painel = document.createElement("div");
    painel.id = "painelArmazenar";
    painel.style = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #2c2c2c;
        border: 2px solid #804000;
        border-radius: 10px;
        color: #f4e4bc;
        font-family: Verdana, sans-serif;
        font-size: 13px;
        padding: 10px;
        width: 200px;
        text-align: center;
        z-index: 99999;
        box-shadow: 0 0 10px #000;
    `;
    painel.innerHTML = `
        <b>⚙️ Armazenar Recursos</b><br>
        <label style="display:block; margin-top:8px;">
            <input type="checkbox" id="toggleArmazenar" ${isAtivo ? "checked" : ""}>
            Ativar automaticamente
        </label>
        <button id="executarAgora" style="
            margin-top:8px;
            background:#a87443;
            color:#fff;
            border:none;
            padding:5px 10px;
            border-radius:6px;
            cursor:pointer;
        ">Executar Agora</button>
    `;
    document.body.appendChild(painel);

    const checkbox = document.getElementById("toggleArmazenar");
    const btnExecutar = document.getElementById("executarAgora");

    // === Função principal ===
    function armazenarRecursos() {
        if (!location.href.includes("screen=snob")) {
            UI.InfoMessage("Abra a tela da Academia (snob) para usar o script.", 3000, "error");
            return;
        }

        const select = document.querySelector('select[name="coin_amount"]');
        const btnSelecionar = document.querySelector('a.btn');
        const btnArmazenar = document.querySelector('input[type="submit"]');

        if (!select || !btnSelecionar || !btnArmazenar) {
            UI.InfoMessage("❌ Elementos não encontrados na página.", 3000, "error");
            return;
        }

        select.value = "-1";
        if (typeof Snob?.Coin?.syncInputs === "function") {
            Snob.Coin.syncInputs(select);
        }

        btnSelecionar.click();
        setTimeout(() => {
            btnArmazenar.click();
            UI.InfoMessage("✅ Armazenamento realizado com sucesso!", 3000, "success");
        }, 800);
    }

    // === Persistência ===
    checkbox.addEventListener("change", () => {
        localStorage.setItem(STORAGE_KEY, checkbox.checked);
        UI.InfoMessage(
            checkbox.checked
                ? "✅ Armazenamento automático ativado."
                : "⏸️ Armazenamento automático desativado.",
            2500,
            "success"
        );
    });

    btnExecutar.addEventListener("click", armazenarRecursos);

    // === Execução automática se ativado ===
    if (isAtivo) {
        setTimeout(armazenarRecursos, 1000);
    }
})();
