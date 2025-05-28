// VARIÁVEIS GLOBAIS
window.churchData = [];
window.churchRadius = [4, 6, 8];
let currentFields = 0;
const maxFields = 99;

// ESTILO
const cssChurch = `
<style>
.churchRowA {
  background-color: #32353b;
  color: white;
}
.churchRowB {
  background-color: #36393f;
  color: white;
}
.churchHeader {
  background-color: #202225;
  font-weight: bold;
  color: white;
}
</style>`;
$("#contentContainer").eq(0).prepend(cssChurch);
$("#mobileHeader").eq(0).prepend(cssChurch);

// HTML
const html = `
<div>
  <form id="ChurchData">
    <table class="churchHeader">
      <tr class="churchHeader">
        <td>Coord</td>
        <td>Nível</td>
        <td>Remover</td>
      </tr>
      <tr id="addChurchButton" class="churchRowA">
        <td colspan="3"><center><a href="#" class="add_church_button"><img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/></a></center></td>
      </tr>
      <tr class="churchRowB">
        <td colspan="3" align="right">
          <button type="button" class="btn-confirm-yes" onclick="saveChurchData()">Salvar</button>
          <button type="button" class="btn-confirm-yes" onclick="drawChurchMap()">Mostrar</button>
        </td>
      </tr>
      <tr class="churchHeader">
        <td colspan="3"><textarea id="churchCoordinates" cols="30" rows="10" placeholder="Insira coordenadas aqui"></textarea></td>
      </tr>
      <tr>
        <td colspan="3" align="right"><button type="button" class="btn-confirm-yes" onclick="importChurchCoords()">Importar</button></td>
      </tr>
    </table>
  </form>
</div>`;
$("#contentContainer tr").eq(0).prepend(`<td style='vertical-align: top;'>${html}</td>`);

// EVENTOS
$(".add_church_button").click(() => addChurchRow(""));

$('table.churchHeader').on('click', '#removeRow', function () {
  $(this).closest('tr').remove();
});

// CARREGAR DADOS
if (localStorage.getItem("churchData") !== null) {
  window.churchData = JSON.parse(localStorage.getItem("churchData"));
  for (let entry of window.churchData) {
    addChurchRow(entry.village, entry.church);
  }
}

// FUNÇÕES
function addChurchRow(coord = "", level = 1) {
  if (currentFields >= maxFields) return;
  currentFields++;
  const rowClass = currentFields % 2 === 0 ? "churchRowB" : "churchRowA";
  const row = `
    <tr class="${rowClass}">
      <td><center><input type="text" name="village" size="7" placeholder="xxx|yyy" value="${coord}"/></center></td>
      <td><center><input type="number" name="church" min="1" max="3" value="${level}"/></center></td>
      <td><center><span id="removeRow"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png"></span></center></td>
    </tr>`;
  $(row).insertBefore($("#addChurchButton"));
}

function importChurchCoords() {
  let coords = $("#churchCoordinates").val().replace(/\s+/g, ",").split(",");
  coords.forEach(coord => {
    if (coord.match(/^\d{3}\|\d{3}$/)) addChurchRow(coord.trim(), 1);
  });
}

function saveChurchData() {
  const inputs = $("#ChurchData :input").serializeArray();
  window.churchData = [];
  for (let i = 0; i < inputs.length; i += 2) {
    window.churchData.push({
      village: inputs[i].value,
      church: parseInt(inputs[i + 1].value)
    });
  }
  localStorage.setItem("churchData", JSON.stringify(window.churchData));
}

function drawChurchMap() {
  const map = TWMap;
  const overlayClass = "church_canvas";

  $("canvas." + overlayClass).remove();

  if (!map.mapHandler._spawnChurchBackup) {
    map.mapHandler._spawnChurchBackup = map.mapHandler.spawnSector;
  }

  map.mapHandler.spawnSector = function (data, sector) {
    map.mapHandler._spawnChurchBackup(data, sector);

    const canvas = document.createElement("canvas");
    canvas.width = map.map.scale[0] * map.map.sectorSize;
    canvas.height = map.map.scale[1] * map.map.sectorSize;
    canvas.className = overlayClass;
    canvas.style.position = "absolute";
    canvas.style.zIndex = 10;

    const ctx = canvas.getContext("2d");

    for (const { village, church } of window.churchData) {
      const [vx, vy] = village.split("|").map(Number);
      const radius = window.churchRadius[church - 1] * map.map.scale[0];

      const pixel = map.map.pixelByCoord(vx, vy);
      const sectorPixel = map.map.pixelByCoord(sector.x, sector.y);
      const x = (pixel[0] - sectorPixel[0]) + map.tileSize[0] / 2;
      const y = (pixel[1] - sectorPixel[1]) + map.tileSize[1] / 2;

      ctx.beginPath();
      ctx.strokeStyle = '#0055FF';
      ctx.fillStyle = 'rgba(0, 85, 255, 0.2)';
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
    }

    sector.appendElement(canvas, 0, 0);
  };

  map.reload();
}
