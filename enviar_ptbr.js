// Versão em Português (pt-BR) com variáveis renomeadas

var capacidadeArmazem = [];
var totalMadeira = [];
var totalArgila = [];
var totalFerro = [];
var comerciantesDisponiveis = [];
var comerciantesTotais = [];
var populacaoUsada = [];
var populacaoTotal = [];
var dadosAldeias = [];
var objetosMadeira, objetosArgila, objetosFerro, objetosAldeias;
var totaisEMedias = "";
var dados, somaMadeira = 0, somaArgila = 0, somaFerro = 0, limiteRecursos = 0;
var dadosDestino;
var enviadosMadeira = 0, enviadosArgila = 0, enviadosFerro = 0;

if (typeof percentualMadeira == 'undefined') {
    percentualMadeira = 28000 / 83000;
    percentualArgila = 30000 / 83000;
    percentualFerro = 25000 / 83000;
}

var corFundo = "#36393f";
var corBorda = "#3e4147";
var corCabecalho = "#202225";
var corTitulo = "#ffffdf";

var textoInterface = [
    "Enviar recursos para cunhagem de moedas",
    "Insira coordenada para enviar recursos",
    "Salvar",
    "Criador",
    "Jogador",
    "Aldeia",
    "Pontos",
    "Enviar para",
    "Manter % no armazém",
    "Recalcular transporte",
    "Enviar recursos",
    "Origem",
    "Destino",
    "Distância",
    "Madeira",
    "Argila",
    "Ferro",
    "Enviar recursos",
    "Criado por Sophie 'Shinko to Kuma'"
];

var estiloInterface = `
<style>
.linhaA {
    background-color: #32353b;
    color: white;
}
.linhaB {
    background-color: #36393f;
    color: white;
}
.cabecalho {
    background-color: #202225;
    font-weight: bold;
    color: white;
}
</style>`;

$("#contentContainer").eq(0).prepend(estiloInterface);
$("#mobileHeader").eq(0).prepend(estiloInterface);

function perguntarCoordenada() {
    var conteudo = `<div style=max-width:1000px;>
        <h2 class="popup_box_header">
           <center><u>
              <font color="darkgreen">${textoInterface[0]}</font>
              </u>
           </center>
        </h2>
        <hr>
        <p>
        <center>
           <font color=maroon><b>${textoInterface[1]}</b>
           </font>
        </center>
        </p>
        <center>
            <table>
                <tr><td><center><input type="text" id="coordenadaInicial" size="20"></center></td></tr>
                <tr><td><center><input type="button" class="btn evt-cancel-btn btn-confirm-yes" id="botaoSalvarCoordenada" value="${textoInterface[2]}"></center></td></tr>
            </table>
        </center>
        <br>
        <hr>
        <center>
            <img src="https://dl.dropboxusercontent.com/s/bxoyga8wa6yuuz4/sophie2.gif" style="cursor:help; position: relative">
            <p>${textoInterface[3]}: <a href="https://shinko-to-kuma.my-free.website/" target="_blank">Sophie "Shinko to Kuma"</a></p>
        </center>
    </div>`;

    Dialog.show('JanelaCoordenada', conteudo);

    $("#botaoSalvarCoordenada").click(function () {
        var coordenada = $("#coordenadaInicial").val().match(/\d+\|\d+/)[0];
        sessionStorage.setItem("coordenada", coordenada);
        $(".popup_box_close").click();
        buscarIdCoordenada(coordenada);
    });
}

function buscarIdCoordenada(coordenada) {
    var urlRequisicao = (game_data.player.sitter > 0)
        ? `game.php?t=${game_data.player.id}&screen=api&ajax=target_selection&input=${coordenada}&type=coord`
        : `/game.php?&screen=api&ajax=target_selection&input=${coordenada}&type=coord`;

    $.get(urlRequisicao, function (json) {
        var dados = parseFloat(game_data.majorVersion) > 8.217 ? json : JSON.parse(json);
        dadosDestino = [
            dados.villages[0].id,
            dados.villages[0].name,
            dados.villages[0].image,
            dados.villages[0].player_name,
            dados.villages[0].points,
            dados.villages[0].x,
            dados.villages[0].y
        ];
        obterDadosAldeias();
    });
}

function obterDadosAldeias() {
    var url = (game_data.player.sitter > 0)
        ? `game.php?t=${game_data.player.id}&screen=overview_villages&mode=prod&page=-1&`
        : "game.php?&screen=overview_villages&mode=prod&page=-1&";

    $.get(url).done(function (pagina) {
        var seletorMadeira = $(pagina).find(".res.wood,.warn_90.wood,.warn.wood");
        var seletorArgila = $(pagina).find(".res.stone,.warn_90.stone,.warn.stone");
        var seletorFerro = $(pagina).find(".res.iron,.warn_90.iron,.warn.iron");
        var seletorAldeias = $(pagina).find(".quickedit-vn");

        for (var i = 0; i < seletorMadeira.length; i++) {
            totalMadeira.push(seletorMadeira[i].textContent.replace(/\./g, '').replace(',', ''));
            totalArgila.push(seletorArgila[i].textContent.replace(/\./g, '').replace(',', ''));
            totalFerro.push(seletorFerro[i].textContent.replace(/\./g, '').replace(',', ''));
            capacidadeArmazem.push(seletorFerro[i].parentElement.nextElementSibling.innerHTML);
            comerciantesDisponiveis.push(seletorFerro[i].parentElement.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[1]);
            comerciantesTotais.push(seletorFerro[i].parentElement.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[2]);
            populacaoUsada.push(seletorFerro[i].parentElement.nextElementSibling.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[1]);
            populacaoTotal.push(seletorFerro[i].parentElement.nextElementSibling.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[2]);
        }

        for (var i = 0; i < seletorAldeias.length; i++) {
            dadosAldeias.push({
                "id": seletorAldeias[i].dataset.id,
                "url": seletorAldeias[i].children[0].children[0].href,
                "coordenada": seletorAldeias[i].innerText.trim().match(/\d+\|\d+/)[0],
                "nome": seletorAldeias[i].innerText.trim(),
                "madeira": totalMadeira[i],
                "argila": totalArgila[i],
                "ferro": totalFerro[i],
                "comerciantesDisponiveis": comerciantesDisponiveis[i],
                "comerciantesTotais": comerciantesTotais[i],
                "capacidadeArmazem": capacidadeArmazem[i],
                "populacaoUsada": populacaoUsada[i],
                "populacaoTotal": populacaoTotal[i]
            });
        }

        montarInterfaceEnvio();
    });
}

function montarInterfaceEnvio() {
    console.log("Interface pronta para envio de recursos.");
}

perguntarCoordenada();
