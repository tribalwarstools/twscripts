this.serverData = [];
this.igrejaRadius = [4,6,8];
var currentFields = 0;
var maxFields = 99;

// Estilos
cssClassesIgreja = `
<style>
.igrejaRowA {
    background-color: #d2c09e;
    color: white;
}
.igrejaRowB {
    background-color: #d2c09e;
    color: white;
}
.igrejaHeader {
    background-color: #d2c09e;
    font-weight: bold;
    color: white;
}
</style>`

$("#contentContainer").eq(0).prepend(cssClassesIgreja);
$("#mobileHeader").eq(0).prepend(cssClassesIgreja);

// HTML Base
html = `
<div>
    <form id="IgrejaData">
    <table class="igrejaHeader">
        <tr class="igrejaHeader">
            <td class="igrejaHeader" >Coordenada</th>
            <td class="igrejaHeader" >Igreja nível</th>
            <td class="igrejaHeader" >Remover</th>
        </tr>
        <tr id="addButton" class="igrejaRowA">
            <td colspan="4"><center><a href="javascript:void(0);" class="add_button" title="Adicionar campo"><img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/></a></center></td>
        </tr>
        <tr id="calculate" class="igrejaRowB">
            <td colspan="4" align="right">
                    <button type="button" ID="save" class="btn-confirm-yes" onclick="saveData()">Salvar lista</button>
                    <button type="button" ID="calculate" class="btn-confirm-yes" onclick="makeMap()">Exibir</button>
            </td>
        </tr>
        <tr id="importCoords" class="igrejaHeader">
        <td colspan="4"><textarea id="coordinates" cols="30" rows="12" style="igrejaHeader" placeholder="Digite as coordenadas aqui"></textarea></td>
        </tr>
        <tr>
        <td colspan="4" align="right">
            <button type="button" ID="import" class="btn-confirm-yes" onclick="importCoords()">Importar coordenadas</button>
        </td>
        </tr>
    </table>
    </form>
</div>`;

// Exibe o HTML na página
$("#contentContainer tr").eq(0).prepend("<td style='display: inline-block;vertical-align: top;'>" + html + "</td>")

$(".add_button").click(function () {
    addRow("");
});

$('table.igrejaHeader').on('click', '#removeRow', function (e) {
    $(this).closest('tr').remove()
})

if (localStorage.getItem("igrejaData") == null) {
    console.log("Sem dados de igreja encontrados, criando")
    this.serverData = [];
    localStorage.setItem("igrejaData", JSON.stringify(serverData));
} else {
    console.log("Obtendo dados de igreja do armazenamento");
    this.serverData = JSON.parse(localStorage.getItem("igrejaData"));
    for (var i = 0; i < serverData.length; i++) {
        addRow(serverData[i].village, serverData[i].igreja);
    }
}

// Função para desenhar as igrejas no mapa
function makeMap() {
    serverData = [];
    tempData = $("#IgrejaData :input").serializeArray();
    for (var i = 0; i < tempData.length; i = i + 2) {
        serverData.push({ "village": tempData[i].value, "igreja": parseInt(tempData[i + 1].value) })
    }

    function drawIgrejasTopo(canvas, sector) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1;
        ctx.fillStyle = '#ADD8E6';  // Azul claro

        for (var prop in serverData) {
            var ig = serverData[prop].igreja;
            if (ig != -1) {
                var t = serverData[prop].village.split('|'),
                    x = (t[0] - sector.x) * 5 + 3,
                    y = (t[1] - sector.y) * 5 + 3;

                ctx.beginPath();
                ctx.strokeStyle = '#000000';
                ctx.arc(x, y, this.igrejaRadius[ig - 1] * 5, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();

                ctx.beginPath();
                ctx.strokeStyle = '#FFFFFF';
                ctx.moveTo(x - 2, y - 2);
                ctx.lineTo(x + 2, y + 2);
                ctx.moveTo(x + 2, y - 2);
                ctx.lineTo(x - 2, y + 2);
                ctx.stroke();
                ctx.closePath();
            }
        }
    }

    function drawIgrejasMapa(canvas, sector) {
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.fillStyle = '#ADD8E6';  // Azul claro

        for (var prop in serverData) {
            var ig = serverData[prop].igreja;
            if (ig != -1) {
                var igr = this.igrejaRadius[ig - 1],
                    t = serverData[prop].village.split('|'),
                    ig_pixel = TWMap.map.pixelByCoord(t[0], t[1]),
                    st_pixel = TWMap.map.pixelByCoord(sector.x, sector.y),
                    x = (ig_pixel[0] - st_pixel[0]) + TWMap.tileSize[0] / 2
                y = (ig_pixel[1] - st_pixel[1]) + TWMap.tileSize[1] / 2;

                ctx.beginPath();
                ctx.strokeStyle = '#000000';
                ctx.ellipse(x, y, igr * TWMap.map.scale[0], igr * TWMap.map.scale[1], 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();

                ctx.beginPath();
                ctx.strokeStyle = '#FFFFFF';
                ctx.moveTo(x - 6, y - 6);
                ctx.lineTo(x + 6, y + 6);
                ctx.moveTo(x + 6, y - 6);
                ctx.lineTo(x - 6, y + 6);
                ctx.stroke();
                ctx.closePath();
            }
        }
    }

    if (TWMap.mapHandler._spawnSector) {
        // Já existe, não recriar
    } else {
        // Não existe ainda
        TWMap.mapHandler._spawnSector = TWMap.mapHandler.spawnSector;
    }

    TWMap.mapHandler.spawnSector = function (data, sector) {
        TWMap.mapHandler._spawnSector(data, sector);

        var beginX = sector.x - data.x;
        var endX = beginX + TWMap.mapSubSectorSize;
        var beginY = sector.y - data.y;
        var endY = beginY + TWMap.mapSubSectorSize;

        for (var x in data.tiles) {
            var x = parseInt(x, 10);
            if (x < beginX || x >= endX) {
                continue;
            }
            for (var y in data.tiles[x]) {
                var y = parseInt(y, 10);
                if (y < beginY || y >= endY) {
                    continue;
                }
                var v = TWMap.villages[(data.x + x) * 1000 + (data.y + y)];
                if (v) {
                    var el = $('#mapOverlay_canvas_' + sector.x + '_' + sector.y);
                    if (!el.length) {
                        var canvas = document.createElement('canvas');
                        canvas.style.position = 'absolute';
                        canvas.width = (TWMap.map.scale[0] * TWMap.map.sectorSize);
                        canvas.height = (TWMap.map.scale[1] * TWMap.map.sectorSize);
                        canvas.style.zIndex = 10;
                        canvas.className = 'mapOverlay_map_canvas';
                        canvas.id = 'mapOverlay_canvas_' + sector.x + '_' + sector.y;

                        sector.appendElement(canvas, 0, 0);
                        drawIgrejasMapa(canvas, sector);
                    }
                }
            }
        }

        // Canvas Topo
        for (var key in TWMap.minimap._loadedSectors) {
            var sector = TWMap.minimap._loadedSectors[key];
            var el = $('#mapOverlay_topo_canvas_' + key);
            if (!el.length) {
                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = '250';
                canvas.height = '250';
                canvas.style.zIndex = 11;
                canvas.className = 'mapOverlay_topo_canvas';
                canvas.id = 'mapOverlay_topo_canvas_' + key;

                drawIgrejasTopo(canvas, sector);
                sector.appendElement(canvas, 0, 0);
            }
        }
    }

    TWMap.reloadMap();
}

// Função para adicionar linha
function addRow(coord, level) {
    if (currentFields < maxFields) {
        currentFields++;
        var tempClass = (currentFields % 2 == 0) ? "igrejaRowB" : "igrejaRowA";

        $(`<tr class="${tempClass}">
            <td><center><input type="text" id="coord${currentFields}" name="village" class="target-input-field target-input-autocomplete ui-autocomplete-input" size="7" placeholder="xxx|xxx" value="${coord}"/></center></td>
            <td><center>
                <select id="igreja${currentFields}" name="igreja" size="1">
                    <option value="0" ${level == 0 ? 'selected' : ''}>Selecione o Nível</option>
                    <option value="1" ${level == 1 ? 'selected' : ''}>Nível 1</option>
                    <option value="2" ${level == 2 ? 'selected' : ''}>Nível 2</option>
                    <option value="3" ${level == 3 ? 'selected' : ''}>Nível 3</option>
                    <option value="4" ${level == 4 ? 'selected' : ''}>Nível 4</option>
                    <option value="5" ${level == 5 ? 'selected' : ''}>Nível 5</option>
                </select>
            </center></td>
            <td><center><span id="removeRow"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png" title="remover"></span></center></td>
        </tr>`).insertBefore($("#addButton")[0]);

        if (currentFields >= maxFields) {
            $("#addButton").css("display", "none");
        }
    }
}

// Função de salvar
function saveData() {
    serverData = [];
    tempData = $("#IgrejaData :input").serializeArray();
    for (var i = 0; i < tempData.length; i = i + 2) {
        // Adiciona o nível da igreja
        serverData.push({ 
            "village": tempData[i].value, 
            "igreja": parseInt(tempData[i + 1].value) 
        });
    }
    localStorage.setItem("igrejaData", JSON.stringify(serverData));
}
