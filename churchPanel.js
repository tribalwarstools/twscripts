this.serverData = [];
this.igrejaRadius = [4,6,8];
var currentFields = 0;
var maxFields = 99;
// categorias habilitadas

// Estilizando o HTML
cssClassesIgreja = `
<style>
.igrejaRowA {
background-color: #32353b;
color: white;
}
.igrejaRowB {
background-color: #36393f;
color: white;
}
.igrejaHeader {
background-color: #202225;
font-weight: bold;
color: white;
}
</style>`

// Adicionando os estilos à página, desktop/mobile
$("#contentContainer").eq(0).prepend(cssClassesIgreja);
$("#mobileHeader").eq(0).prepend(cssClassesIgreja);

// Base HTML
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

// Exibindo o resumo
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
    console.log("Obtendo quais categorias estão habilitadas no armazenamento");
    this.serverData = JSON.parse(localStorage.getItem("igrejaData"));
    for (var i = 0; i < serverData.length; i++) {
        addRow(serverData[i].village, serverData[i].igreja);
    }
}

var mapOverlay = TWMap;

function makeMap() {
    serverData = [];
    tempData = $("#IgrejaData :input").serializeArray();
    for (var i = 0; i < tempData.length; i = i + 2) {
        serverData.push({ "village": tempData[i].value, "igreja": parseInt(tempData[i + 1].value) })
    }

    function drawTopoIgrejas(canvas, sector) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

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

    function drawMapIgrejas(canvas, sector) {
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

        for (var prop in serverData) {
            var ig = serverData[prop].igreja;
            if (ig != -1) {
                var igr = this.igrejaRadius[ig - 1],
                    t = serverData[prop].village.split('|'),
                    ig_pixel = mapOverlay.map.pixelByCoord(t[0], t[1]),
                    st_pixel = mapOverlay.map.pixelByCoord(sector.x, sector.y),
                    x = (ig_pixel[0] - st_pixel[0]) + mapOverlay.tileSize[0] / 2
                y = (ig_pixel[1] - st_pixel[1]) + mapOverlay.tileSize[1] / 2;

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

    if (mapOverlay.mapHandler._spawnSector) {
        // Já existe, não recriar
    } else {
        // Não existe ainda
        mapOverlay.mapHandler._spawnSector = mapOverlay.mapHandler.spawnSector;
    }

    mapOverlay.mapHandler.spawnSector = function (data, sector) {
        mapOverlay.mapHandler._spawnSector(data, sector);

        // Canvas do mapa principal
        var beginX = sector.x - data.x;
        var endX = beginX + mapOverlay.mapSubSectorSize;
        var beginY = sector.y - data.y;
        var endY = beginY + mapOverlay.mapSubSectorSize;

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
                var v = mapOverlay.villages[(data.x + x) * 1000 + (data.y + y)];
                if (v) {
                    var el = $('#mapOverlay_canvas_' + sector.x + '_' + sector.y);
                    if (!el.length) {
                        var canvas = document.createElement('canvas');
                        canvas.style.position = 'absolute';
                        canvas.width = (mapOverlay.map.scale[0] * mapOverlay.map.sectorSize);
                        canvas.height = (mapOverlay.map.scale[1] * mapOverlay.map.sectorSize);
                        canvas.style.zIndex = 10;
                        canvas.className = 'mapOverlay_map_canvas';
                        canvas.id = 'mapOverlay_canvas_' + sector.x + '_' + sector.y;

                        sector.appendElement(canvas, 0, 0);
                        drawMapIgrejas(canvas, sector);
                    }
                }
            }
        }

        // Canvas topo
        for (var key in mapOverlay.minimap._loadedSectors) {
            var sector = mapOverlay.minimap._loadedSectors[key];
            var el = $('#mapOverlay_topo');
