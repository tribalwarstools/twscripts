(function () {
    'use strict';

    if (!window.game_data || game_data.screen !== "main") {
        Dialog.show("erro_build", `
            <h3 style="text-align:center;">⚒️ Script de Construção</h3>
            <p style="margin:10px 0; text-align:center; color:#b00;">
                Este script só funciona na tela de <b>Construções</b>.
            </p>
            <div style="text-align:center; margin-top:15px;">
                <a href="game.php?village=${game_data.village.id}&screen=main" 
                   class="btn btn-confirm-yes">Ir para Construções</a>
            </div>
        `);
        return;
    }

    const STORAGE_KEY = "twBuildState_" + game_data.village.id;   // estado dos checkboxes
    const ORDER_KEY   = "twBuildOrder_" + game_data.village.id;   // ordem da lista
    const BTN_KEY     = "twBuildBtn_" + game_data.village.id;     // estado do botão iniciar/parar

    let intervalo = null;

    // ========= ESTILO =========
    function aplicarEstiloPainel() {
        const style = document.createElement('style');
        style.textContent = `
            #tw-build-painel { 
                position: fixed; top: 50px; right: 0; background: #2b2b2b; 
                border: 2px solid #654321; border-right: none; border-radius: 10px 0 0 10px; 
                box-shadow: -2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
                z-index: 9999999; transition: transform 0.3s ease-in-out; transform: translateX(220px); 
            }
            #tw-build-toggle { 
                position: absolute; top: 0; left: -28px; width: 28px; height: 40px; 
                background: #5c4023; border: 2px solid #654321; border-right: none; 
                border-radius: 6px 0 0 6px; color: #f1e1c1; display: flex; align-items: center; 
                justify-content: center; cursor: pointer; font-size: 16px; box-shadow: -2px 2px 6px #000; 
            }
            #tw-build-conteudo { padding: 8px; width: 200px; }
            #tw-build-conteudo h4 { 
                margin: 0 0 6px 0; font-size: 13px; text-align: center; 
                border-bottom: 1px solid #654321; padding-bottom: 4px; 
            }
            #tw-build-lista { 
                margin: 8px 0; 
                max-height: 300px; overflow-y: auto;
            }
            .tw-build-item { 
                display: flex; align-items: center; justify-content: flex-start;
                margin: 3px 0; padding: 3px; background: #3a2f23; border: 1px solid #654321;
                border-radius: 4px; cursor: grab;
            }
            .tw-build-item.dragging { opacity: 0.5; }
            .tw-build-label { margin-left: 6px; font-size: 12px; cursor: pointer; }
            #tw-build-btn-executar {
                display: block; width: 100%; margin-top: 10px; background: #5c4023; 
                border: 1px solid #3c2f2f; border-radius: 6px; color: #f1e1c1; 
                padding: 6px; cursor: pointer; font-size: 12px; text-align: center;
            }
            #tw-build-painel.ativo { transform: translateX(0); }
        `;
        document.head.appendChild(style);
    }
    aplicarEstiloPainel();

    // ========= PAINEL =========
    const painel = document.createElement("div");
    painel.id = "tw-build-painel";

    const toggle = document.createElement("div");
    toggle.id = "tw-build-toggle";
    toggle.textContent = "⚒️";
    toggle.onclick = () => painel.classList.toggle("ativo");
    painel.appendChild(toggle);

    const conteudo = document.createElement("div");
    conteudo.id = "tw-build-conteudo";
    conteudo.innerHTML = `<h4>🏗️ Construção</h4>`;
    painel.appendChild(conteudo);
    document.body.appendChild(painel);

    // ========= LISTA DE EDIFÍCIOS =========
    const listaEdificios = {
        main: "Edifício Principal",
        barracks: "Quartel",
        stable: "Estábulo",
        garage: "Oficina",
        smith: "Ferreiro",
        place: "Praça de Reunião",
        statue: "Estátua",
        market: "Mercado",
        wood: "Bosque",
        stone: "Poço de Argila",
        iron: "Mina de Ferro",
        farm: "Fazenda",
        storage: "Armazém",
        wall: "Muralha",
        snob: "Academia",
        church_f: "Primeira Igreja",
        church: "Igreja",
        watchtower: "Torre de Vigia",
        hide: "Esconderijo"
    };

    const listaContainer = document.createElement("div");
    listaContainer.id = "tw-build-lista";
    conteudo.appendChild(listaContainer);

    const checks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    let ordem = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
    if (ordem.length === 0) ordem = Object.keys(listaEdificios);

    function montarLista() {
        listaContainer.innerHTML = "";
        for (const cod of ordem) {
            const nome = listaEdificios[cod];
            if (!nome) continue;
            const item = document.createElement("div");
            item.className = "tw-build-item";
            item.draggable = true;
            item.dataset.cod = cod;

            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.checked = !!checks[cod];
            chk.onchange = () => {
                checks[cod] = chk.checked;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
            };

            const lbl = document.createElement("label");
            lbl.className = "tw-build-label";
            lbl.textContent = nome + " (0)";

            item.appendChild(chk);
            item.appendChild(lbl);
            listaContainer.appendChild(item);

            item.addEventListener("dragstart", () => item.classList.add("dragging"));
            item.addEventListener("dragend", () => {
                item.classList.remove("dragging");
                salvarOrdem();
            });
        }
    }

    function salvarOrdem() {
        const nova = [...listaContainer.querySelectorAll(".tw-build-item")].map(el => el.dataset.cod);
        ordem = nova;
        localStorage.setItem(ORDER_KEY, JSON.stringify(ordem));
    }

    listaContainer.addEventListener("dragover", e => {
        e.preventDefault();
        const dragging = listaContainer.querySelector(".dragging");
        const after = [...listaContainer.querySelectorAll(".tw-build-item:not(.dragging)")].find(el => {
            const box = el.getBoundingClientRect();
            return e.clientY < box.top + box.height / 2;
        });
        if (after) {
            listaContainer.insertBefore(dragging, after);
        } else {
            listaContainer.appendChild(dragging);
        }
    });

    montarLista();

    // ========= BOTÃO EXECUTAR =========
    const btnExec = document.createElement("button");
    btnExec.id = "tw-build-btn-executar";
    conteudo.appendChild(btnExec);

    function atualizarBotaoRodando(rodando) {
        if (rodando) {
            btnExec.textContent = "Parar";
            localStorage.setItem(BTN_KEY, "on");
        } else {
            btnExec.textContent = "Iniciar";
            localStorage.setItem(BTN_KEY, "off");
        }
    }

    btnExec.onclick = () => {
        if (intervalo) {
            clearInterval(intervalo);
            intervalo = null;
            atualizarBotaoRodando(false);
        } else {
            executarConstrucao();
            intervalo = setInterval(executarConstrucao, 5000);
            atualizarBotaoRodando(true);
        }
    };

    function executarConstrucao() {
        for (let cod of ordem.filter(c => checks[c])) {
            const botao = [...document.querySelectorAll(`a.btn-build[id^='main_buildlink_${cod}_']`)]
                .find(b => b.offsetParent !== null && !b.classList.contains('disabled'));
            if (botao) {
                botao.click();
                break;
            }
        }
    }

    // ========= RESTAURAR ESTADO =========
    if (localStorage.getItem(BTN_KEY) === "on") {
        intervalo = setInterval(executarConstrucao, 5000);
        atualizarBotaoRodando(true);
    } else {
        atualizarBotaoRodando(false);
    }

})();


