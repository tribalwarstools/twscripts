// Variáveis de alcance por nível da torre
let towerData = [];
const towerRanges = [4,6,8];

let activeInputs = 0;
const maxInputs = 99;

// Novo estilo CSS
const customStyle = `
<style>
.towerRowOdd {
    background-color: #2e3440;
    color: #eceff4;
}
.towerRowEven {
    background-color: #3b4252;
    color: #eceff4;
}
.towerHeader {
    background-color: #1e222a;
    font-weight: bold;
    color: #d8dee9;
}
</style>`;

// Inserindo o estilo no cabeçalho da página
$("#contentContainer").eq(0).prepend(customStyle);
$("#mobileHeader").eq(0).prepend(customStyle);

// Estrutura HTML principal
const panelHTML = `
<div>
    <form id="TowerInputForm">
        <table class="towerHeader">
            <tr class="towerHeader">
                <td>Coordinate</td>
                <td>Level</td>
                <td>Delete</td>
            </tr>
            <tr id="btnAddRow" class="towerRowOdd">
                <td colspan="3" align="center">
                    <a href="javascript:void(0);" id="addTowerBtn" title="Add Entry"><img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/></a>
                </td>
            </tr>
            <tr id="actionButtons" class="towerRowEven">
                <td colspan="3" align="right">
                    <button type="button" class="btn-confirm-yes" onclick="storeTowerData()">Save</button>
                    <button type="button" class="btn-confirm-yes" onclick="renderTowerMap()">Show</button>
                </td>
            </tr>
            <tr class="towerHeader">
                <td colspan="3">
                    <textarea id="bulkCoords" cols="30" rows="10" placeholder="Paste coordinates here"></textarea>
                </td>
            </tr>
            <tr>
                <td colspan="3" align="right">
                    <button type="button" class="btn-confirm-yes" onclick="loadCoordinates()">Import</button>
                </td>
            </tr>
        </table>
    </form>
</div>`;

// Adiciona a interface na página
$("#contentContainer tr").eq(0).prepend("<td style='display: inline-block;vertical-align: top;'>" + panelHTML + "</td>");

// Evento de adicionar linha
$("#addTowerBtn").click(() => addTowerRow("", 0));

// Evento de remoção de linha
$('table.towerHeader').on('click', '.removeTower', function () {
    $(this).closest('tr').remove();
    activeInputs--;
    if (activeInputs < maxInputs) {
        $("#btnAddRow").show();
    }
});

// Carregar dados salvos do localStorage
if (localStorage.getItem("towerVisualData") == null) {
    towerData = [];
    localStorage.setItem("towerVisualData", JSON.stringify(towerData));
} else {
    towerData = JSON.parse(localStorage.getItem("towerVisualData"));
    towerData.forEach(entry => addTowerRow(entry.coord, entry.level));
}

function addTowerRow(coord, level) {
    if (activeInputs < maxInputs) {
        activeInputs++;
        const cssClass = activeInputs % 2 === 0 ? "towerRowEven" : "towerRowOdd";
        $(`<tr class="${cssClass}">
            <td><center><input type="text" name="coord" size="7" placeholder="xxx|yyy" value="${coord}"/></center></td>
            <td><center><input type="text" name="level" size="5" placeholder="Level" value="${level}"/></center></td>
            <td><center><span class="removeTower"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png" title="Remove"></span></center></td>
        </tr>`).insertBefore($("#btnAddRow"));

        if (activeInputs >= maxInputs) {
            $("#btnAddRow").hide();
        }
    }
}

function storeTowerData() {
    towerData = [];
    const inputData = $("#TowerInputForm :input").serializeArray();
    for (let i = 0; i < inputData.length; i += 2) {
        towerData.push({ coord: inputData[i].value, level: parseInt(inputData[i + 1].value) });
    }
    localStorage.setItem("towerVisualData", JSON.stringify(towerData));
}

function loadCoordinates() {
    let coords = $("#bulkCoords").val().replace(/[\s\n]+/g, ",").split(",");
    coords.forEach(c => addTowerRow(c, 0));
}

function renderTowerMap() {
    const map = TWMap;
    const inputData = $("#TowerInputForm :input").serializeArray();
    towerData = [];
    for (let i = 0; i < inputData.length; i += 2) {
        towerData.push({ coord: inputData[i].value, level: parseInt(inputData[i + 1].value) });
    }

    function drawMainMap(canvas, sector) {
        const ctx = canvas.getContext("2d");
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        towerData.forEach(({ coord, level }) => {
            if (level > 0) {
                const [x, y] = coord.split('|').map(Number);
                const center = map.map.pixelByCoord(x, y);
                const sectorPos = map.map.pixelByCoord(sector.x, sector.y);
                const px = (center[0] - sectorPos[0]) + map.tileSize[0] / 2;
                const py = (center[1] - sectorPos[1]) + map.tileSize[1] / 2;
                const radius = towerRanges[level - 1] * map.map.scale[0];

                ctx.beginPath();
                ctx.strokeStyle = '#000000';
                ctx.ellipse(px, py, radius, radius, 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();

                ctx.beginPath();
                ctx.strokeStyle = '#FFFFFF';
                ctx.moveTo(px - 6, py - 6);
                ctx.lineTo(px + 6, py + 6);
                ctx.moveTo(px + 6, py - 6);
                ctx.lineTo(px - 6, py + 6);
                ctx.stroke();
                ctx.closePath();
            }
        });
    }

    function drawMiniMap(canvas, sector) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        towerData.forEach(({ coord, level }) => {
            if (level > 0) {
                const [x, y] = coord.split('|').map(Number);
                const px = (x - sector.x) * 5 + 3;
                const py = (y - sector.y) * 5 + 3;
                const radius = towerRanges[level - 1] * 5;

                ctx.beginPath();
                ctx.strokeStyle = '#000000';
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.arc(px, py, radius, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();

                ctx.beginPath();
                ctx.strokeStyle = '#FFFFFF';
                ctx.moveTo(px - 2, py - 2);
                ctx.lineTo(px + 2, py + 2);
                ctx.moveTo(px + 2, py - 2);
                ctx.lineTo(px - 2, py + 2);
                ctx.stroke();
                ctx.closePath();
            }
        });
    }

    if (!map.mapHandler._originalSpawn) {
        map.mapHandler._originalSpawn = map.mapHandler.spawnSector;
    }

    map.mapHandler.spawnSector = function (data, sector) {
        map.mapHandler._originalSpawn(data, sector);

        const canvasId = `mapOverlay_canvas_${sector.x}_${sector.y}`;
        if (!document.getElementById(canvasId)) {
            const canvas = document.createElement('canvas');
            canvas.className = 'mapOverlay_map_canvas';
            canvas.id = canvasId;
            canvas.style.position = 'absolute';
            canvas.style.zIndex = 10;
            canvas.width = map.map.scale[0] * map.map.sectorSize;
            canvas.height = map.map.scale[1] * map.map.sectorSize;
            sector.appendElement(canvas, 0, 0);
            drawMainMap(canvas, sector);
        }

        for (const key in map.minimap._loadedSectors) {
            const miniSector = map.minimap._loadedSectors[key];
            const miniCanvasId = `mapOverlay_topo_canvas_${key}`;
            if (!document.getElementById(miniCanvasId)) {
                const miniCanvas = document.createElement('canvas');
                miniCanvas.className = 'mapOverlay_topo_canvas';
                miniCanvas.id = miniCanvasId;
                miniCanvas.style.position = 'absolute';
                miniCanvas.style.zIndex = 11;
                miniCanvas.width = 250;
                miniCanvas.height = 250;
                drawMiniMap(miniCanvas, miniSector);
                miniSector.appendElement(miniCanvas, 0, 0);
            }
        }
    };

    map.reload();
}
