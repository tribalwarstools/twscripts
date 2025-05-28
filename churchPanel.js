// Church Panel for Tribal Wars
this.serverData = [];
this.churchRadius = [4, 6, 8]; // Nível 1 = 4, Nível 2 = 6, Nível 3 = 8 quadrantes

let currentFields = 0;
const maxFields = 99;

const css = `
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

$('#contentContainer').eq(0).prepend(css);
$('#mobileHeader').eq(0).prepend(css);

const html = `
<div>
  <form id="ChurchData">
    <table class="churchHeader">
      <tr class="churchHeader">
        <td class="churchHeader">Coordinate</td>
        <td class="churchHeader">Church level</td>
        <td class="churchHeader">Remove</td>
      </tr>
      <tr id="addButton" class="churchRowA">
        <td colspan="4">
          <center>
            <a href="javascript:void(0);" class="add_button" title="Add field">
              <img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20" />
            </a>
          </center>
        </td>
      </tr>
      <tr id="calculate" class="churchRowB">
        <td colspan="4" align="right">
          <button type="button" id="save" class="btn-confirm-yes" onclick="saveData()">Save list</button>
          <button type="button" id="calculate" class="btn-confirm-yes" onclick="makeMap()">Display</button>
        </td>
      </tr>
      <tr id="importCoords" class="churchHeader">
        <td colspan="4">
          <textarea id="coordinates" cols="30" rows="12" placeholder="Enter coordinates here"></textarea>
        </td>
      </tr>
      <tr>
        <td colspan="4" align="right">
          <button type="button" id="import" class="btn-confirm-yes" onclick="importCoords()">Import coords</button>
        </td>
      </tr>
    </table>
  </form>
</div>`;

$('#contentContainer tr').eq(0).prepend(`<td style='display: inline-block;vertical-align: top;'>${html}</td>`);

$('.add_button').click(() => addRow(""));

$('table.churchHeader').on('click', '#removeRow', function () {
  $(this).closest('tr').remove();
});

if (localStorage.getItem("churchData") == null) {
  this.serverData = [];
  localStorage.setItem("churchData", JSON.stringify(serverData));
} else {
  this.serverData = JSON.parse(localStorage.getItem("churchData"));
  for (let i = 0; i < serverData.length; i++) {
    addRow(serverData[i].village, serverData[i].church);
  }
}

function makeMap() {
  serverData = [];
  const tempData = $("#ChurchData :input").serializeArray();
  for (let i = 0; i < tempData.length; i += 2) {
    serverData.push({ village: tempData[i].value, church: parseInt(tempData[i + 1].value) });
  }

  TWMap.map._churchOverlay = TWMap.map._churchOverlay || [];
  for (const overlay of TWMap.map._churchOverlay) {
    overlay.remove();
  }
  TWMap.map._churchOverlay = [];

  for (const entry of serverData) {
    const coords = entry.village.split('|');
    const level = parseInt(entry.church);
    if (coords.length !== 2 || level < 1 || level > 3) continue;

    const [x, y] = coords.map(Number);
    const radius = this.churchRadius[level - 1];

    const overlay = TWMap.map.addOverlayCircle(
      [x, y],
      radius,
      {
        fillColor: 'rgba(0,0,255,0.15)',
        strokeColor: '#0000FF',
        strokeWidth: 2,
      }
    );

    TWMap.map._churchOverlay.push(overlay);
  }
}

function importCoords() {
  let coords = $('#coordinates').val();
  coords = coords.replace(/ /g, ",");
  coords = coords.replace(/\n/g, ",");
  coords = coords.split(',');
  for (let i = 0; i < coords.length; i++) {
    addRow(coords[i], 0);
  }
}

function addRow(coord, level) {
  if (currentFields < maxFields) {
    currentFields++;
    const tempClass = currentFields % 2 === 0 ? "churchRowB" : "churchRowA";
    $(`<tr class="${tempClass}">
      <td><center><input type="text" name="village" size="7" placeholder="xxx|yyy" value="${coord}"/></center></td>
      <td><center><input type="text" name="church" size="6" placeholder="Church level" value="${level}"/></center></td>
      <td><center><span id="removeRow"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png" title="removeRow"></span></center></td>
    </tr>`).insertBefore($('#addButton')[0]);

    if (currentFields >= maxFields) {
      $('#addButton').css('display', 'none');
    }
  }
}

function saveData() {
  serverData = [];
  const tempData = $('#ChurchData :input').serializeArray();
  for (let i = 0; i < tempData.length; i += 2) {
    serverData.push({ village: tempData[i].value, church: parseInt(tempData[i + 1].value) });
  }
  localStorage.setItem("churchData", JSON.stringify(serverData));
}
