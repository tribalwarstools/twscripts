function abrirJanelaGrupo() {
   UI.InfoMessage('Iniciando...');
   
        
    let aldeiasSelecionadas = [];
    let gruposManuais = [];
    let listaAldeias = [];

    $.get("/game.php?&screen=groups&mode=overview&ajax=load_group_menu&", function (data) {
        data.result.forEach(elemento => {
            if (elemento.group_id != 0 && elemento.type != "group_dynamic" && elemento.type != "separator") {
                gruposManuais.push({ "group_id": elemento.group_id, "group_name": elemento.name });
                console.log(elemento);
            }
        });
    });

    let tempoAtual = Date.parse(new Date());
    let dadosAldeias;

    if (localStorage.getItem("barbmapVillageTime") != null) {
        let tempoSalvo = localStorage.getItem("barbmapVillageTime");
        if (tempoAtual >= parseInt(tempoSalvo) + 60 * 60 * 24 * 1000) {
            $.get("map/village.txt", function (data) {
                dadosAldeias = data;
                localStorage.setItem("barbmapVillageTime", Date.parse(new Date()));
                localStorage.setItem("barbmapVillageTxt", data);
            }).done(function () {
                processarDados(dadosAldeias);
            });
        } else {
            let dados = localStorage.getItem("barbmapVillageTxt");
            processarDados(dados);
        }
    } else {
        $.get("map/village.txt", function (data) {
            dadosAldeias = data;
            localStorage.setItem("barbmapVillageTime", Date.parse(new Date()));
            localStorage.setItem("barbmapVillageTxt", data);
        }).done(function () {
            processarDados(dadosAldeias);
        });
    }

    let htmlCoordenadas = `<div class="vis">
        <table class="vis">
            <textarea id="campoCoordenadas" cols="30" rows="6" placeholder="Digite as coordenadas aqui (Ctrl+V)"></textarea>
            <center>
                <button type="button" class="btn" onclick="colarCoordenadas()">Colar</button>
                <button type="button" class="btn" onclick="importarCoordenadas()">Importar</button>
                <button type="button" class="btn" onclick="limparCoordenadas()">Limpar</button>
                
            </center>
        </table>
    </div>`;
    Dialog.show("campoCoordenadas", htmlCoordenadas);

    function importarCoordenadas() {
        let coordenadasTexto = $("#campoCoordenadas")[0].value.match(/\d+\|\d+/g);
        let coordenadasSeparadas = [];

        coordenadasTexto?.forEach(coord => {
            let partes = coord.split("|");
            coordenadasSeparadas.push({ "x": partes[0], "y": partes[1] });
        });

        coordenadasSeparadas.forEach(coord => {
            listaAldeias.forEach(aldeia => {
                if (aldeia[2] == coord.x && aldeia[3] == coord.y) {
                    if (aldeia[4] == game_data.player.id) {
                        aldeiasSelecionadas.push({ "id": aldeia[0], "name": aldeia[1] });
                    }
                }
            });
        });

        aldeiasSelecionadas = removerDuplicados(aldeiasSelecionadas, 'id');

        let formulario = `<form action="/game.php?village=${game_data.village.id}&screen=overview_villages&action=bulk_edit_villages&mode=groups&type=static&partial" method="post">
            <table class="vis overview_table" width="100%" id="group_assign_table">`;

        aldeiasSelecionadas.forEach(aldeia => {
            formulario += `<tr><td><input type="checkbox" name="village_ids[]" value="${aldeia.id}" checked> ${decodeURIComponent(aldeia.name.replaceAll("+", " "))}</td></tr>`;
        });

        formulario += `</table>
            <p>Selecionar grupo:</p>
            <select name="selected_group">`;

        gruposManuais.forEach(grupo => {
            formulario += `<option value="${grupo.group_id}">${grupo.group_name}</option>`;
        });

        formulario += `</select><br><br>
            <input class="btn" type="submit" name="add_to_group" value="Adicionar ao grupo">
            <input class="btn" type="submit" name="remove_from_group" value="Remover do grupo">
            <input type="hidden" name="h" value="${csrf_token}">
        </form>`;

        Dialog.show("formularioGrupo", formulario);
    }

    function limparCoordenadas() {
        document.getElementById("campoCoordenadas").value = "";
    }

    function colarCoordenadas() {
        navigator.clipboard.readText().then(texto => {
            document.getElementById("campoCoordenadas").value = texto;
        }).catch(err => {
            UI.ErrorMessage("Erro ao colar da área de transferência.");
            console.error("Erro ao colar:", err);
        });
    }

    function processarDados(lista) {
        listaAldeias = CSVParaArray(lista);
    }

    function CSVParaArray(strData, delimitador) {
        delimitador = (delimitador || ",");
        let padrao = new RegExp(
            ("(\\" + delimitador + "|\\r?\\n|\\r|^)" +
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
                "([^\"\\" + delimitador + "\\r\\n]*))"),
            "gi"
        );
        let arrDados = [[]];
        let resultado = null;
        while (resultado = padrao.exec(strData)) {
            let separadorEncontrado = resultado[1];
            if (separadorEncontrado.length && separadorEncontrado !== delimitador) {
                arrDados.push([]);
            }
            let valorLido = resultado[2] ? resultado[2].replace(/\"\"/g, "\"") : resultado[3];
            arrDados[arrDados.length - 1].push(valorLido);
        }
        return arrDados;
    }

    function removerDuplicados(array, chave) {
        return [...new Map(array.map(item => [item[chave], item])).values()];
    }

    window.importarCoordenadas = importarCoordenadas;
    window.limparCoordenadas = limparCoordenadas;
    window.colarCoordenadas = colarCoordenadas;
}

window.abrirJanelaGrupo = abrirJanelaGrupo;
