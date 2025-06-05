/*(function () {
  function abrirJanelaContador() {
    if (!window.location.href.includes('screen=overview_villages')) {
      UI.InfoMessage('Acesse "overview_villages" para usar o Total de Tropas.');
      return;
    }*/

    if (!window.contadorTropas) window.contadorTropas = {};
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
    window.contadorTropas.nomesUnidades = [
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

    window.contadorTropas.imagensUnidades = [
      "spear","sword","axe","archer","spy","light","marcher","heavy","ram","catapult","knight","snob"
    ];

    window.contadorTropas.linkBase = `/game.php?&village=${game_data.village.id}&type=complete&mode=units&group=0&page=-1&screen=overview_villages`;
    // Se for sitter, ajusta link
    if (game_data.player.sitter != 0) {
      window.contadorTropas.linkBase = `/game.php?t=${game_data.player.id}&village=${game_data.village.id}&type=complete&mode=units&group=0&page=-1&screen=overview_villages`;
    }

    window.contadorTropas.gruposCarregados = false;
    window.contadorTropas.tabelaDados = null;
    window.contadorTropas.somaTropas = [];
    let filtroAtual = "0";

    // Monta janela de diálogo
    const $html = `
      <h2 align='center'>${lang[0]}</h2>
      <table width='100%'>
          <tr>
              <th>${lang[1]}<select id='listaGrupos' onchange="contadorTropas.linkBase = this.value; buscarDados();">
                  <option value='${window.contadorTropas.linkBase}'>${lang[2]}</option>
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
    window.exportarDados = function () {
      const container = document.getElementById("tropasDisponiveis");
      if (!container.innerHTML.includes("textarea")) {
        container.innerHTML = window.contadorTropas.exportarTexto;
      } else {
        alterarFiltro(filtroAtual);
      }
    };

    // Função para buscar os dados via XMLHttpRequest
    window.buscarDados = function () {
      document.getElementById("contadorAldeias").innerHTML = lang[11];
      (mobile ? document.getElementById("loading") : document.getElementById("loading_content")).style.display = "block";

      const xhr = new XMLHttpRequest();
      xhr.open("GET", window.contadorTropas.linkBase, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          const resposta = document.createElement("body");
          resposta.innerHTML = xhr.responseText;

          window.contadorTropas.tabelaDados = resposta.querySelector("#units_table");
          if (!window.contadorTropas.tabelaDados) {
            document.getElementById("tropasDisponiveis").innerHTML = lang[12];
            document.getElementById("contadorAldeias").innerHTML = lang[13];
            return;
          }

          const grupoElementos = resposta.querySelector(".vis_item").children;
          if (window.contadorTropas.tabelaDados.rows.length > 4000) alert(lang[14]);

          if (!window.contadorTropas.gruposCarregados) {
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
            window.contadorTropas.gruposCarregados = true;

            // Remove unidades que não existem na tabela para evitar erros
            if (!window.contadorTropas.tabelaDados.rows[0].innerHTML.includes("archer")) {
              ["archer","marcher"].forEach(img => {
                const idx = window.contadorTropas.imagensUnidades.indexOf(img);
                if (idx > -1) window.contadorTropas.imagensUnidades.splice(idx, 1);
              });
            }
            if (!window.contadorTropas.tabelaDados.rows[0].innerHTML.includes("knight")) {
              const idx = window.contadorTropas.imagensUnidades.indexOf("knight");
              if (idx > -1) window.contadorTropas.imagensUnidades.splice(idx, 1);
            }
          }
          somarTropas();
          alterarFiltro(filtroAtual);
        }
      };
      xhr.send(null);
    };

    // Função para alterar filtro e atualizar visualização
    window.alterarFiltro = function (valor) {
      filtroAtual = valor;
      const indices = String(valor).match(/\d+/g) || [];
      const letras = String(valor).match(/[a-z]/g) || [];
      let somaFiltrada = new Array(window.contadorTropas.imagensUnidades.length).fill(0);

      for (let i = 0; i < indices.length; i++) {
        if (i === 0 || letras[i - 1] === "p") {
          somaFiltrada = somarArrays(somaFiltrada, window.contadorTropas.somaTropas[indices[i]]);
        } else {
          somaFiltrada = subtrairArrays(somaFiltrada, window.contadorTropas.somaTropas[indices[i]]);
        }
      }
      mostrarResultado(somaFiltrada);
    };

    // Soma as tropas por grupo (divide em 5 grupos cíclicos)
    function somarTropas() {
      for (let i = 0; i < 5; i++) {
        window.contadorTropas.somaTropas[i] = new Array(window.contadorTropas.imagensUnidades.length).fill(0);
      }
      for (let i = 1; i < window.contadorTropas.tabelaDados.rows.length; i++) {
        const desloc = (window.contadorTropas.tabelaDados.rows[1].cells.length === window.contadorTropas.tabelaDados.rows[i].cells.length) ? 2 : 1;
        for (let j = desloc; j < window.contadorTropas.imagensUnidades.length + desloc; j++) {
          window.contadorTropas.somaTropas[(i - 1) % 5][j - desloc] += parseInt(window.contadorTropas.tabelaDados.rows[i].cells[j].textContent);
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
      window.contadorTropas.exportarTexto = "<textarea rows='7' cols='25' onclick='this.select();'>";
      for (let i = 0; i < window.contadorTropas.imagensUnidades.length; i++) {
        window.contadorTropas.exportarTexto += `[unit]${window.contadorTropas.imagensUnidades[i]}[/unit]${soma[i]}${i % 2 === 0 ? gerarEspaco(soma[i]) : "\n"}`;
        if (i % 2 === 0) html += "<tr>";
        html += `<th width='20'><a href='${lang[15]}${window.contadorTropas.nomesUnidades[i]}' target='_blank'><img src='${image_base}unit/unit_${window.contadorTropas.imagensUnidades[i]}.png'></a><td bgcolor='#fff5da'>${soma[i]}`;
      }
      window.contadorTropas.exportarTexto += "</textarea>";
      document.getElementById("tropasDisponiveis").innerHTML = html;
      (mobile ? document.getElementById("loading") : document.getElementById("loading_content")).style.display = "none";

      const qtdAldeias = (window.contadorTropas.tabelaDados.rows.length - 1) / 5;
      document.getElementById("contadorAldeias").innerHTML = lang[16] + qtdAldeias + lang[17];
    }

    // Inicia a busca de dados ao abrir a janela
    buscarDados();
  }

  window.abrirJanelaContador = abrirJanelaContador;
})();
