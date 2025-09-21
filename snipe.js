(function () {
    let contadorInterval = null;

    // === CSS do painel ===
    let style = document.createElement("style");
    style.textContent = `
    #twSNP-painel { 
      position: fixed; top: 150px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none; 
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
      z-index: 9997; transition: transform 0.3s ease-in-out; transform: translateX(-220px); 
    }
    #twSNP-toggle { 
      position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023; 
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; 
    }
    #twSNP-conteudo { padding: 8px; width: 200px; }
    #twSNP-conteudo h4 { margin: 0 0 6px 0; font-size: 13px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 4px; }
    .twSNP-btn { display: block; width: 100%; margin: 6px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px; 
      color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; text-align: center; }
    .twSNP-btn:hover { filter: brightness(1.1); }
    #twSNP-painel.ativo { transform: translateX(0); }
    .twSNP-label { font-size: 12px; margin: 4px 0 2px 0; display: block; }
    .twSNP-input, .twSNP-select { width: 100%; padding: 4px; margin-bottom: 6px; font-size: 12px; border-radius: 4px; border: 1px solid #654321; background:#3a3a3a; color:#f1e1c1; }
    #twSNP-resultado { margin-top:8px; padding:6px; border:1px solid #654321; border-radius:6px; background:#3a3a3a; font-size:12px; }
    #twSNP-contador { margin-top:6px; padding:6px; border:1px solid #99c; border-radius:6px; background:#223; font-size:12px; text-align:center; }
    `;
    document.head.appendChild(style);

    // === HTML painel ===
    let painel = document.createElement("div");
    painel.id = "twSNP-painel";
    painel.innerHTML = `
        <div id="twSNP-toggle">⚔️</div>
        <div id="twSNP-conteudo">
            <h4>Snipe Cancelamento</h4>
            <label class="twSNP-label"><b>Hora de chegada:</b></label>
            <input type="time" step="1" id="twSNP-hora" class="twSNP-input" value="12:00:00"/>
            
            <label class="twSNP-label"><b>Tempo de viagem:</b></label>
            <select id="twSNP-tempo" class="twSNP-select">
                ${Array.from({length: 20}, (_, i) => {
                    let min = 20 - i;
                    return `<option value="${min}">${min} minuto${min>1?"s":""}</option>`;
                }).join("")}
                <option value="0.5">30 segundos</option>
            </select>
            
            <button class="twSNP-btn" onclick="window.twSNP_calcular()">📌 Calcular</button>
            <div id="twSNP-resultado"></div>
            <div id="twSNP-contador"></div>
        </div>
    `;
    document.body.appendChild(painel);

    // === Toggle do painel ===
    document.getElementById("twSNP-toggle").addEventListener("click", () => {
        painel.classList.toggle("ativo");
    });

    // === Função cálculo ===
    window.twSNP_calcular = function () {
        let chegadaStr = document.getElementById("twSNP-hora").value;
        let tempo = parseFloat(document.getElementById("twSNP-tempo").value);

        if (!chegadaStr) {
            UI.ErrorMessage("Defina a hora de chegada!");
            return;
        }

        let [h, m, s] = chegadaStr.split(":").map(Number);
        let chegada = new Date();
        chegada.setHours(h, m, s, 0);

        let viagemSeg = tempo * 60;
        let enviar = new Date(chegada.getTime() - viagemSeg * 1000);
        let cancelar = new Date(chegada.getTime() - (viagemSeg / 2) * 1000);

        function formatar(data) {
            return data.toTimeString().split(" ")[0];
        }

        document.getElementById("twSNP-resultado").innerHTML = `
            🟢 ENVIAR: <b style="color:lime;">${formatar(enviar)}</b><br>
            🔴 CANCELAR: <b style="color:red;">${formatar(cancelar)}</b>
        `;

        if (contadorInterval) clearInterval(contadorInterval);

        contadorInterval = setInterval(() => {
            let agora = new Date();
            let faltaEnviar = Math.floor((enviar - agora) / 1000);
            let faltaCancelar = Math.floor((cancelar - agora) / 1000);

            function formatSegundos(seg) {
                if (seg < 0) return "✔ já passou";
                let mm = Math.floor(seg / 60);
                let ss = seg % 60;
                return `${mm.toString().padStart(2,"0")}:${ss.toString().padStart(2,"0")}`;
            }

            document.getElementById("twSNP-contador").innerHTML = `
                ⏳ Até ENVIAR: <b style="color:lime;">${formatSegundos(faltaEnviar)}</b><br>
                ⏳ Até CANCELAR: <b style="color:red;">${formatSegundos(faltaCancelar)}</b>
            `;

            if (faltaCancelar < -5) clearInterval(contadorInterval);
        }, 500);
    };
})();
