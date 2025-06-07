function abrirJanelaTropas() {
  const unidades = [
    "spear", "sword", "axe", "archer", "spy",
    "light", "marcher", "heavy", "ram", "catapult",
    "knight", "snob"
  ];

  const nomesUnidades = {
    spear: "Lanceiro",
    sword: "Espadachim",
    axe: "Machado",
    archer: "Arqueiro",
    spy: "Espião",
    light: "Cav. Leve",
    marcher: "Arq. Cavalo",
    heavy: "Cav. Pesada",
    ram: "Ariete",
    catapult: "Catapulta",
    knight: "Paladino",
    snob: "Nobre"
  };

  let html = `<div class="vis"><table class="vis"><tbody>`;

  unidades.forEach(unidade => {
    html += `
      <tr>
        <td>${nomesUnidades[unidade]}</td>
        <td><input type="number" id="input_${unidade}" value="0" min="0" style="width:60px;"></td>
      </tr>
    `;
  });

  html += `</tbody></table>
    <center>
      <button class="btn btn-confirm-yes" id="btnSalvar">Salvar</button>
      <button class="btn" id="btnPreview">Visualizar</button>
    </center>
  </div>`;

  Dialog.show("janelaTropas", html);

  document.getElementById("btnSalvar").addEventListener("click", () => {
    let dados = {};
    unidades.forEach(unidade => {
      let valor = parseInt(document.getElementById(`input_${unidade}`).value) || 0;
      dados[unidade] = valor;
    });
    localStorage.setItem("tropasSalvas", JSON.stringify(dados));
    UI.InfoMessage("Tropas salvas com sucesso!");
  });

  document.getElementById("btnPreview").addEventListener("click", () => {
    let dados = localStorage.getItem("tropasSalvas");
    if (!dados) {
      UI.InfoMessage("Nenhum dado salvo.");
      return;
    }
    let tropas = JSON.parse(dados);
    let texto = "Tropas salvas:\n";
    for (const unidade in tropas) {
      texto += `${nomesUnidades[unidade]}: ${tropas[unidade]}\n`;
    }
    alert(texto);
  });
}
