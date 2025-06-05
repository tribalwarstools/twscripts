select.addEventListener("change", async function () {
  const groupId = this.value;
  if (!groupId) return;
  localStorage.setItem(STORAGE_KEY, groupId);
  $("#groupVillages").html("<i>Carregando aldeias...</i>");
  $("#villageCount").text("");

  const response = await $.post("/game.php?screen=groups&ajax=load_villages_from_group", { group_id: groupId });
  const doc = new DOMParser().parseFromString(response.html, "text/html");
  const rows = doc.querySelectorAll("#group_table tbody tr");

  if (!rows.length) {
    $("#groupVillages").html("<p><i>Nenhuma aldeia no grupo.</i></p>");
    $("#villageCount").text("0 aldeias");
    return;
  }

  // Função para criar a barra de progresso
  function createProgressBar(value, max) {
    const percent = Math.min((value / max) * 100, 100);
    return `
      <div style="background:#ddd; width: 90px; height: 16px; border-radius: 6px; overflow: hidden; position: relative;">
        <div style="background:#4caf50; width: ${percent}%; height: 100%;"></div>
        <div style="position: absolute; width: 100%; text-align: center; top: 0; left: 0; font-size: 12px; font-weight: bold; color: #000;">
          ${value.toLocaleString()}
        </div>
      </div>
    `;
  }

  let output = `<table class="vis" width="100%">
    <thead><tr><th>Nome</th><th style="width:90px;">Coord</th><th style="width:120px;">Pontos</th><th>Ações</th></tr></thead><tbody>`;
  let total = 0;
  const MAX_POINTS = 12000;

  rows.forEach(row => {
    const tds = row.querySelectorAll("td");
    if (tds.length >= 2) {
      const name = tds[0].textContent.trim();
      const coords = tds[1].textContent.trim();
      const id = coordToId[coords];
      const points = coordToPoints[coords] || 0;
      const link = id ? `<a href="/game.php?village=${id}&screen=overview" target="_blank">${name}</a>` : name;

      output += `<tr>
        <td>${link}</td>
        <td><span class="coord-val">${coords}</span></td>
        <td>${createProgressBar(points, MAX_POINTS)}</td>
        <td><button class="btn copy-coord" data-coord="${coords}">📋</button></td>
      </tr>`;
      total++;
    }
  });

  output += "</tbody></table>";
  $("#groupVillages").html(`<button id="copyAllCoords" class="btn" style="margin-bottom:5px;">📋 Copiar todas as coordenadas</button>${output}`);
  $("#villageCount").text(`${total} aldeias`);

  $(".copy-coord").on("click", function () {
    const coord = $(this).data("coord");
    navigator.clipboard.writeText(coord);
    UI.SuccessMessage(`Coordenada ${coord} copiada!`);
  });

  $("#copyAllCoords").on("click", function () {
    const coords = [...document.querySelectorAll(".coord-val")].map(el => el.textContent.trim()).join(" ");
    navigator.clipboard.writeText(coords);
    UI.SuccessMessage("Todas as coordenadas copiadas!");
  });
});
