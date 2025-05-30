(function() {
    // HTML do conteúdo
    const htmlContent = `
    <div style="background-color: #fff5da; border: 2px solid #7d510f; box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3); padding: 20px; max-width: 400px; width: 100%; text-align: center; border-radius: 8px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;">
        <h2 style="font-size: 18pt; color: #603000; margin-bottom: 15px;">Snip por Cancelamento</h2>
        
        <div id="alert-box" style="padding: 10px 14px; margin-bottom: 15px; border-radius: 6px; font-size: 10pt; font-family: Verdana, Arial; color: #4a2c00; background-color: #fceec1; border: 1px solid #c9a75c; box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1); display: none; position: relative; text-align: left;"></div>

        <label for="arrival-time" style="font-weight: bold; display: block; margin: 10px 0 5px; color: #4a2c00;">Hora de chegada do ataque (hh:mm:ss):</label>
        <input type="text" id="arrival-time" placeholder="00:00:00" style="padding: 8px; width: 100%; font-size: 1em; border: 1px solid #7d510f; background-color: #f8f4e8; border-radius: 4px; box-sizing: border-box;">
        
        <button id="calculate-btn" style="display: block; width: 100%; padding: 10px; margin-top: 10px; font-size: 1em; font-weight: bold; color: #fff; background: linear-gradient(to bottom, #947a62 0%, #6c4824 100%); border: 1px solid #000; border-radius: 5px; cursor: pointer;">Calcular</button>
        <button id="clear-btn" style="display: block; width: 100%; padding: 10px; margin-top: 10px; font-size: 1em; font-weight: bold; color: #fff; background: linear-gradient(to bottom, #947a62 0%, #6c4824 100%); border: 1px solid #000; border-radius: 5px; cursor: pointer;">Limpar</button>

        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="background-color: #c1a264; color: #000; padding: 8px;">Tempo (minutos)</th>
              <th style="background-color: #c1a264; color: #000; padding: 8px;">Hora de envio</th>
              <th style="background-color: #c1a264; color: #000; padding: 8px;">Hora de cancelamento</th>
            </tr>
          </thead>
          <tbody id="result-table"></tbody>
        </table>
    </div>
    `;

    // Inserindo o HTML diretamente no corpo da página
    const container = document.createElement("div");
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Função para mostrar alerta
    function showAlert(message) {
        const alertBox = document.getElementById("alert-box");
        alertBox.innerHTML = `${message} <span class="close-btn" onclick="this.parentElement.style.display='none';">&times;</span>`;
        alertBox.style.display = "block";
    }

    // Função para calcular os tempos
    function calculateTimes() {
        const arrivalTimeInput = document.getElementById("arrival-time").value;
        if (!arrivalTimeInput) {
            showAlert("⚠️ Por favor, insira a hora de chegada do ataque.");
            return;
        }

        const timeParts = arrivalTimeInput.split(":");
        if (timeParts.length !== 3) {
            showAlert("⏰ Por favor, insira a hora no formato HH:MM:SS.");
            return;
        }

        const [hours, minutes, seconds] = timeParts.map(Number);

        if (
            isNaN(hours) || isNaN(minutes) || isNaN(seconds) ||
            hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59
        ) {
            showAlert("❌ Hora inválida. Certifique-se de inserir valores válidos para hh:mm:ss.");
            return;
        }

        const now = new Date();
        now.setHours(hours, minutes, seconds, 0);

        const times = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2]; // Intervalos
        const resultTable = document.getElementById("result-table");
        resultTable.innerHTML = ""; // Limpa resultados anteriores

        times.forEach(time => {
            const sendTime = new Date(now.getTime() - time * 60000); // Hora de envio
            const cancelTime = new Date(now.getTime() - time * 30000); // Hora de cancelamento

            const sendTimeFormatted = sendTime.toLocaleTimeString("pt-BR");
            const cancelTimeFormatted = cancelTime.toLocaleTimeString("pt-BR");

            const row = `
                <tr>
                    <td>${time}</td>
                    <td>${sendTimeFormatted}</td>
                    <td>${cancelTimeFormatted}</td>
                </tr>
            `;
            resultTable.innerHTML += row;
        });
    }

    // Função para limpar os campos
    function limparCampos() {
        document.getElementById("arrival-time").value = "";
        document.getElementById("result-table").innerHTML = "";
        document.getElementById("alert-box").style.display = "none";
    }

    // Event listeners para os botões
    document.getElementById("calculate-btn").addEventListener("click", calculateTimes);
    document.getElementById("clear-btn").addEventListener("click", limparCampos);

})();
