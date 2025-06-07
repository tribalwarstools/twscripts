function abrirJanelaGrupo() {
    if (!window.location.href.includes('screen=overview_villages')) {
        UI.InfoMessage('Acesse "overview_villages" para usar o Total de Tropas.');
        return;
    }

    let aldeiasSelecionadas = [];
    let gruposManuais = [];
    let listaAldeias = [];

    // Obter IDs dos grupos manuais
    $.get("/game.php?&screen=groups&mode=overview&ajax=load_group_menu&", function (data) {
        data.result.forEach(elemento => {
            if (elemento.group_id != 0 && elemento.type != "group_dynamic" && elemento.type != "separator") {
                gruposManuais.push({ "group_id": elemento.group_id, "group_name": elemento.name });
            }
        });
    });

    // Carregar dados das aldeias
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

    // Criar interface para inserção de coordenadas
    let htmlCoordenadas = `<div class="vis">
        <table class="vis">
            <textarea id="campoCoordenadas" cols="30" rows="6" placeholder="Digite as coordenadas aqui o cole-as"></textarea>
            <center><button type="button" class="btn btn-confirm-yes" onclick="importarCoordenadas()">Importar</button></center>
        </table>
    </div>`;
    Dialog.show("campoCoordenadas", htmlCoordenadas);

    // Função para importar coordenadas e mostrar formulário de grupos
    function importarCoordenadas() {
        let coordenadasTexto = $("#campoCoordenadas")[0].value.match(/\d+\|\d+/g);
        let coordenadasSeparadas = [];

        coordenadasTexto?.forEach(coord => {
            let partes = coord.split("|");
            coordenadasSeparadas.push({ "x": partes[0], "y": partes[1] });
        });

        aldeiasSelecionadas = []; // reset

        coordenadasSeparadas.forEach(coord => {
            listaAldeias.forEach(aldeia => {
                if (aldeia[2] == coord.x && aldeia[3] == coord.y) {
                    if (aldeia[4] == game_data.player.id) {
                        aldeiasSelecionadas.push({ "id": aldeia[0], "name": aldeia[1] });
                    } else {
                        console.log("Não somos donos desta aldeia");
                    }
                }
            });
        });

        aldeiasSelecionadas = removerDuplicados(aldeiasSelecionadas, 'id');

        // Criar formulário com botões para adicionar, remover e mover aldeias entre grupos
        let formulario = `<form id="formGrupo" action="/game.php?village=${game_data.village.id}&screen=overview_villages&action=bulk_edit_villages&mode=groups&type=static&partial" method="post">
            <table class="vis overview_table" width="100%" id="group_assign_table">`;

        aldeiasSelecionadas.forEach(aldeia => {
            formulario += `<tr><td><input type="checkbox" name="village_ids[]" value="${aldeia.id}" checked> ${decodeURIComponent(aldeia.name.replaceAll("+", " "))}</td></tr>`;
        });

        formulario += `</table>
            <p>Selecionar grupo:</p>
            <select id="selectGrupo" name="selected_group">`;

        gruposManuais.forEach(grupo => {
            formulario += `<option value="${grupo.group_id}">${grupo.group_name}</option>`;
        });

        formulario += `</select><br><br>
            <input class="btn" type="submit" name="add_to_group" value="Adicionar ao grupo">
            <input class="btn" type="submit" name="remove_from_group" value="Remover do grupo">
            <input class="btn" type="button" id="btnMover" value="Mover para o grupo">
            <input type="hidden" name="h" value="${csrf_token}">
        </form>`;

        Dialog.show("formularioGrupo", formulario);

        // Evento do botão mover
        document.getElementById("btnMover").addEventListener("click", moverParaGrupo);
    }

    // Função que faz o mover em duas etapas
    function moverParaGrupo() {
        const form = document.getElementById("formGrupo");
        const selectedGroupId = document.getElementById("selectGrupo").value;
        const villageIds = Array.from(form.querySelectorAll('input[name="village_ids[]"]:checked')).map(i => i.value);

        if (villageIds.length === 0) {
            alert("Selecione pelo menos uma aldeia.");
            return;
        }

        // Primeiro: remover do grupo atual (bulk remove)
        $.post("/game.php?village=" + game_data.village.id + "&screen=overview_villages&action=bulk_edit_villages&mode=groups&type=static&partial", {
            "village_ids[]": villageIds,
            "remove_from_group": "1",
            "selected_group": 0, // remover de todos os grupos
            "h": csrf_token
        }).done(() => {
            // Depois: adicionar ao grupo selecionado
            $.post("/game.php?village=" + game_data.village.id + "&screen=overview_villages&action=bulk_edit_villages&mode=groups&type=static&partial", {
                "village_ids[]": villageIds,
                "add_to_group": "1",
                "selected_group": selectedGroupId,
                "h": csrf_token
            }).done(() => {
                UI.InfoMessage("Aldeias movidas com sucesso!");
                Dialog.close("formularioGrupo");
            }).fail(() => {
                alert("Erro ao adicionar aldeias ao grupo.");
            });
        }).fail(() => {
            alert("Erro ao remover aldeias do grupo.");
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
    window.moverParaGrupo = moverParaGrupo;
}

// Expor a função globalmente para chamar manualmente no console
window.abrirJanelaGrupo = abrirJanelaGrupo;
