this.serverData = [];
this.churchRadius = [4, 6, 8];
var currentFields = 0;
var maxFields = 99;

cssClassesChurch = `
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
</style>
`;
$("#contentContainer").eq(0).prepend(cssClassesChurch);
$("#mobileHeader").eq(0).prepend(cssClassesChurch);

html = `
<div>
  <form id="ChurchData">
    <table class="churchHeader">
      <tr class="churchHeader">
        <td class="churchHeader">Coordinate</td>
        <td class="churchHeader">Church level</td>
        <td class="churchHeader">Remove</td>
      </tr>
      <tr id="addButton" class="churchRowA">
        <td colspan="3">
          <center>
            <a href="javascript:void(0);" class="add_button" title="Add field">
              <img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/>
            </a>
          </center>
        </td>
      </tr>
      <tr id="calculate" class="churchRowB">
        <td colspan="3" align="right">
          <button type="button" id="save" class="btn-confirm-yes" onclick="saveData()">Save list</button>
          <button type="button" id="calculate" class="btn-confirm-yes" onclick="makeMap()">Display</button>
        </td>
      </tr>
      <tr id="importCoords" class="churchHeader">
        <td colspan="3">
          <textarea id="coordinates" cols="30" rows="10" placeholder="Enter coordinates here"></textarea>
        </td>
      </tr>
      <tr>
        <td colspan="3" align="right">
          <button type="button" id="import" class="btn-confirm-yes" onclick="importCoords()">Import coords</button>
        </td>
      </tr>
    </table>
  </form>
</div>
`;
$("#contentContainer tr").eq(0).prepend("<td style='display: inline-block;vertical-align: top;'>" + html + "</td>");

$(".add_button").click(function () {
  addRow("");
});

$('table.churchHeader').on('click', '#removeRow', function () {
  $(this).closest('tr').remove();
});

if (localStorage.getItem("churchData") == null) {
  console.log("No church data found, create");
  this.serverData = [];
  localStorage.setItem("churchData", JSON.stringify(serverData));
} else {
  this.serverData = JSON.parse(localStorage.getItem("churchData"));
  for (var i = 0; i < serverData.length; i++) {
    addRow(serverData[i].village, serverData[i].church);
  }
}

function makeMap() {
  serverData = [];
  tempData = $("#ChurchData :input").serializeArray();
  for (var i = 0; i < tempData.length; i += 2) {
    serverData.push({ village: tempData[i].value, church: parseInt(tempData[i + 1].value) });
  }

  var mapOverlay = TWMap;

  function drawChurches(canvas, sector) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.lineWidth = 1;

    for (let i = 0; i < serverData.length; i++) {
      var level = serverData[i].church;
      if (level > 0 && level <= 3) {
        var coord = serverData[i].village.split('|');
        var radius = this.churchRadius[level - 1] * TWMap.map.scale[0];

        var center = TWMap.map.coordByTile(coord[0], coord[1]);
        var sectorOrigin = TWMap.map.coordByTile(sector.x, sector.y);
        var x = (center[0] - sectorOrigin[0]) + TWMap.tileSize[0] / 2;
        var y = (center[1] - sectorOrigin[1]) + TWMap.tileSize[1] / 2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = "#0000FF";
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
      }
    }
  }

  if (!mapOverlay.mapHandler._spawnSectorChurch) {
    mapOverlay.mapHandler._spawnSectorChurch = mapOverlay.mapHandler.spawnSector;
  }

  mapOverlay.mapHandler.spawnSector = function (data, sector) {
    mapOverlay.mapHandler._spawnSectorChurch(data, sector);

    var el = $('#mapOverlay_canvas_' + sector.x + '_' + sector.y);
    if (!el.length) {
      var canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.width = mapOverlay.map.scale[0] * mapOverlay.map.sectorSize;
      canvas.height = mapOverlay.map.scale[1] * mapOverlay.map.sectorSize;
      canvas.className = 'mapOverlay_church_canvas';
      canvas.id = 'mapOverlay_canvas_' + sector.x + '_' + sector.y;
      canvas.style.zIndex = 10;
      sector.appendElement(canvas, 0, 0);
      drawChurches(canvas, sector);
    }
  };

  mapOverlay.reload();
}

function importCoords() {
  coords = $("#coordinates").val().replace(/[\n ]+/g, ',').split(',');
  for (var i = 0; i < coords.length; i++) {
    if (coords[i]) addRow(coords[i], 1);
  }
}

function addRow(coord, level) {
  if (currentFields >= maxFields) return;
  currentFields++;
  var tempClass = currentFields % 2 === 0 ? "churchRowB" : "churchRowA";

  $(`<tr class="${tempClass}">
    <td><center><input type="text" name="village" size="7" placeholder="xxx|yyy" value="${coord}" /></center></td>
    <td><center><input type="number" name="church" size="6" min="1" max="3" value="${level}" /></center></td>
    <td><center><span id="removeRow"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png" title="Remove" /></span></center></td>
  </tr>`).insertBefore($("#addButton")[0]);

  if (currentFields >= maxFields) {
    $("#addButton").hide();
  }
}

function saveData() {
  serverData = [];
  tempData = $("#ChurchData :input").serializeArray();
  for (var i = 0; i < tempData.length; i += 2) {
    serverData.push({ village: tempData[i].value, church: parseInt(tempData[i + 1].value) });
  }
  localStorage.setItem("churchData", JSON.stringify(serverData));
}
