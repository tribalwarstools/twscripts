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

    function drawIgrejasMapa(canvas, sector) {
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

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
                    if (el.length) {
                        // Canvas já existe, então vamos removê-lo
                        el.remove();
                    }

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

    TWMap.reload();
}
