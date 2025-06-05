if (!window.contadorTropas) var contadorTropas = {};
const lang = [
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
    " Por Favor, Espere...",
    "Não há aldeias no grupo. <br />Escolha outro grupo.",
    " Vazio",
    "Atenção\nSomente as primeiras 1000 aldeias",
    "https://help.tribalwars.com.br/wiki/",
    "Total de ",
    " aldeias"
];

// Unidades no idioma português:
contadorTropas.nomesUnidades = [
    "Lanceiro",
    "Espadachim",
    "Bárbaro",
    "Arqueiro",
    "Explorador",
    "Cavalaria Leve",
    "Arqueiro a Cavalo",
    "Cavalaria Pesada",
    "Aríete",
    "Catapulta",
    "Paladino",
    "Nobre"
];

contadorTropas.imagensUnidades = [
    "spear","sword","axe","archer","spy","light","marcher","heavy","ram","catapult","knight","snob"
];

contadorTropas.linkBase = `/game.php?&village=${game_data.village.id}&type=complete&mode=units&group=0&page=-1&screen=overview_villages`;
// Se for sitter, ajusta link
if (game_data.player.sitter != 0) {
    contadorTropas.linkBase = `/game.php?t=${game_data.player.id}&village=${game_data.village.id}&type=complete&mode=units&group=0&page=-1&screen=overview_villages`;
}

contadorTropas.gruposCarregados = false;
contadorTropas.tabelaDados = null;
contadorTropas.somaTropas = [];
let filtroAtual = "0";

// Monta janela de diálogo
const $html = `
<h2 align='center'>${lang[0]}</h2>
<table width='100%'>
    <tr>
        <th>${lang[1]}<select id='listaGrupos' onchange="contadorTropas.linkBase = this.value; buscarDados();">
            <option value='${contadorTropas.linkBase}'>${lang[2]}</option>
        </select></th>
    </tr>
    <tr>
        <td>
            <table width='100%'>
                <tr>
                    <th colspan='4'>${lang[3]}<select onchange="alterarFiltro(this.value);">
                        <option value='0'>${lang[4]}</option>
                        <option value='0p2p3'>${lang[5]}</option>
                        <option value='1'>${lang[6]}</option>
                        <option value='1m0'>${lang[7]}</option>
                        <option value='2'>${lang[8]}</option>
                        <option value='3'>${lang[9]}</option>
                    </select></th>
                </tr>
                <tbody id='tropasDisponiveis'></tbody>
            </table>
        </td>
    </tr>
    <tr>
        <th><b id='contadorAldeias'></b><a href='#' style='float: right;' onclick="exportarDados();">${lang[10]}</a></th>
    </tr>
</table>
`;

Dialog.show('totaltropas', $html);

// Função para exportar dados, alterna entre exibir textarea e tabela
function exportarDados() {
    const container = document.getElementById("tropasDisponiveis");
    if (!container.innerHTML.includes("textarea")) {
        container.innerHTML = contadorTropas.exportarTexto;
    } else {
        alterarFiltro(filtroAtual);
    }
}

// Função para buscar os dados via XMLHttpRequest
function buscarDados() {
    document.getElementById("contadorAldeias").innerHTML = lang[11];
    (mobile ? document.getElementById("loading") : document.getElementById("loading_content")).style.display = "block";

    const xhr = new XMLHttpRequest();
    xhr.open("GET", contadorTropas.linkBase, true);

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const resposta = document.createElement("body");
            resposta.innerHTML = xhr.responseText;

            contadorTropas.tabelaDados = resposta.querySelector("#units_table");
            if (!contadorTropas.tabelaDados) {
                document.getElementById("tropasDisponiveis").innerHTML = lang[12];
                document.getElementById("contadorAldeias").innerHTML = lang[13];
                return;
            }

            const grupoElementos = resposta.querySelector(".vis_item").children;
            if (contadorTropas.tabelaDados.rows.length > 4000) alert(lang[14]);

            if (!contadorTropas.gruposCarregados) {
                const selectGrupos = document.getElementById("listaGrupos");
                for (let i = 0; i < grupoElementos.length; i++) {
                    const elem = grupoElementos[i];
                    const nomeGrupo = elem.textContent.trim();
                    if (mobile && nomeGrupo.toLowerCase() === "wszystkie") continue; // pular "todos" em mobile

                    const valor = mobile ? elem.value : elem.getAttribute("href");
                    const texto = mobile ? nomeGrupo : nomeGrupo.slice(1, -1);
                    const option = document.createElement("option");
                    option.value = valor + "&page=-1";
                    option.textContent = texto;
                    selectGrupos.appendChild(option);
                }
                contadorTropas.gruposCarregados = true;

                // Remove unidades que não existem na tabela para evitar erros
                if (!contadorTropas.tabelaDados.rows[0].innerHTML.includes("archer")) {
                    ["archer","marcher"].forEach(img => {
                        const idx = contadorTropas.imagensUnidades.indexOf(img);
                        if (idx > -1) contadorTropas.imagensUnidades.splice(idx, 1);
                    });
                }
                if (!contadorTropas.tabelaDados.rows[0].innerHTML.includes("knight")) {
                    const idx = contadorTropas.imagensUnidades.indexOf("knight");
                    if (idx > -1) contadorTropas.imagensUnidades.splice(idx, 1);
                }
            }
            somarTropas();
            alterarFiltro(filtroAtual);
        }
    };
    xhr.send(null);
}

// Função para alterar filtro e atualizar visualização
function alterarFiltro(valor) {
    filtroAtual = valor;
    const indices = String(valor).match(/\d+/g) || [];
    const letras = String(valor).match(/[a-z]/g) || [];
    let somaFiltrada = new Array(contadorTropas.imagensUnidades.length).fill(0);

    for (let i = 0; i < indices.length; i++) {
        if (i === 0 || letras[i - 1] === "p") {
            somaFiltrada = somarArrays(somaFiltrada, contadorTropas.somaTropas[indices[i]]);
        } else {
            somaFiltrada = subtrairArrays(somaFiltrada, contadorTropas.somaTropas[indices[i]]);
        }
    }
    mostrarResultado(somaFiltrada);
}

// Soma as tropas por grupo (divide em 5 grupos cíclicos)
function somarTropas() {
    for (let i = 0; i < 5; i++) {
        contadorTropas.somaTropas[i] = new Array(contadorTropas.imagensUnidades.length).fill(0);
    }
    for (let i = 1; i < contadorTropas.tabelaDados.rows.length; i++) {
        const desloc = (contadorTropas.tabelaDados.rows[1].cells.length === contadorTropas.tabelaDados.rows[i].cells.length) ? 2 : 1;
        for (let j = desloc; j < contadorTropas.imagensUnidades.length + desloc; j++) {
            contadorTropas.somaTropas[(i - 1) % 5][j - desloc] += parseInt(contadorTropas.tabelaDados.rows[i].cells[j].textContent);
        }
    }
}

// Função para subtrair arrays numéricos
function subtrairArrays(a, b) {
    return a.map((val, idx) => val - b[idx]);
}

// Função para somar arrays numéricos
function somarArrays(a, b) {
    return a.map((val, idx) => val + b[idx]);
}

// Espaço fixo para alinhamento na exibição
function gerarEspaco(numero) {
    const texto = String(numero);
    return "\u2007".repeat(10 - texto.length);
}

// Exibe o resultado na tabela e cria o texto para exportar
function mostrarResultado(soma) {
    let html = "";
    contadorTropas.exportarTexto = "<textarea rows='7' cols='25' onclick='this.select();'>";
    for (let i = 0; i < contadorTropas.imagensUnidades.length; i++) {
        contadorTropas.exportarTexto += `[unit]${contadorTropas.imagensUnidades[i]}[/unit]${soma[i]}${i % 2 === 0 ? gerarEspaco(soma[i]) : "\n"}`;
        if (i % 2 === 0) html += "<tr>";
        html += `<th width='20'><a href='${lang[15]}${contadorTropas.nomesUnidades[i]}' target='_blank'><img src='${image_base}unit/unit_${contadorTropas.imagensUnidades[i]}.png'></a><td bgcolor='#fff5da'>${soma[i]}`;
    }
    contadorTropas.exportarTexto += "</textarea>";
    document.getElementById("tropasDisponiveis").innerHTML = html;
    (mobile ? document.getElementById("loading") : document.getElementById("loading_content")).style.display = "none";

    const qtdAldeias = (contadorTropas.tabelaDados.rows.length - 1) / 5;
    document.getElementById("contadorAldeias").innerHTML = lang[16] + qtdAldeias + lang[17];
}

// Inicia a busca de dados ao carregar o script
buscarDados();
