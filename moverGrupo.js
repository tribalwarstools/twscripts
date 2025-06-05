(function () {
  function abrirJanelaGrupo() {
    if (!window.location.href.includes('screen=overview_villages')) {
      UI.InfoMessage('Acesse janela de grupos');
      return;
    }


let aldeiasSelecionadas = [];
let gruposManuais = [];

// Obter IDs dos grupos manuais
$.get("/game.php?&screen=groups&mode=overview&ajax=load_group_menu&", function (data) {
    data.result.forEach(elemento => {
        if (elemento.group_id != 0 && elemento.type != "group_dynamic" && elemento.type != "separator") {
            gruposManuais.push({ "group_id": elemento.group_id, "group_name": elemento.name });
            console.log(elemento);
        }
    });
});

// Carregar dados das aldeias
let tempoAtual = Date.parse(new Date());
let dadosAldeias;

if (localStorage.getItem("barbmapVillageTime") != null) {
    let tempoSalvo = localStorage.getItem("barbmapVillageTime");
    if (tempoAtual >= parseInt(tempoSalvo) + 60 * 60 * 24 * 1000) {
        console.log("Tempo expirado, coletando novamente os dados das aldeias");
        $.get("map/village.txt", function (data) {
            dadosAldeias = data;
            localStorage.setItem("barbmapVillageTime", Date.parse(new Date()));
            localStorage.setItem("barbmapVillageTxt", data);
        }).done(function () {
            processarDados(dadosAldeias);
        });
    } else {
        console.log("Ainda dentro do prazo, usando dados antigos");
        let dados = localStorage.getItem("barbmapVillageTxt");
        processarDados(dados);
    }
} else {
    console.log("Coletando village.txt pela primeira vez");
    $.get("map/village.txt", function (data) {
        dadosAldeias = data;
        localStorage.setItem("barbmapVillageTime", Date.parse(new Date()));
        localStorage.setItem("barbmapVillageTxt", data);
    }).done(function () {
        processarDados(dadosAldeias);
    });
}

// Utilitário para converter CSV em array
function CSVParaArray(strData, delimitador) {
    delimitador = (delimitador || ",");
    var padrao = new RegExp(
        ("(\\" + delimitador + "|\\r?\\n|\\r|^)" +
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
        "([^\"\\" + delimitador + "\\r\\n]*))"),
        "gi"
    );
    var arrDados = [[]];
    var resultado = null;
    while (resultado = padrao.exec(strData)) {
        var separadorEncontrado = resultado[1];
        if (separadorEncontrado.length && separadorEncontrado !== delimitador) {
            arrDados.push([]);
        }
        var valorLido = resultado[2] ? resultado[2].replace(/\"\"/g, "\"") : resultado[3];
        arrDados[arrDados.length - 1].push(valorLido);
    }
    return arrDados;
}

// Criar interface para inserção de coordenadas
let htmlCoordenadas = `<div class="vis">
	<table class="vis">
		<textarea id="campoCoordenadas" cols="60" rows="12" placeholder="Digite as coordenadas aqui"></textarea>
		<center><button type="button" class="btn btn-confirm-yes" onclick="importarCoordenadas()">Selecionar coordenadas</button></center>
	</table>
</div>`;
Dialog.show("campoCoordenadas", htmlCoordenadas);

function importarCoordenadas() {
    let coordenadasTexto = $("#campoCoordenadas")[0].value.match(/\d+\|\d+/g);
    console.log(coordenadasTexto);
    let coordenadasSeparadas = [];

    coordenadasTexto.forEach(coord => {
        let partes = coord.split("|");
        coordenadasSeparadas.push({ "x": partes[0], "y": partes[1] });
    });

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

    // Criar formulário para enviar aldeias ao grupo
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

function processarDados(lista) {
    listaAldeias = CSVParaArray(lista);
}

function removerDuplicados(array, chave) {
    return [...new Map(array.map(item => [item[chave], item])).values()];
}
 window.abrirJanelaGrupo = abrirJanelaGrupo;
})();

