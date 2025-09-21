(function () {
    let contadorInterval = null;

    // === CSS do painel ===
    let style = document.createElement("style");
    style.textContent = `
    #twSNP-painel { 
      position: fixed; top: 150px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none; 
      border-radius: 0 12px 12px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
      z-index: 9997; transition: transform 0.3s ease-in-out; transform: translateX(-220px); 
    }
    #twSNP-toggle { 
      position: absolute; top: 0; right: -32px; width: 32px; height: 44px; background: #5c4023; 
      border: 2px solid #654321; border-left: none; border-radius: 0 8px 8px 0; color: #f1e1c1; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; 
    }
    #twSNP-conteudo { padding: 10px; width: 200px; }
    #twSNP-conteudo h4 { margin: 0 0 10px 0; font-size: 14px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 6px; }
    
    .twSNP-label { font-size: 12px; margin: 6px 0 2px 0; display: block; font-weight: bold; }
    .twSNP-input, .twSNP-select {
      width: 100%; 
      box-sizing: border-box; 
      padding: 6px; 
      margin-bottom: 8px; 
      font-size: 12px; 
      border-radius: 6px; 
      border: 1px solid #654321; 
      background:#3a3a3a; 
      color:#f1e1c1; 
      display: block;
    }
    .twSNP-input::-webkit-calendar-picker-indicator {
      filter: invert(80%);
      cursor: pointer;
    }
    
    .twSNP-btn { display: block; width: 100%; margin: 8px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 8px; 
      color: #f1e1c1; padding: 8px; cursor: pointer; font-size: 13px; font-weight: bold; text-align: center; transition: 0.2s; }
    .twSNP-btn:hover { filter: brightness(1.15); transform: scale(1.03); }
    
    #twSNP-painel.ativo { transform: translateX(0); }
    
    #twSNP-resultado, #twSNP-contador {
      margin-top:10px; padding:8px; border:1px solid #654321; border-radius:8px; background:#3a3a3a; font-size:12px; 
    }
    #twSNP-resultado b { font-size: 13px; }
    #twSNP-contador { background:#22263a; border-color:#556; }
    `;
    document.head.appendChild(style);

    // === HTML painel ===
    let painel = document.createElement("div");
    painel.id = "twSNP-painel";
    painel.innerHTML = `
        <div id="twSNP-toggle">⚔️</div>
        <div id="twSNP-conteudo">
            <h4>🎯 Snipe Cancelamento</h4>
            
            <label class="twSNP-label">Hora de chegada:</label>
            <input type="time" step="1" id="twSNP-hora" class="twSNP-input" value="12:00:00"/>
            
            <label class="twSNP-label">Tempo de viagem:</label>
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


