(function () {
    'use strict';

    if (!window.TribalWars) {
        alert("Este script deve ser executado dentro do Tribal Wars.");
        return;
    }

    const villageId = game_data.village.id;
    const storageKey = "configEnvioImediato_" + villageId;

    // === CSS estilo TW ===
    const style = document.createElement("style");
    style.textContent = `
        #painel-envio-imediato {
            position: fixed;
            top: 200px;
            left: 0;
            background: #2b2b2b;
            border: 2px solid #654321;
            border-left: none;
            border-radius: 0 10px 10px 0;
            box-shadow: 2px 2px 8px #000;
            font-family: Verdana, sans-serif;
            color: #f1e1c1;
            z-index: 999999;
            transition: transform 0.3s ease-in-out;
            transform: translateX(-200px);
        }
        #painel-envio-imediato.ativo { transform: translateX(0); }

        #toggle-envio-imediato {
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

        #conteudo-envio-imediato {
            padding: 8px;
            width: 180px;
        }
        #conteudo-envio-imediato h4 {
            margin: 0 0 6px 0;
            font-size: 13px;
            text-align: center;
            border-bottom: 1px solid #654321;
            padding-bottom: 4px;
        }
        #btnToggleAtivar {
            border: 1px solid #3c2f2f;
            border-radius: 6px;
            padding: 6px;
            cursor: pointer;
            font-size: 12px;
            text-align: center;
            width: 100%;
            margin-top: 4px;
            transition: background 0.2s ease-in-out;
            background: #2e7d32; /* verde */
            color: #fff;
        }
    `;
    document.head.appendChild(style);

    // === Criar painel ===
    const painel = document.createElement("div");
    painel.id = "painel-envio-imediato";
    painel.innerHTML = `
        <div id="toggle-envio-imediato">⚡</div>
        <div id="conteudo-envio-imediato">
            <h4>🚀 Envio Imediato</h4>
            <button id="btnToggleAtivar" class="ativo">Ativo</button>
        </div>
    `;
    document.body.appendChild(painel);

    // === Clique para abrir/fechar painel ===
    document.getElementById("toggle-envio-imediato").addEventListener("click", () => {
        painel.classList.toggle("ativo");
    });

    // === Sempre ativo: salva e mantém como ativado ===
    localStorage.setItem(storageKey, JSON.stringify({ ativado: true }));

    // === Execução automática ===
    if (game_data.screen === "place" && location.search.includes("try=confirm")) {
        const btn = document.getElementById("troop_confirm_submit");
        if (btn) {
            btn.click();
            console.log("⚡ Envio imediato automático executado (modo sempre ativo)!");
        }
    }
})();
