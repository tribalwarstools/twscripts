this.serverData = [];
this.watchtowerRadius = [1.1, 1.3, 1.5, 1.7, 2, 2.3, 2.6, 3, 3.4, 3.9, 4.4, 5.1, 5.8, 6.7, 7.6, 8.7, 10, 11.5, 13.1, 15,15,15,15,15,15,15,15,15,15,30];
var currentFields = 0;
var maxFields = 99;
// categories enabled

//styling html
cssClassesSophie = `
<style>
.sophRowA {
background-color: #32353b;
color: white;
}
.sophRowB {
background-color: #36393f;
color: white;
}
.sophHeader {
background-color: #202225;
font-weight: bold;
color: white;
}
</style>`
//appending styles to page, desktop/mobile
$("#contentContainer").eq(0).prepend(cssClassesSophie);
$("#mobileHeader").eq(0).prepend(cssClassesSophie);

//base html
html = `
<div>
    <form id="WTData">
    <table class="sophHeader">
        <tr class="sophHeader">
            <td class="sophHeader" >Coordinate</th>
            <td class="sophHeader" >WT level</th>
            <td class="sophHeader" >Remove</th>
        </tr>
        <tr id="addButton" class="sophRowA">
            <td colspan="4"><center><a href="javascript:void(0);" class="add_button" title="Add field"><img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/></a></center></td>
        </tr>
        <tr id="calculate" class="sophRowB">
            <td colspan="4" align="right">
                    <button type="button" ID="save" class="btn-confirm-yes" onclick="saveData()">Save list</button>
                    <button type="button" ID="calculate" class="btn-confirm-yes" onclick="makeMap()")>Display</button>
            </td>
        </tr>
        <tr id="importCoords" class="sophHeader">
        <td colspan="4"><textarea id="coordinates" cols="30" rows="12" style="sophHeader" placeholder="Enter coordinates here"></textarea></td>
        </tr>
        <tr>
        <td colspan="4" align="right">
            <button type="button" ID="import" class="btn-confirm-yes" onclick="importCoords()">Import coords</button>
        </td>
        </tr>
    </table>
    </form>
</div>`;
//display overview
$("#contentContainer tr").eq(0).prepend("<td style='display: inline-block;vertical-align: top;'>" + html + "</td>")

$(".add_button").click(function () {
    addRow("");
});

$('table.sophHeader').on('click', '#removeRow', function (e) {
    $(this).closest('tr').remove()
})

if (localStorage.getItem("watchTowerData") == null) {
    console.log("No watchtower data found, create")
    this.serverData = [];
    localStorage.setItem("watchTowerData", JSON.stringify(serverData));
}
else {
    console.log("Getting which category types are enabled from storage");
    this.serverData = JSON.parse(localStorage.getItem("watchTowerData"));
    for (var i = 0; i < serverData.length; i++) {
        addRow(serverData[i].village,serverData[i].watchtower);
    }
}


var mapOverlay = TWMap;
function makeMap() {
    serverData = [];
    tempData = $("#WTData :input").serializeArray();
    for (var i = 0; i < tempData.length; i = i + 2) {
        serverData.push({ "village": tempData[i].value, "watchtower": parseInt(tempData[i + 1].value) })
    }
    function drawTopoTowers(canvas, sector) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

        for (var prop in serverData) {
            var wt = serverData[prop].watchtower;
            if (wt != -1) {
                var t = serverData[prop].village.split('|'),
                    x = (t[0] - sector.x) * 5 + 3,
                    y = (t[1] - sector.y) * 5 + 3;

                ctx.beginPath();
                ctx.strokeStyle = '#000000';
                ctx.arc(x, y, this.watchtowerRadius[wt - 1] * 5, 0, 2 * Math.PI);
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

    function drawMapTowers(canvas, sector) {
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

        for (var prop in serverData) {
            var wt = serverData[prop].watchtower;
            if (wt != -1) {
                var wtr = this.watchtowerRadius[wt - 1],
                    t = serverData[prop].village.split('|'),
                    wt_pixel = mapOverlay.map.pixelByCoord(t[0], t[1]),
                    st_pixel = mapOverlay.map.pixelByCoord(sector.x, sector.y),
                    x = (wt_pixel[0] - st_pixel[0]) + mapOverlay.tileSize[0] / 2
                y = (wt_pixel[1] - st_pixel[1]) + mapOverlay.tileSize[1] / 2;

                ctx.beginPath();
                ctx.strokeStyle = '#000000';
                ctx.ellipse(x, y, wtr * TWMap.map.scale[0], wtr * TWMap.map.scale[1], 0, 0, 2 * Math.PI);
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
        //exists already, don't recreate
    }
    else {
        //doesn't exist yet
        mapOverlay.mapHandler._spawnSector = mapOverlay.mapHandler.spawnSector;
    }
    mapOverlay.mapHandler.spawnSector = function (data, sector) {
        mapOverlay.mapHandler._spawnSector(data, sector);

        // Main map canvas
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
                        drawMapTowers(canvas, sector);
                    }
                }
            }
        }

        // Topo canvas
        for (var key in mapOverlay.minimap._loadedSectors) {
            var sector = mapOverlay.minimap._loadedSectors[key];
            var el = $('#mapOverlay_topo_canvas_' + key);
            if (!el.length) {
                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = '250';
                canvas.height = '250';
                canvas.style.zIndex = 11;
                canvas.className = 'mapOverlay_topo_canvas';
                canvas.id = 'mapOverlay_topo_canvas_' + key;

                drawTopoTowers(canvas, sector);
                sector.appendElement(canvas, 0, 0);
            }
        }
    }

    mapOverlay.reload();
}

function importCoords() {
    coords = $("#coordinates").val()
    coords = coords.replace(/ /g, ",");
    coords = coords.replace(/\n/g, ",");
    coords = coords.split(',');
    for (var i = 0; i < coords.length; i++) {
        addRow(coords[i],0)
    }
}

function addRow(coord,level) {
    //Check maximum number of input fields
    if (currentFields < maxFields) {
        currentFields++; //Increment field counter
        if (currentFields % 2 == 0) {
            tempClass = "sophRowB"
        }
        else {
            tempClass = "sophRowA";
        }
        $(`<tr class="${tempClass}">
            <td><center><input type="text" id="coord${currentFields}" name="village" class="target-input-field target-input-autocomplete ui-autocomplete-input" size="7" placeholder="xxx|xxx" value="${coord}"/></center></td>
            <td><center><input type="text" id="watchtower${currentFields}" name="watchtower"  size="6" placeholder="WT level" value="${level}"/></center></td>
            <td><center><span id="removeRow"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png" title="removeRow"></span></center></td>
        </tr>`).insertBefore($("#addButton")[0]); //prepend field html
        if (currentFields >= maxFields) {
            $("#addButton").css("display", "none");
        }
    }
}

function saveData() {
    serverData = [];
    tempData = $("#WTData :input").serializeArray();
    for (var i = 0; i < tempData.length; i = i + 2) {
        serverData.push({ "village": tempData[i].value, "watchtower": parseInt(tempData[i + 1].value) })
    }
    localStorage.setItem("watchTowerData", JSON.stringify(serverData))
}
