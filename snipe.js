(function () {
    let contadorInterval = null;

    function abrirPainelSnipe() {
        let html = `
            <div style="padding:10px; min-width:280px; font-size:13px;">
                <h3 style="margin-bottom:8px;">⚔️ Snipe por Cancelamento</h3>
                
                <div style="margin-bottom:10px;">
                    <label><b>Hora de chegada:</b></label><br>
                    <input type="time" step="1" id="horaChegada" value="12:00:00" 
                           style="padding:3px; width:130px; margin-top:3px;"/>
                </div>
                
                <div style="margin-bottom:12px;">
                    <label><b>Tempo de viagem:</b></label><br>
                    <select id="tempoViagem" style="padding:3px; margin-top:3px;">
                        ${Array.from({length: 20}, (_, i) => {
                            let min = 20 - i;
                            return `<option value="${min}">${min} minuto${min>1?"s":""}</option>`;
                        }).join("")}
                        <option value="0.5">30 segundos</option>
                    </select>
                </div>
                
                <div style="margin-bottom:15px;">
                    <button class="btn" style="font-weight:bold;" onclick="calcularSnipe()">📌 Calcular</button>
                </div>
                
                <div id="resultadoSnipe" style="margin-top:10px; padding:8px; border:1px solid #ccc; border-radius:5px; background:#f9f9f9; font-size:14px;"></div>
                
                <div id="contadorSnipe" style="margin-top:12px; padding:8px; border:1px solid #99c; border-radius:5px; background:#eef; font-size:14px; text-align:center;"></div>
            </div>
        `;

        Dialog.show("snipeCancelamento", html);
    }

    window.calcularSnipe = function () {
        let chegadaStr = document.getElementById("horaChegada").value;
        let tempo = parseFloat(document.getElementById("tempoViagem").value);

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

        document.getElementById("resultadoSnipe").innerHTML = `
            <div style="margin-bottom:5px;">🟢 ENVIAR: 
                <span style="color:green; font-size:16px; font-weight:bold;">${formatar(enviar)}</span>
            </div>
            <div>🔴 CANCELAR: 
                <span style="color:red; font-size:16px; font-weight:bold;">${formatar(cancelar)}</span>
            </div>
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

            document.getElementById("contadorSnipe").innerHTML = `
                ⏳ Até ENVIAR: <b style="color:green;">${formatSegundos(faltaEnviar)}</b><br>
                ⏳ Até CANCELAR: <b style="color:red;">${formatSegundos(faltaCancelar)}</b>
            `;

            if (faltaCancelar < -5) clearInterval(contadorInterval);
        }, 500);
    };

    abrirPainelSnipe();
})();
