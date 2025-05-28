// Alcance por nível da igreja (em campos)
let igrejaData = [];
const alcanceIgreja = [4, 6, 8];

let entradasAtivas = 0;
const limiteEntradas = 99;

const estiloPersonalizado = `
<style>
.igrejaLinhaImpar {
    background-color: #2e3440;
    color: #eceff4;
}
.igrejaLinhaPar {
    background-color: #3b4252;
    color: #eceff4;
}
.igrejaCabecalho {
    background-color: #1e222a;
    font-weight: bold;
    color: #d8dee9;
}
</style>`;

// Inserir CSS
$("#contentContainer").eq(0).prepend(estiloPersonalizado);
$("#mobileHeader").eq(0).prepend(estiloPersonalizado);

const htmlPainel = `
<div>
    <form id="formularioIgreja">
        <table class="igrejaCabecalho">
            <tr class="igrejaCabecalho">
                <td>Coordenada</td>
                <td>Nível</td>
                <td>Remover</td>
            </tr>
            <tr id="botaoAdicionarLinha" class="igrejaLinhaImpar">
                <td colspan="3" align="center">
                    <a href="javascript:void(0);" id="btnAdicionarIgreja"><img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/></a>
                </td>
            </tr>
            <tr class="igrejaLinhaPar">
                <td colspan="3" align="right">
                    <button type="button" class="btn-confirm-yes" onclick="salvarDadosIgreja()">Salvar</button>
                    <button type="button" class="btn-confirm-yes" onclick="mostrarAlcanceIgreja()">Exibir</button>
                </td>
            </tr>
            <tr class="igrejaCabecalho">
                <td colspan="3">
                    <textarea id="campoCoordenadas" cols="30" rows="10" placeholder="Cole as coordenadas aqui"></textarea>
                </td>
            </tr>
            <tr>
                <td colspan="3" align="right">
                    <button type="button" class="btn-confirm-yes" onclick="importarCoordenadas()">Importar</button>
                </td>
            </tr>
        </table>
    </form>
</div>`;

$("#contentContainer tr").eq(0).prepend("<td style='display: inline-block;vertical-align: top;'>" + htmlPainel + "</td>");

// Adiciona linha
$("#btnAdicionarIgreja").click(() => adicionarLinhaIgreja("", 1));

// Remove linha
$('table.igrejaCabecalho').on('click', '.removerIgreja', function () {
    $(this).closest('tr').remove();
    entradasAtivas--;
    if (entradasAtivas < limiteEntradas) {
        $("#botaoAdicionarLinha").show();
    }
});

// Carrega dados salvos
if (localStorage.getItem("igrejaAlcanceDados") == null) {
    igrejaData = [];
    localStorage.setItem("igrejaAlcanceDados", JSON.stringify(igrejaData));
} else {
    igrejaData = JSON.parse(localStorage.getItem("igrejaAlcanceDados"));
    igrejaData.forEach(entry => adicionarLinhaIgreja(entry.coord, entry.nivel));
}

function adicionarLinhaIgreja(coord, nivel) {
    if (entradasAtivas < limiteEntradas) {
        entradasAtivas++;
        const classeLinha = entradasAtivas % 2 === 0 ? "igrejaLinhaPar" : "igrejaLinhaImpar";
        $(`<tr class="${classeLinha}">
            <td><center><input type="text" name="coord" size="7" placeholder="xxx|yyy" value="${coord}"/></center></td>
            <td><center>
                <select name="nivel">
                    <option value="1" ${nivel==1?"selected":""}>1</option>
                    <option value="2" ${nivel==2?"selected":""}>2</option>
                    <option value="3" ${nivel==3?"selected":""}>3</option>
                </select>
            </center></td>
            <td><center><span class="removerIgreja"><img src="https://dsen.innogamescdn.com/asset/d25bbc6/graphic/delete.png" title="Remover"></span></center></td>
        </tr>`).insertBefore($("#botaoAdicionarLinha"));

        if (entradasAtivas >= limiteEntradas) {
            $("#botaoAdicionarLinha").hide();
        }
    }
}

function salvarDadosIgreja() {
    igrejaData = [];
    const inputs = $("#formularioIgreja :input").serializeArray();
    for (let i = 0; i < inputs.length; i += 2) {
        igrejaData.push({ coord: inputs[i].value, nivel: parseInt(inputs[i + 1].value) });
    }
    localStorage.setItem("igrejaAlcanceDados", JSON.stringify(igrejaData));
}

function importarCoordenadas() {
    let coords = $("#campoCoordenadas").val().replace(/[\s\n]+/g, ",").split(",");
    coords.forEach(c => adicionarLinhaIgreja(c, 1));
}

function mostrarAlcanceIgreja() {
    const mapa = TWMap;
    const inputs = $("#formularioIgreja :input").serializeArray();
    igrejaData = [];
    for (let i = 0; i < inputs.length; i += 2) {
        igrejaData.push({ coord: inputs[i].value, nivel: parseInt(inputs[i + 1].value) });
    }

    function desenharMapaPrincipal(canvas, setor) {
        const ctx = canvas.getContext("2d");
        ctx.lineWidth = 2;
        igrejaData.forEach(({ coord, nivel }) => {
            if (nivel > 0) {
                const [x, y] = coord.split('|').map(Number);
                const centro = mapa.map.pixelByCoord(x, y);
                const setorCoord = mapa.map.pixelByCoord(setor.x, setor.y);
                const px = (centro[0] - setorCoord[0]) + mapa.tileSize[0] / 2;
                const py = (centro[1] - setorCoord[1]) + mapa.tileSize[1] / 2;
                const raio = alcanceIgreja[nivel - 1] * mapa.map.scale[0];

                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
                ctx.fillStyle = 'rgba(100, 100, 255, 0.1)';
                ctx.ellipse(px, py, raio, raio, 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();
            }
        });
    }

    if (!mapa.mapHandler._originalSpawn) {
        mapa.mapHandler._originalSpawn = mapa.mapHandler.spawnSector;
    }

    mapa.mapHandler.spawnSector = function (data, setor) {
        mapa.mapHandler._originalSpawn(data, setor);

        const idCanvas = `igreja_canvas_${setor.x}_${setor.y}`;
        if (!document.getElementById(idCanvas)) {
            const canvas = document.createElement('canvas');
            canvas.className = 'mapOverlay_map_canvas';
            canvas.id = idCanvas;
            canvas.style.position = 'absolute';
            canvas.style.zIndex = 10;
            canvas.width = mapa.map.scale[0] * mapa.map.sectorSize;
            canvas.height = mapa.map.scale[1] * mapa.map.sectorSize;
            setor.appendElement(canvas, 0, 0);
            desenharMapaPrincipal(canvas, setor);
        }
    };

    mapa.reload();
}
