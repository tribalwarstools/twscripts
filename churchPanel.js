let igrejaData = [];
const igrejaRanges = [4, 6, 8]; // Raio por nível

let activeInputs = 0;
const maxInputs = 99;

// Novo estilo CSS para painel flutuante
const customStyle = `
<style>
.igrejaRowOdd {
    background-color: #2e3440;
    color: #eceff4;
}
.igrejaRowEven {
    background-color: #3b4252;
    color: #eceff4;
}
.igrejaHeader {
    background-color: #1e222a;
    font-weight: bold;
    color: #d8dee9;
}

/* Estilo do painel flutuante */
#igrejaPanel {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    width: 200px;
    background: #2e3440;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    cursor: move;
}

/* Para o header do painel flutuante */
#igrejaPanel .igrejaHeader {
    cursor: move;
}
</style>`;

// Inserindo o estilo no cabeçalho da página
$("head").append(customStyle);

// Estrutura HTML principal para o painel flutuante
const panelHTML = `
<div id="igrejaPanel">
    <form id="IgrejaInputForm">
        <table class="igrejaHeader">
            <tr class="igrejaHeader">
                <td>Coordenada</td>
                <td>Nível</td>
                <td>Excluir</td>
            </tr>
            <tr id="btnAddRow" class="igrejaRowOdd">
                <td colspan="3" align="center">
                    <a href="javascript:void(0);" id="addIgrejaBtn" title="Adicionar Entrada"><img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/></a>
                </td>
            </tr>
            <tr id="actionButtons" class="igrejaRowEven">
                <td colspan="3" align="right">
                    <button type="button" class="btn-confirm-yes" onclick="storeIgrejaData()">Salvar</button>
                    <button type="button" class="btn-confirm-yes" onclick="renderIgrejaMap()">Mostrar</button>
                </td>
            </tr>
            <tr class="igrejaHeader">
                <td colspan="3">
                    <textarea id="bulkCoords" cols="30" rows="10" placeholder="Cole as coordenadas aqui"></textarea>
                </td>
            </tr>
            <tr>
                <td colspan="3" align="right">
                    <button type="button" class="btn-confirm-yes" onclick="loadCoordinates()">Importar</button>
                </td>
            </tr>
        </table>
    </form>
</div>`;

// Adiciona o painel na página
$("body").append(panelHTML);

// Lógica para permitir o arraste do painel flutuante
let isDragging = false;
let offsetX, offsetY;

$("#igrejaPanel").mousedown(function (e) {
    isDragging = true;
    offsetX = e.clientX - $(this).offset().left;
    offsetY = e.clientY - $(this).offset().top;
    $(this).css('cursor', 'grabbing');
});

$(document).mousemove(function (e) {
    if (isDragging) {
        $("#igrejaPanel").css({
            top: e.clientY - offsetY,
            left: e.clientX - offsetX
        });
    }
});

$(document).mouseup(function () {
    isDragging = false;
    $("#igrejaPanel").css('cursor', 'move');
});

// Evento de adicionar linha
$("#addIgrejaBtn").click(() => addIgrejaRow("", 0));

// Evento de remoção de linha
$('table.igrejaHeader').on('click', '.removeIgreja', function () {
    $(this).closest('tr').remove();
    activeInputs--;
    if (activeInputs < maxInputs) {
        $("#btnAddRow").show();
    }
});

// Carregar dados salvos do localStorage
if (localStorage.getItem("igrejaVisualData") == null) {
    igrejaData = [];
    localStorage.setItem("igrejaVisualData", JSON.stringify(igrejaData));
} else {
    igrejaData = JSON.parse(localStorage.getItem("igrejaVisualData"));
    igrejaData.forEach(entry => addIgrejaRow(entry.coord, entry.level));
}

function addIgrejaRow(coord, level) {
    if (activeInputs < maxInputs) {
        activeInputs++;
        const cssClass = activeInputs % 2 === 0 ? "igrejaRowEven" : "igrejaRowOdd";
        $(`<tr class="${cssClass}">
            <td><center><input type="text" name="coord" size="7" placeholder="xxx|yyy" value="${coord}"/></center></td>
            <td><center><select name="level">
                <option value="1" ${level === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${level === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${level === 3 ? 'selected' : ''}>3</option>
            </select></center></td>
            <td><center><span class="removeIgreja"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png" title="Remover"></span></center></td>
        </tr>`).insertBefore($("#btnAddRow"));

        if (activeInputs >= maxInputs) {
            $("#btnAddRow").hide();
        }
    }
}

function storeIgrejaData() {
    igrejaData = [];
    const inputData = $("#IgrejaInputForm :input").serializeArray();
    for (let i = 0; i < inputData.length; i += 2) {
        igrejaData.push({ coord: inputData[i].value, level: parseInt(inputData[i + 1].value) });
    }
    localStorage.setItem("igrejaVisualData", JSON.stringify(igrejaData));
}

function loadCoordinates() {
    let coords = $("#bulkCoords").val().replace(/[\s\n]+/g, ",").split(",");
    coords.forEach(c => addIgrejaRow(c, 0));
}

function renderIgrejaMap() {
    const map = TWMap;
    const inputData = $("#IgrejaInputForm :input").serializeArray();
    igrejaData = [];
    for (let i = 0; i < inputData.length; i += 2) {
        igrejaData.push({ coord: inputData[i].value, level: parseInt(inputData[i + 1].value) });
    }

    function drawMainMap(canvas, sector) {
        const ctx = canvas.getContext("2d");
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        igrejaData.forEach(({ coord, level }) => {
            if (level > 0) {
                const [x, y] = coord.split('|').map(Number);
                const center = map.map.pixelByCoord(x, y);
                const sectorPos = map.map.pixelByCoord(sector.x, sector.y);
                const px = (center[0] - sectorPos[0]) + map.tileSize[0] / 2;
                const py = (center[1] - sectorPos[1]) + map.tileSize[1] / 2;
                const radius = igrejaRanges[level - 1] * map.map.scale[0];

                ctx.beginPath();
                ctx.strokeStyle = '#000000';
                ctx.ellipse(px, py, radius, radius, 0, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fill();
                ctx.stroke();
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
        igrejaData.forEach(({ coord, level }) => {
            if (level > 0) {
                const [x, y] = coord.split('|').map(Number);
                const px = (x - sector.x) * 5 + 3;
                const py = (y - sector.y) * 5 + 3;
                const radius = igrejaRanges[level - 1] * 5;

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

// Evento para chamar a função quando o botão "Mostrar" for clicado
$("#btnMostrar").click(function() {
    renderIgrejaMap();
});
