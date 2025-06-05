if (!contadorTropas) var contadorTropas = {};

const textos = [
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
    "Por Favor, Espere...",
    "Não há aldeias no grupo. <br />Escolha outro grupo.",
    "Vazio",
    "Atenção\nSomente as primeiras 1000 aldeias",
    "https://help.tribalwars.com.br/wiki/",
    "Total de ",
    " aldeias"
];

contadorTropas.unidades = "Lanceiro,Espadachim,Bárbaro,Arqueiro,Explorador,Cavalaria_Leve,Arqueiro_a_cavalo,Cavalaria_Pesada,Aríete,Catapulta,Paladino,Nobre".split(",");

contadorTropas.imagensUnidades = "spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult,knight,snob".split(",");

contadorTropas.linkBase = "/game.php?&village=" + game_data.village.id + "&type=complete&mode=units&group=0&page=-1&screen=overview_villages";

if (game_data.player.sitter != 0)
    contadorTropas.linkBase = "/game.php?t=" + game_data.player.id + "&village=" + game_data.village.id + "&type=complete&mode=units&group=0&page=-1&screen=overview_villages";

contadorTropas.gruposCarregados = false;

let tabelaUnidades;
let somaTropasPorTipo = [];
let filtroAtual = "0";

const montarPainel = () => {
    let painel = `<h2 align='center'>${textos[0]}</h2>`;
    painel += `<table width='100%'><tr><th>${textos[1]}<select id='listaGrupos' onchange="contadorTropas.linkBase = this.value; carregarDados();"><option value='${contadorTropas.linkBase}'>${textos[2]}</option></select></th></tr>`;
    painel += `<tr><td><table width='100%'><tr><th colspan='4'>${textos[3]}<select onchange="alterarFiltro(this.value);"><option value='0'>${textos[4]}</option><option value='0p2p3'>${textos[5]}</option><option value='1'>${textos[6]}</option><option value='1m0'>${textos[7]}</option><option value='2'>${textos[8]}</option><option value='3'>${textos[9]}</option></select></th></tr><tbody id='tropasDisponiveis'></tbody></table>`;
    painel += `<tr><th><b id='quantidadeAldeias'></b><a href='#' style='float: right;' onclick="exportar();">${textos[10]}</a></th></tr></table>`;
    Dialog.show("janelaContadorTropas", painel);
    carregarDados();
}

function exportar() {
    if (!$("#tropasDisponiveis").html().includes("textarea"))
        $("#tropasDisponiveis").html(contadorTropas.exportacao);
    else
        alterarFiltro(filtroAtual);
}

function carregarDados() {
    $("#quantidadeAldeias").html(textos[11]);
    $(mobile ? "#loading" : "#loading_content").show();

    let requisicao = new XMLHttpRequest();
    requisicao.open("GET", contadorTropas.linkBase, true);

    requisicao.onreadystatechange = () => {
        if (requisicao.readyState == 4 && requisicao.status == 200) {
            let corpoResposta = document.createElement("body");
            corpoResposta.innerHTML = requisicao.responseText;
            tabelaUnidades = $(corpoResposta).find("#units_table").get(0);
            if (!tabelaUnidades) {
                $("#tropasDisponiveis").html(textos[12]);
                $("#quantidadeAldeias").html(textos[13]);
                return;
            }
            let grupos = $(corpoResposta).find(".vis_item").get(0).getElementsByTagName(mobile ? "option" : "a");
            if (tabelaUnidades.rows.length > 4000) alert(textos[14]);

            if (!contadorTropas.gruposCarregados) {
                for (let i = 0; i < grupos.length; i++) {
                    let nomeGrupo = grupos[i].textContent;
                    if (mobile && nomeGrupo === "wszystkie") continue;
                    $("#listaGrupos").append($("<option>", {
                        value: grupos[i].getAttribute(mobile ? "value" : "href") + "&page=-1",
                        text: mobile ? nomeGrupo : nomeGrupo.slice(1, nomeGrupo.length - 1)
                    }));
                }
                contadorTropas.gruposCarregados = true;

                if (!tabelaUnidades.rows[0].innerHTML.includes("archer")) {
                    contadorTropas.imagensUnidades = contadorTropas.imagensUnidades.filter(img => img !== "archer" && img !== "marcher");
                }
                if (!tabelaUnidades.rows[0].innerHTML.includes("knight")) {
                    contadorTropas.imagensUnidades = contadorTropas.imagensUnidades.filter(img => img !== "knight");
                }
            }
            somarTropas();
            alterarFiltro(filtroAtual);
        }
    };
    requisicao.send(null);
}

function alterarFiltro(valor) {
    filtroAtual = valor;
    let indices = String(valor).match(/\d+/g);
    let operacoes = String(valor).match(/[a-z]/g);
    let somaAtual = new Array(contadorTropas.imagensUnidades.length).fill(0);

    for (let i = 0; i < indices.length; i++) {
        if (i === 0 || (operacoes && operacoes[i - 1] === "p")) {
            somaAtual = somarVetores(somaAtual, somaTropasPorTipo[indices[i]]);
        } else {
            somaAtual = subtrairVetores(somaAtual, somaTropasPorTipo[indices[i]]);
        }
    }
    mostrarTropas(somaAtual);
}

function somarTropas() {
    for (let i = 0; i < 5; i++) {
        somaTropasPorTipo[i] = new Array(contadorTropas.imagensUnidades.length).fill(0);
    }

    for (let i = 1; i < tabelaUnidades.rows.length; i++) {
        // Ajuste do índice da célula: depende se tem coluna extra (ex: botão)
        let inicioColunas = (tabelaUnidades.rows[1].cells.length === tabelaUnidades.rows[i].cells.length) ? 2 : 1;
        for (let j = inicioColunas; j < contadorTropas.imagensUnidades.length + inicioColunas; j++) {
            somaTropasPorTipo[(i - 1) % 5][j - inicioColunas] += parseInt(tabelaUnidades.rows[i].cells[j].textContent);
        }
    }
}

function subtrairVetores(v1, v2) {
    return v1.map((val, idx) => val - v2[idx]);
}

function somarVetores(v1, v2) {
    return v1.map((val, idx) => val + v2[idx]);
}

function formatarEspaco(valor) {
    const texto = String(valor);
    const espacos = 10 - texto.length;
    return "\u2007".repeat(espacos);
}

function mostrarTropas(somaTropas) {
    let html = "<tr>";
    contadorTropas.exportacao = "<textarea rows='7' cols='25' onclick='this.select();'>";

    for (let i = 0; i < contadorTropas.imagensUnidades.length; i++) {
        contadorTropas.exportacao += `[unit]${contadorTropas.imagensUnidades[i]}[/unit]${somaTropas[i]}${(i % 2 === 0) ? formatarEspaco(somaTropas[i]) : "\n"}`;
        html += (i % 2 === 0 ? "<tr>" : "") + `<th width='20'><a href='${textos[15]}${contadorTropas.unidades[i]}' target='_blank'><img src='${image_base}unit/unit_${contadorTropas.imagensUnidades[i]}.png'></a><td bgcolor='#fff5da'>${somaTropas[i]}</td>`;
    }

    contadorTropas.exportacao += "</textarea>";
    $("#tropasDisponiveis").html(html);
    $(mobile ? "#loading" : "#loading_content").hide();
    $("#quantidadeAldeias").html(`${textos[16]}${((tabelaUnidades.rows.length - 1) / 5)}${textos[17]}`);
}
