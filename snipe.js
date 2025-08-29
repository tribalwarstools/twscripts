(function () {
    // Função para abrir painel
    function abrirPainelSnipe() {
        let html = `
            <div style="padding:10px;">
                <h3>Snipe por Cancelamento</h3>
                <p><b>Hora de chegada do ataque inimigo:</b></p>
                <input type="time" step="1" id="horaChegada" value="12:00:00"/>
                
                <p style="margin-top:10px;"><b>Tempo de viagem:</b></p>
                <select id="tempoViagem">
                    <option value="20">20 minutos</option>
                    <option value="15">15 minutos</option>
                    <option value="10">10 minutos</option>
                    <option value="5">5 minutos</option>
                    <option value="2">2 minutos</option>
                    <option value="1">1 minuto</option>
                    <option value="0.5">30 segundos</option>
                </select>
                
                <div style="margin-top:15px;">
                    <button class="btn" onclick="calcularSnipe()">Calcular</button>
                </div>
                
                <div id="resultadoSnipe" style="margin-top:15px; font-weight:bold;"></div>
            </div>
        `;

        Dialog.show("snipeCancelamento", html);
    }

    // Função de cálculo
    window.calcularSnipe = function () {
        let chegadaStr = document.getElementById("horaChegada").value;
        let tempo = parseFloat(document.getElementById("tempoViagem").value);

        if (!chegadaStr) {
            UI.ErrorMessage("Defina a hora de chegada!");
            return;
        }

        // Parse hora chegada
        let [h, m, s] = chegadaStr.split(":").map(Number);
        let chegada = new Date();
        chegada.setHours(h, m, s, 0);

        // Converter tempo viagem em segundos
        let viagemSeg = tempo * 60;
        if (tempo < 1) viagemSeg = tempo * 60; // ex: 0.5 min = 30s

        // Calcular horários
        let enviar = new Date(chegada.getTime() - viagemSeg * 1000);
        let cancelar = new Date(chegada.getTime() - (viagemSeg / 2) * 1000);

        function formatar(data) {
            return data.toTimeString().split(" ")[0];
        }

        document.getElementById("resultadoSnipe").innerHTML =
            `ENVIAR: <span style="color:green;">${formatar(enviar)}</span><br>
             CANCELAR: <span style="color:red;">${formatar(cancelar)}</span>`;
    };

    // Abre painel
    abrirPainelSnipe();
})();
