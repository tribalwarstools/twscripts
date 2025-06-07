(function () {
  // Tropas fixas no código — ajuste como quiser
  var unidadesFixas = {
    spear: [0, 0],
    sword: [0, 0],
    axe: [0, 0],
    archer: [0, 0],
    spy: [5, 0],       // spy fixo aqui
    light: [0, 0],
    marcher: [0, 0],
    heavy: [0, 0],
    ram: [0, 0],
    catapult: [0, 0],
    knight: [0, 0],
    snob: [0, 0]
  };

  // Função para abrir a janela para inserir coordenadas
  function abrirJanelaCoordenadas() {
    const html = `
      <div class="vis">
        <h3>Inserir Coordenadas</h3>
        <p>Insira as coordenadas no formato <b>000|000</b>, separadas por espaço ou nova linha:</p>
        <textarea id="campoCoordenadas" style="width: 95%; height: 80px;"></textarea>
        <br><br>
        <button class="btn btn-confirm-yes" onclick="importarCoordenadas()">Salvar Coordenadas</button>
        <button class="btn" onclick="limparCampos()">Limpar</button>
        <button class="btn" onclick="Dialog.close()">Fechar</button>
      </div>
    `;
    Dialog.show("janela_coordenadas", html);

    // Se já houver coordenadas salvas, mostra no textarea
    const coordsSalvas = localStorage.getItem("coordenadasSalvas");
    if (coordsSalvas) {
      document.getElementById("campoCoordenadas").value = coordsSalvas;
    }
  }

  // Função para salvar coordenadas no localStorage (cache)
  window.importarCoordenadas = function () {
    const campo = document.getElementById("campoCoordenadas");
    const coords = campo.value.match(/\d{3}\|\d{3}/g) || [];
    if (coords.length === 0) {
      UI.ErrorMessage("Nenhuma coordenada válida encontrada.");
      return;
    }
    localStorage.setItem("coordenadasSalvas", coords.join(" "));
    UI.SuccessMessage(`Salvo ${coords.length} coordenadas.`);
    Dialog.close();
  };

  // Limpa textarea
  window.limparCampos = function () {
    document.getElementById("campoCoordenadas").value = "";
  };

  // Script principal para usar as coordenadas salvas e tropas fixas
  function executarEnvio() {
    var win = window.frames.length > 0 ? window.main : window,
      data = win.game_data;

    var coordsSalvas = localStorage.getItem("coordenadasSalvas") || "";
    var coordsArray = coordsSalvas ? coordsSalvas.split(" ") : [];

    var options = {
      coords: coordsSalvas,
      protect: false,
      getCoords: false,
      villagePoints: {
        min: 0,
        max: 999999
      }
    };

    var func = {
      insert: function (n, a) {
        win.$("[name=" + n + "]").val(a);
      },
      total: function (n) {
        return win.$("input[name=" + n + "]").next().text().match(/([0-9]+)/)[1];
      },
      redir: function (n) {
        location.search = "?village=" + data.village.id + "&screen=" + n;
      },
      check: function (n) {
        return win.$("input[name=" + n + "]").length > 0 ? 1 : 0;
      }
    };

    if (data.screen == "place") {
      if (win.$("div[style=red]").length > 0) {
        win.$("div[style*=red]").remove();
        win.$("[name=x]").val("");
        win.$("[name=y]").val("");
      }

      if (options.protect && win.$("[width=300] [href*=player]").length > 0) {
        func.redir("place");
      } else {
        if ("" == win.$("[name=x]").val() && win.$("[name=support]").length > 0) {
          win.$.each(unidadesFixas, function (n, a) {
            if (func.check(n)) {
              a[1]
                ? func.insert(n, func.total(n))
                : func.insert(n, a[0]);
            }
          });

          if (coordsArray.length === 0) {
            UI.ErrorMessage("Nenhuma coordenada salva. Abra a janela para inserir.");
            abrirJanelaCoordenadas();
            return;
          }

          var nomeCookie = "FastFarm_" + data.world;
          var num = win.$.cookie(nomeCookie);
          if (null == num || num >= coordsArray.length) {
            num = 0;
          }

          var coord = coordsArray[num].split("|");
          func.insert("x", coord[0]);
          func.insert("y", coord[1]);
          win.$.cookie(nomeCookie, parseInt(num) + 1, { expires: 10 });
          win.$("[name=attack]").click();
        } else {
          win.$("[name=submit]").click();
        }
      }
    } else {
      func.redir("place");
    }
  }

  // Expor funções globais para uso externo (ex: console)
  window.abrirJanelaCoordenadas = abrirJanelaCoordenadas;
  window.executarEnvio = executarEnvio;

  // Você pode chamar aqui para abrir a janela direto
  // abrirJanelaCoordenadas();

})();
