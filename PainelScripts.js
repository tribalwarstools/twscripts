(function () {
    'use strict';

    // === Inserir CSS ===
    function aplicarEstiloPainel() {
        const style = document.createElement('style');
        style.textContent = `
            #tw-painelCons { 
                position: fixed; top: 100px; left: 0; background: #2b2b2b; 
                border: 2px solid #654321; border-left: none; border-radius: 0 10px 10px 0; 
                box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
                z-index: 9999; transition: transform 0.3s ease-in-out; transform: translateX(-200px); 
            }
            #tw-toggle { 
                position: absolute; top: 0; right: -28px; width: 28px; height: 40px; 
                background: #5c4023; border: 2px solid #654321; border-left: none; 
                border-radius: 0 6px 6px 0; color: #f1e1c1; display: flex; align-items: center; 
                justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; 
            }
            #tw-conteudo { padding: 8px; width: 180px; }
            #tw-conteudo h4 { 
                margin: 0 0 6px 0; font-size: 13px; text-align: center; 
                border-bottom: 1px solid #654321; padding-bottom: 4px; 
            }
            .scriptBtn { 
                display: block; width: 100%; margin: 5px 0; background: #5c4023; 
                border: 1px solid #3c2f2f; border-radius: 6px; color: #f1e1c1; 
                padding: 6px; cursor: pointer; font-size: 12px; text-align: center; 
            }
            .scriptBtn.on { background: #2e7d32 !important; }
            .scriptBtn.off { background: #8b0000 !important; }
            .scriptBtn:hover { filter: brightness(1.1); }
            #tw-painelCons.ativo { transform: translateX(0); }
        `;
        document.head.appendChild(style);
    }
    aplicarEstiloPainel();

    // === Criar Painel ===
    const painel = document.createElement("div");
    painel.id = "tw-painel";

    const toggle = document.createElement("div");
    toggle.id = "tw-toggle";
    toggle.textContent = "⚒️";
    toggle.onclick = () => painel.classList.toggle("ativo");
    painel.appendChild(toggle);

    const conteudo = document.createElement("div");
    conteudo.id = "tw-conteudo";
    conteudo.innerHTML = `<h4>🏗️ Construção</h4>`;
    painel.appendChild(conteudo);
    document.body.appendChild(painel);

    // === Lista de edifícios ===
    const listaEdificios = {
        main: "Edifício Principal", barracks: "Quartel", stable: "Estábulo", garage: "Oficina",
        watchtower: "Torre de Vigia", smith: "Ferreiro", place: "Praça de Reunião", statue: "Estátua",
        market: "Mercado", wood: "Bosque", stone: "Poço de Argila", iron: "Mina de Ferro",
        farm: "Fazenda", storage: "Armazém", hide: "Esconderijo", wall: "Muralha", snob: "Academia"
    };

    const listaContainer = document.createElement("div");
    conteudo.appendChild(listaContainer);

    const checkboxes = {};
    for (const [cod, nome] of Object.entries(listaEdificios)) {
        const btn = document.createElement("button");
        btn.className = "scriptBtn off";
        btn.textContent = nome;
        btn.onclick = () => {
            checkboxes[cod] = !checkboxes[cod];
            btn.classList.toggle("on", checkboxes[cod]);
            btn.classList.toggle("off", !checkboxes[cod]);
        };
        listaContainer.appendChild(btn);
    }

    // === Botão iniciar/parar ===
    const btnIniciar = document.createElement("button");
    btnIniciar.className = "scriptBtn";
    btnIniciar.textContent = "▶️ Iniciar Construção";
    conteudo.appendChild(btnIniciar);

    const btnParar = document.createElement("button");
    btnParar.className = "scriptBtn";
    btnParar.textContent = "⏹️ Parar";
    btnParar.disabled = true;
    conteudo.appendChild(btnParar);

    // === Execução ===
    let intervalo = null;
    function executarConstrucao() {
        if ([...document.querySelectorAll("a.btn.btn-cancel")].filter(a => a.href.includes("action=cancel")).length >= 5) return;
        for (let cod of Object.keys(checkboxes).filter(c => checkboxes[c])) {
            const botao = [...document.querySelectorAll(`a.btn-build[id^='main_buildlink_${cod}_']`)]
                .find(b => b.offsetParent !== null && !b.classList.contains('disabled'));
            if (botao) { botao.click(); break; }
        }
    }

    btnIniciar.onclick = () => {
        btnIniciar.disabled = true;
        btnParar.disabled = false;
        intervalo = setInterval(executarConstrucao, 5000); // 5s delay fixo
        UI.InfoMessage("Fila de construção iniciada!", 2000, "success");
    };
    btnParar.onclick = () => {
        clearInterval(intervalo);
        btnIniciar.disabled = false;
        btnParar.disabled = true;
        UI.InfoMessage("Fila de construção parada!", 2000, "error");
    };
})();
