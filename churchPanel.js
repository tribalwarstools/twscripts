// Variáveis de alcance por nível da igreja
let igrejaData = [];
const igrejaRanges = [4, 6, 8];

let activeInputs = 0;
const maxInputs = 99;

// Novo estilo CSS (com modificações para o painel flutuante)
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
#igrejaPanel {
    position: fixed;
    top: 20px;  /* Distância do topo da tela */
    right: 20px;  /* Distância da borda direita da tela */
    z-index: 1000; /* Para garantir que o painel fique acima de outros elementos */
    background-color: #2e3440;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    cursor: move;  /* Aponta que o painel pode ser arrastado */
}
#igrejaPanel table {
    width: 100%;
}
#igrejaPanel button {
    margin-top: 10px;
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
                    <a href="javascript:void(0);" id="addIgrejaBtn" title="Adicionar Entrada">
                        <img src="https://www.shinko-to-kuma.com/assets/img/tribalwars/plus.png" width="20" height="20"/>
                    </a>
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

// Adiciona o painel flutuante na página
$("body").prepend(panelHTML);

// Função para tornar o painel arrastável
function makePanelDraggable() {
    const panel = document.getElementById('igrejaPanel');
    let isDragging = false;
    let offsetX, offsetY;

    panel.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
        document.body.style.userSelect = 'none';  // Previne a seleção de texto durante o arrasto
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            panel.style.left = `${x}px`;
            panel.style.top = `${y}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';  // Restaura a seleção de texto após o arrasto
    });
}

// Chama a função para tornar o painel arrastável
makePanelDraggable();

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
        
        // Criando o select para o nível
        const levelSelect = `
            <select name="level" style="width: 100px;">
                <option value="1" ${level === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${level === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${level === 3 ? 'selected' : ''}>3</option>
            </select>
        `;
        
        $(`<tr class="${cssClass}">
            <td><center><input type="text" name="coord" size="7" placeholder="xxx|yyy" value="${coord}"/></center></td>
            <td><center>${levelSelect}</center></td>
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

    map.reload();
}
