window.contarTropasPorGrupo = async function (groupId) {
  const destino = game_data.link_base_pure + "overview_villages&mode=units&type=complete&group=" + groupId;

  if (!location.href.includes("overview_villages") || !location.href.includes("mode=units")) {
    UI.InfoMessage("Redirecionando para visão de tropas...");
    location.href = destino;
    return;
  }

  // Aguarda a tabela de tropas carregar
  await new Promise(res => setTimeout(res, 500));

  const unidade = ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob"];
  const quantidade = {};
  unidade.forEach(u => quantidade[u] = 0);

  document.querySelectorAll("#units_table tbody tr").forEach(row => {
    row.querySelectorAll("td.unit-item").forEach((cell, i) => {
      const val = parseInt(cell.textContent.replace(/\D/g, ""), 10);
      if (!isNaN(val)) quantidade[unidade[i]] += val;
    });
  });

  let resultado = `<h3>Total de Tropas</h3><table class="vis"><tr>`;
  unidade.forEach(u => resultado += `<th><img src="/graphic/unit/unit_${u}.png"></th>`);
  resultado += `</tr><tr>`;
  unidade.forEach(u => resultado += `<td style="text-align:center;">${quantidade[u]}</td>`);
  resultado += `</tr></table>`;

  Dialog.show("total_tropas_result", resultado);
};
