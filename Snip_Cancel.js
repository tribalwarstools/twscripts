(function() {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Snip por Cancelamento</title>
      <style>
        body {
          font-family: Verdana, Arial;
          background-color: #d2c09e;
          background-image: url('https://dsbr.innogamescdn.com/asset/50c88b8e/graphic/background/bg-image.webp');
          background-size: cover;
          background-attachment: fixed;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 120vh;
          margin: 0;
          padding: 20px;
        }

        .container {
          background-color: #fff5da;
          border: 2px solid #7d510f;
          box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3);
          padding: 20px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          border-radius: 8px;
        }

        h2 {
          font-size: 18pt;
          color: #603000;
          margin-bottom: 15px;
        }

        label {
          font-weight: bold;
          display: block;
          margin: 10px 0 5px;
          color: #4a2c00;
        }

        input[type="text"] {
          padding: 8px;
          width: 100%;
          font-size: 1em;
          border: 1px solid #7d510f;
          background-color: #f8f4e8;
          border-radius: 4px;
          box-sizing: border-box;
        }

        button {
          display: block;
          width: 100%;
          padding: 10px;
          margin-top: 10px;
          font-size: 1em;
          font-weight: bold;
          color: #fff;
          background: linear-gradient(to bottom, #947a62 0%, #6c4824 100%);
          border: 1px solid #000;
          border-radius: 5px;
          cursor: pointer;
        }

        button:hover {
          background: linear-gradient(to bottom, #b69471 0%, #6c4d2d 100%);
        }

        table {
          width: 100%;
          margin-top: 20px;
          border-collapse: collapse;
        }

        table, th, td {
          border: 1px solid #7d510f;
          font-size: 10pt;
          font-family: Verdana, Arial;
        }

        th {
          background-color: #c1a264;
          background-image: url('https://dsbr.innogamescdn.com/asset/50c88b8e/graphic/screen/tableheader_bg3.webp');
          color: #000;
          padding: 8px;
        }

        td {
          padding: 8px;
        }

        tbody tr:nth-child(even) td {
          background-color: #f0e2be;
        }

        tbody tr:nth-child(odd) td {
          background-color: #fff5da;
        }

        @media (max-width: 500px) {
          .container {
            padding: 15px;
          }

          h2 {
            font-size: 1.2em;
          }
        }

        /* Alerta visual */
        #alert-box {
          padding: 10px 14px;
          margin-bottom: 15px;
          border-radius: 6px;
          font-size: 10pt;
          font-family: Verdana, Arial;
          color: #4a2c00;
          background-color: #fceec1;
          border: 1px solid #c9a75c;
          box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);
          display: none;
          position: relative;
          text-align: left;
        }

        #alert-box .close-btn {
          position: absolute;
          top: 5px;
          right: 10px;
          cursor: pointer;
          font-weight: bold;
          color: #7d510f;
          font-size: 14px;
        }

      </style>
    </head>
    <body>
      <div class="container">
        <h2>Snip por Cancelamento</h2>
        
        <div id="alert-box"></div>

        <label for="arrival-time">Hora de chegada do ataque (hh:mm:ss):</label>
        <input type="text" id="arrival-time" placeholder="00:00:00">
        
        <button onclick="calculateTimes()">Calcular</button>
        <button onclick="limparCampos()">Limpar</button>

        <table>
          <thead>
            <tr>
              <th>Tempo (minutos)</th>
              <th>Hora de envio</th>
              <th>Hora de cancelamento</th>
            </tr>
          </thead>
          <tbody id="result-table"></tbody>
        </table>
      </div>

      <script>
        function showAlert(message) {
          const alertBox = document.getElementById("alert-box");
          alertBox.innerHTML = \`
            \${message}
            <span class="close-btn" onclick="this.parentElement.style.display='none';">&times;</span>
          \`;
          alertBox.style.display = "block";
        }

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

          const times = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2]; 
          const resultTable = document.getElementById("result-table");
          resultTable.innerHTML = "";
          document.getElementById("alert-box").style.display = "none"; // Esconde o alerta se estava visível

          times.forEach(time => {
            const sendTime = new Date(now.getTime() - time * 60000);
            const cancelTime = new Date(now.getTime() - time * 30000);

            const sendTimeFormatted = sendTime.toLocaleTimeString("pt-BR");
            const cancelTimeFormatted = cancelTime.toLocaleTimeString("pt-BR");

            const row = \`
              <tr>
                <td>\${time}</td>
                <td>\${sendTimeFormatted}</td>
                <td>\${cancelTimeFormatted}</td>
              </tr>
            \`;
            resultTable.innerHTML += row;
          });
        }

        function limparCampos() {
          document.getElementById("arrival-time").value = "";
          document.getElementById("result-table").innerHTML = "";
          document.getElementById("alert-box").style.display = "none";
        }
      </script>
    </body>
    </html>
  `;

  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  document.body.appendChild(container);
})();
