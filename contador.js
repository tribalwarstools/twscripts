javascript:
if (!contadorTropas) var contadorTropas = {};
var textoPainel = [];

if (game_data.locale == "pt_BR") {
    textoPainel = [
        "Contador de Tropas",
        "Grupo: ",
        "Todos",
        "Tipo: ",
        "Disponível",
        "Todas as Suas Próprias",
        "Nas Aldeias",
        "Apoios",
        "Fora",
        "Em Trânsito",
        "Exportar",
        " Por favor, aguarde...",
        "Não há aldeias no grupo. <br />Escolha outro grupo.",
        " Vazio",
        "Atenção\nSomente as primeiras 1000 aldeias",
        "https://help.tribalwars.com.br/wiki/",
        "Total de ",
        " aldeias"
    ];
    contadorTropas.nomesUnidades = "Lanceiro,Espadachim,Bárbaro,Arqueiro,Explorador,Cavalaria_Leve,Arqueiro_a_cavalo,Cavalaria_Pesada,Aríete,Catapulta,Paladino,Nobre".split(",");
} else {
    textoPainel = [
        "Troop Counter",
        "Group: ",
        "All",
        "Type: ",
        "Available",
        "All Your Own",
        "In Villages",
        "Support",
        "Outwards",
        "In Transit",
        "Export",
        " Please Wait...",
        "There are no villages in the group. <br />Choose another group.",
        " Empty",
        "Attention\nOnly the first 1000 villages",
        "https://help.tribalwars.net/wiki/",
        "Total of ",
        " villages"
    ];
    contadorTropas.nomesUnidades = "Spear_fighter,Swordsman,Axeman,Archer,Scout,Light_cavalry,Mounted_archer,Heavy_cavalry,Ram,Catapult,Paladin,Nobleman".split(",");
}

var tabela;
var somaTropas = [];
var linhaAtual = "0";

contadorTropas.link = "/game.php?&village=" + game_data.village.id + "&type=complete&mode=units&group=0&page=-1&screen=overview_villages";
if (game_data.player.sitter != 0)
    contadorTropas.link = "/game.php?t=" + game_data.player.id + "&village=" + game_data.village.id + "&type=complete&mode=units&group=0&page=-1&screen=overview_villages";

contadorTropas.gruposCarregados = false;
contadorTropas.iconesUnidades = "spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult,knight,snob".split(",");

// Painel
var painel = "<h2 align='center'>" + textoPainel[0] + "</h2><table width='100%'><tr><th>" + textoPainel[1] + "<select id='listaGrupos' onchange=\"contadorTropas.link = this.value; carregarDados();\"><option value='" + contadorTropas.link + "'>" + textoPainel[2] + "</select>";
painel += "<tr><td><table width='100%'><tr><th colspan='4'>" + textoPainel[3] + "<select onchange=\"mudar(this.value);\"><option value='0'>" + textoPainel[4] + "<option value='0p2p3'>" + textoPainel[5] + "<option value='1'>" + textoPainel[6] + "<option value='1m0'>" + textoPainel[7] + "<option value='2'>" + textoPainel[8] + "<option value='3'>" + textoPainel[9] + "</select><tbody id='tropas_disponiveis'></table><tr><th><b id='qtd_aldeias'></b><a href='#' style='float: right;' onclick=\"exportar();\">" + textoPainel[10] + "</a></table>";
Dialog.show("painel_tropas", painel);

carregarDados();
void 0;

// Funções
function exportar() {
    if (!$("#tropas_disponiveis").html().match("textarea"))
        $("#tropas_disponiveis").html(contadorTropas.exportar);
    else
        mudar(linhaAtual);
}

function carregarDados() {
    $("#qtd_aldeias").html(textoPainel[11]);
    $(mobile ? "#loading" : "#loading_content").show();
    var r = new XMLHttpRequest();
    r.open("GET", contadorTropas.link, true);

    r.onreadystatechange = function () {
        if (r.readyState == 4 && r.status == 200) {
            var bodyTemp = document.createElement("body");
            bodyTemp.innerHTML = r.responseText;
            tabela = $(bodyTemp).find("#units_table").get()[0];
            if (!tabela) {
                $("#tropas_disponiveis").html(textoPainel[12]);
                $("#qtd_aldeias").html(textoPainel[13]);
                return false;
            }
            var grupos = $(bodyTemp).find(".vis_item").get()[0].getElementsByTagName(mobile ? "option" : "a");
            if (tabela.rows.length > 4000) alert(textoPainel[14]);
            if (!contadorTropas.gruposCarregados) {
                for (var i = 0; i < grupos.length; i++) {
                    var nome = grupos[i].textContent;
                    if (mobile && grupos[i].textContent == "todos") continue;
                    $("#listaGrupos").append($("<option>", {
                        value: grupos[i].getAttribute(mobile ? "value" : "href") + "&page=-1",
                        text: mobile ? nome : nome.slice(1, nome.length - 1)
                    }));
                }
                contadorTropas.gruposCarregados = true;
                if (!tabela.rows[0].innerHTML.match("archer")) {
                    contadorTropas.iconesUnidades.splice(contadorTropas.iconesUnidades.indexOf("archer"), 1);
                    contadorTropas.iconesUnidades.splice(contadorTropas.iconesUnidades.indexOf("marcher"), 1);
                }
                if (!tabela.rows[0].innerHTML.match("knight"))
                    contadorTropas.iconesUnidades.splice(contadorTropas.iconesUnidades.indexOf("knight"), 1);
            }
            somar();
            mudar(linhaAtual);
        }
    };
    r.send(null);
}

function mudar(valor) {
    linhaAtual = valor;
    var numeros = String(valor).match(/\d+/g);
    var operacoes = String(valor).match(/[a-z]/g);
    var novaSoma = [];
    for (var j = 0; j < contadorTropas.iconesUnidades.length; j++)
        novaSoma[j] = 0;
    for (var i = 0; i < numeros.length; i++)
        if (i == 0 || operacoes[i - 1] == "p")
            novaSoma = adicionar(novaSoma, somaTropas[numeros[i]]);
        else
            novaSoma = subtrair(novaSoma, somaTropas[numeros[i]]);
    exibir(novaSoma);
}

function somar() {
    for (var i = 0; i < 5; i++) {
        somaTropas[i] = [];
        for (var j = 0; j < contadorTropas.iconesUnidades.length; j++)
            somaTropas[i][j] = 0;
    }
    for (var i = 1; i < tabela.rows.length; i++) {
        var m = (tabela.rows[1].cells.length == tabela.rows[i].cells.length) ? 2 : 1;
        for (var j = m; j < contadorTropas.iconesUnidades.length + m; j++) {
            somaTropas[(i - 1) % 5][j - m] += parseInt(tabela.rows[i].cells[j].textContent);
        }
    }
}

function subtrair(arr1, arr2) {
    var resultado = [];
    for (var k = 0; k < contadorTropas.iconesUnidades.length; k++)
        resultado[k] = arr1[k] - arr2[k];
    return resultado;
}

function adicionar(arr1, arr2) {
    var resultado = [];
    for (var k = 0; k < contadorTropas.iconesUnidades.length; k++)
        resultado[k] = arr1[k] + arr2[k];
    return resultado;
}

function espaçar(num) {
    var txt = String(num);
    var resultado = "";
    for (var j = 0; j < (10 - txt.length); j++)
        resultado += "\u2007";
    return resultado;
}

function exibir(somaFinal) {
    var elem = "<tr>";
    contadorTropas.exportar = "<textarea rows='7' cols='25' onclick=\"this.select();\">";
    for (var i = 0; i < contadorTropas.iconesUnidades.length; i++) {
        contadorTropas.exportar += "[unit]" + contadorTropas.iconesUnidades[i] + "[/unit]" + somaFinal[i] + (i % 2 == 0 ? espaçar(somaFinal[i]) : "\n");
        elem += (i % 2 == 0 ? "<tr>" : "") + "<th width='20'><a href='" + textoPainel[15] + contadorTropas.nomesUnidades[i] + "' target='_blank'><img src='" + image_base + "unit/unit_" + contadorTropas.iconesUnidades[i] + ".png'></a><td bgcolor='#fff5da'>" + somaFinal[i];
    }
    contadorTropas.exportar += "</textarea>";
    $("#tropas_disponiveis").html(elem);
    $(mobile ? "#loading" : "#loading_content").hide();
    $("#qtd_aldeias").html(textoPainel[16] + ((tabela.rows.length - 1) / 5) + textoPainel[17]);
}
