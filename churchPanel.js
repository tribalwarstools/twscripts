this.churchData = [];
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
</style>`

$("#contentContainer").eq(0).prepend(cssClassesChurch);
$("#mobileHeader").eq(0).prepend(cssClassesChurch);

html = `
<div>
    <form id="ChurchData">
    <table class="churchHeader">
        <tr class="churchHeader">
            <td class="churchHeader">Coordinate</td>
            <td class="churchHeader">Church Level</td>
            <td class="churchHeader">Remove</td>
        </tr>
        <tr id="addChurchButton" class="churchRowA">
            <td colspan="4"><center><a href="javascript:void(0);" class="add_church_button"><img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/></a></center></td>
        </tr>
        <tr id="churchControls" class="churchRowB">
            <td colspan="4" align="right">
                <button type="button" class="btn-confirm-yes" onclick="saveChurchData()">Save</button>
                <button type="button" class="btn-confirm-yes" onclick="drawChurchMap()">Display</button>
            </td>
        </tr>
        <tr class="churchHeader">
            <td colspan="4"><textarea id="churchCoordinates" cols="30" rows="12" placeholder="Enter coordinates here"></textarea></td>
        </tr>
        <tr>
            <td colspan="4" align="right">
                <button type="button" class="btn-confirm-yes" onclick="importChurchCoords()">Import</button>
            </td>
        </tr>
    </table>
    </form>
</div>`;

$("#contentContainer tr").eq(0).prepend("<td style='display: inline-block;vertical-align: top;'>" + html + "</td>");

$(".add_church_button").click(() => addChurchRow(""));

$('table.churchHeader').on('click', '#removeRow', function () {
    $(this).closest('tr').remove();
})

if (localStorage.getItem("churchData") == null) {
    this.churchData = [];
    localStorage.setItem("churchData", JSON.stringify(churchData));
} else {
    this.churchData = JSON.parse(localStorage.getItem("churchData"));
    for (var i = 0; i < churchData.length; i++) {
        addChurchRow(churchData[i].village, churchData[i].church);
    }
}

function importChurchCoords() {
    let coords = $("#churchCoordinates").val().replace(/[\n ]/g, ",").split(',');
    for (let coord of coords) {
        if (coord.trim()) addChurchRow(coord.trim(), 1);
    }
}

function addChurchRow(coord, level = 1) {
    if (currentFields < maxFields) {
        currentFields++;
        let tempClass = currentFields % 2 === 0 ? "churchRowB" : "churchRowA";
        $(`<tr class="${tempClass}">
            <td><center><input type="text" name="village" size="7" placeholder="xxx|yyy" value="${coord}"/></center></td>
            <td><center><input type="number" name="church" size="6" min="1" max="3" value="${level}"/></center></td>
            <td><center><span id="removeRow"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png"></span></center></td>
        </tr>`).insertBefore($("#addChurchButton")[0]);
        if (currentFields >= maxFields) $("#addChurchButton").hide();
    }
}

function saveChurchData() {
    churchData = [];
    const data = $("#ChurchData :input").serializeArray();
    for (let i = 0; i < data.length; i += 2) {
        churchData.push({ village: data[i].value, church: parseInt(data[i + 1].value) });
    }
    localStorage.setItem("churchData", JSON.stringify(churchData));
}

function drawChurchMap() {
    const canvasIdPrefix = 'church_canvas_';
    $(".church_overlay").remove();

    const mapOverlay = TWMap;

    const drawChurchCircle = (ctx, x, y, radius) => {
        ctx.beginPath();
        ctx.strokeStyle = '#0033FF';
        ctx.fillStyle = 'rgba(0, 51, 255, 0.1)';
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
    };

    mapOverlay.mapHandler.spawnSector = (function (original) {
        return function (data, sector) {
            original.call(this, data, sector);

            for (let item of churchData) {
                let [vx, vy] = item.village.split('|').map(Number);
                let churchLevel = parseInt(item.church);
                let radius = churchRadius[churchLevel - 1] * TWMap.map.scale[0];

                let villagePixel = mapOverlay.map.pixelByCoord(vx, vy);
                let sectorPixel = mapOverlay.map.pixelByCoord(sector.x, sector.y);
                let canvas = document.createElement('canvas');
                canvas.className = 'church_overlay';
                canvas.style.position = 'absolute';
                canvas.style.zIndex = 10;
                canvas.width = TWMap.map.sectorSize * TWMap.map.scale[0];
                canvas.height = TWMap.map.sectorSize * TWMap.map.scale[1];
                canvas.id = canvasIdPrefix + sector.x + '_' + sector.y;

                let x = villagePixel[0] - sectorPixel[0] + TWMap.tileSize[0] / 2;
                let y = villagePixel[1] - sectorPixel[1] + TWMap.tileSize[1] / 2;

                sector.appendElement(canvas, 0, 0);
                drawChurchCircle(canvas.getContext('2d'), x, y, radius);
            }
        };
    })(mapOverlay.mapHandler.spawnSector);

    mapOverlay.reload();
}
