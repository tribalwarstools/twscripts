(() => {
    const alcanceIgreja = [4, 6, 8]; // Níveis 1 a 3
    const dadosIgrejas = [];
    let camposAtuais = 0;
    const maxCampos = 99;

    const estiloCSS = `
    <style>
        .igrejaRowA { background-color: #2e2e2e; color: #fff; }
        .igrejaRowB { background-color: #3a3a3a; color: #fff; }
        .igrejaHeader { background-color: #1a1a1a; color: #fff; font-weight: bold; }
    </style>`;

    $("#contentContainer").eq(0).prepend(estiloCSS);
    $("#mobileHeader").eq(0).prepend(estiloCSS);

    const htmlPainel = `
    <div>
        <form id="formIgreja">
            <table class="igrejaHeader">
                <tr class="igrejaHeader">
                    <td>Coordenada</td>
                    <td>Nível</td>
                    <td>Remover</td>
                </tr>
                <tr id="botaoAdicionar" class="igrejaRowA">
                    <td colspan="3" align="center">
                        <a href="javascript:void(0);" class="botao_add" title="Adicionar"><img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20"/></a>
                    </td>
                </tr>
                <tr class="igrejaRowB">
                    <td colspan="3" align="right">
                        <button type="button" onclick="salvarIgrejas()" class="btn-confirm-yes">Salvar</button>
                        <button type="button" onclick="mostrarAlcanceIgreja()" class="btn-confirm-yes">Exibir</button>
                    </td>
                </tr>
                <tr class="igrejaHeader">
                    <td colspan="3"><textarea id="entradaCoords" cols="30" rows="10" placeholder="Insira coordenadas"></textarea></td>
                </tr>
                <tr>
                    <td colspan="3" align="right">
                        <button type="button" onclick="importarCoordenadas()" class="btn-confirm-yes">Importar</button>
                    </td>
                </tr>
            </table>
        </form>
    </div>`;

    $("#contentContainer tr").eq(0).prepend(`<td style='display: inline-block; vertical-align: top;'>${htmlPainel}</td>`);

    $(".botao_add").click(() => adicionarLinha(""));

    $("table.igrejaHeader").on("click", ".removerLinha", function () {
        $(this).closest("tr").remove();
    });

    if (localStorage.getItem("dadosIgrejas") == null) {
        localStorage.setItem("dadosIgrejas", JSON.stringify([]));
    } else {
        const salvos = JSON.parse(localStorage.getItem("dadosIgrejas"));
        salvos.forEach(({ coord, nivel }) => adicionarLinha(coord, nivel));
    }

    window.adicionarLinha = function (coord = "", nivel = 0) {
        if (camposAtuais < maxCampos) {
            camposAtuais++;
            const classe = camposAtuais % 2 === 0 ? "igrejaRowB" : "igrejaRowA";
            $(`<tr class="${classe}">
                <td align="center"><input name="coord" size="7" value="${coord}" placeholder="xxx|yyy"/></td>
                <td align="center"><input name="nivel" size="4" value="${nivel}" placeholder="1-3"/></td>
                <td align="center"><span class="removerLinha"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png"></span></td>
            </tr>`).insertBefore($("#botaoAdicionar"));
        }
    };

    window.importarCoordenadas = function () {
        const texto = $("#entradaCoords").val().replace(/[\s\n]+/g, ",");
        const coords = texto.split(",").filter(c => c.includes("|"));
        coords.forEach(c => adicionarLinha(c.trim(), 0));
    };

    window.salvarIgrejas = function () {
        const lista = [];
        const inputs = $("#formIgreja :input").serializeArray();
        for (let i = 0; i < inputs.length; i += 2) {
            lista.push({ coord: inputs[i].value, nivel: parseInt(inputs[i + 1].value) });
        }
        localStorage.setItem("dadosIgrejas", JSON.stringify(lista));
    };

    window.mostrarAlcanceIgreja = function () {
        const inputs = $("#formIgreja :input").serializeArray();
        dadosIgrejas.length = 0;
        for (let i = 0; i < inputs.length; i += 2) {
            dadosIgrejas.push({ coord: inputs[i].value, nivel: parseInt(inputs[i + 1].value) });
        }

        const mapa = TWMap;

        const desenharSetor = function (canvas, setor) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            dadosIgrejas.forEach(({ coord, nivel }) => {
                if (nivel >= 1 && nivel <= 3) {
                    const [vx, vy] = coord.split('|').map(Number);
                    const centro = mapa.map.pixelByCoord(vx, vy);
                    const setorPixel = mapa.map.pixelByCoord(setor.x, setor.y);
                    const x = centro[0] - setorPixel[0] + mapa.tileSize[0] / 2;
                    const y = centro[1] - setorPixel[1] + mapa.tileSize[1] / 2;
                    const raio = alcanceIgreja[nivel - 1] * mapa.map.scale[0];

                    ctx.beginPath();
                    ctx.strokeStyle = "rgba(0, 0, 255, 0.4)";
                    ctx.fillStyle = "rgba(50, 50, 200, 0.08)";
                    ctx.ellipse(x, y, raio, raio, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.fill();
                    ctx.closePath();
                }
            });
        };

        const originalSpawn = mapa.mapHandler.spawnSector;
        mapa.mapHandler.spawnSector = function (data, setor) {
            originalSpawn.call(this, data, setor);

            const canvasId = `igreja_canvas_${setor.x}_${setor.y}`;
            if (!document.getElementById(canvasId)) {
                const canvas = document.createElement("canvas");
                canvas.width = mapa.map.scale[0] * mapa.map.sectorSize;
                canvas.height = mapa.map.scale[1] * mapa.map.sectorSize;
                canvas.style.position = "absolute";
                canvas.style.zIndex = 11;
                canvas.id = canvasId;
                canvas.className = "igreja_canvas";
                setor.appendElement(canvas, 0, 0);
                desenharSetor(canvas, setor);
            }
        };

        mapa.reload();
        setTimeout(desenharMiniMapaIgreja, 500);
    };

    window.desenharMiniMapaIgreja = function () {
        const miniCanvas = document.querySelector("#map_mini canvas");
        if (!miniCanvas) return;

        const ctx = miniCanvas.getContext("2d");
        ctx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

        const escalaX = miniCanvas.width / TWMap.size[0];
        const escalaY = miniCanvas.height / TWMap.size[1];

        dadosIgrejas.forEach(({ coord, nivel }) => {
            if (nivel >= 1 && nivel <= 3) {
                const [x, y] = coord.split('|').map(Number);
                const cx = x * escalaX;
                const cy = y * escalaY;
                const raio = alcanceIgreja[nivel - 1] * escalaX;

                ctx.beginPath();
                ctx.strokeStyle = "rgba(0, 0, 255, 0.4)";
                ctx.fillStyle = "rgba(50, 50, 200, 0.08)";
                ctx.ellipse(cx, cy, raio, raio, 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();
            }
        });
    };
})();
