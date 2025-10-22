// ==UserScript==
// @name         Armazenar Recursos (Auto Máximo 10s)
// @namespace    https://tribalwars.com.br/
// @version      1.6
// @description  Armazena automaticamente o máximo de recursos a cada 10s com painel lateral e persistência
// @match        *://*.tribalwars.com.br/game.php?*screen=snob*
// @grant        none
// ==/UserScript==

(function () {
    const STORAGE_KEY = "TW_ARM_Ativo";
    let ativo = localStorage.getItem(STORAGE_KEY) === "true";
    let intervalo = null;

    // === CSS do painel ===
    const estilo = document.createElement("style");
    estilo.textContent = `
    #twARM-painel {
      position: fixed; top: 150px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none;
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1;
      z-index: 9996; transition: transform 0.3s ease-in-out; transform: translateX(-200px);
    }
    #twARM-toggle {
      position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023;
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1;
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000;
    }
    #twARM-conteudo { padding: 8px; width: 180px; }
    #twARM-conteudo h4 { margin: 0 0 6px 0; font-size: 13px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 4px; }
    .twARM-btn { display: block; width: 100%; margin: 5px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px;
      color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; transition: 0.2s; }
    .twARM-btn.on { background: #2e7d32 !important; }
    .twARM-btn.off { background: #8b0000 !important; }
    .twARM-btn:hover { filter: brightness(1.1); }
    #twARM-painel.ativo { transform: translateX(0); }
    .twARM-status { font-size: 12px; margin-top: 6px; text-align: center; }
    `;
    document.head.appendChild(estilo);

    // === Criar painel ===
    const painel = document.createElement("div");
    painel.id = "twARM-painel";
    painel.classList.add("ativo");
    painel.innerHTML = `
        <div id="twARM-toggle">⚙️</div>
        <div id="twARM-conteudo">
            <h4>Armazenar Recursos</h4>
            <button id="twARM-btnToggle" class="twARM-btn ${ativo ? "on" : "off"}">
                ${ativo ? "🟢 Ativo" : "🔴 Inativo"}
            </button>
            <div class="twARM-status" id="twARM-status">
                ${ativo ? "Executando a cada 10s..." : "Pausado"}
            </div>
        </div>
    `;
    document.body.appendChild(painel);

    const btnPainel = document.getElementById("twARM-toggle");
    const btnToggle = document.getElementById("twARM-btnToggle");
    const status = document.getElementById("twARM-status");

    // === Função principal (pega o máximo e executa cliques do jogo) ===
    function armazenarRecursos() {
        if (!location.href.includes("screen=snob")) return;

        const select = document.querySelector('select[name="coin_amount"]');
        const btnSelecionar = document.querySelector('a.btn');
        const btnArmazenar = document.querySelector('input[type="submit"]');

        if (!select || !btnSelecionar || !btnArmazenar) return;

        // ✅ Sempre o primeiro option = máximo disponível
        select.selectedIndex = 0;

        if (typeof Snob?.Coin?.syncInputs === "function") Snob.Coin.syncInputs(select);

        btnSelecionar.click();

        setTimeout(() => {
            btnArmazenar.click();
            console.log("✅ Armazenamento automático executado (máximo).");

            // 🔁 Após armazenar, clicar no link principal para recarregar a página
            setTimeout(() => {
                const linkArmazenar = document.querySelector('a[href*="screen=snob"][href*="mode=reserve"]');
                if (linkArmazenar) {
                    console.log("🔄 Recarregando página via link Armazenar...");
                    linkArmazenar.click();
                } else {
                    console.warn("⚠️ Link de recarregar (mode=reserve) não encontrado.");
                }
            }, 1000);

        }, 800);
    }

    // === Iniciar/parar execução automática ===
    function iniciarAuto() {
        if (intervalo) clearInterval(intervalo);
        intervalo = setInterval(armazenarRecursos, 10000);
        status.textContent = "Executando a cada 10s...";
        if (window.UI?.InfoMessage) UI.InfoMessage("✅ Automação iniciada (10s)", 2000, "success");
    }

    function pararAuto() {
        if (intervalo) clearInterval(intervalo);
        status.textContent = "Pausado";
        if (window.UI?.InfoMessage) UI.InfoMessage("⏸️ Automação pausada", 2000, "success");
    }

    // === Alternar estado ===
    btnToggle.addEventListener("click", () => {
        ativo = !ativo;
        localStorage.setItem(STORAGE_KEY, ativo);
        btnToggle.classList.toggle("on", ativo);
        btnToggle.classList.toggle("off", !ativo);
        btnToggle.textContent = ativo ? "🟢 Ativo" : "🔴 Inativo";
        if (ativo) iniciarAuto();
        else pararAuto();
    });

    // === Toggle do painel lateral ===
    let aberto = true;
    btnPainel.addEventListener("click", () => {
        aberto = !aberto;
        painel.classList.toggle("ativo", aberto);
    });

    // === Retomar estado salvo ===
    if (ativo) iniciarAuto();
})();
