(function () {
  // Tropas fixas no código
  var unidadesFixas = {
    spear: [0, 0],
    sword: [0, 0],
    axe: [0, 0],
    archer: [0, 0],
    spy: [5, 0],
    light: [0, 0],
    marcher: [0, 0],
    heavy: [0, 0],
    ram: [0, 0],
    catapult: [0, 0],
    knight: [0, 0],
    snob: [0, 0],
  };

  // Abre a janela de inserção de coordenadas
  function abrirJanelaCoordenadas() {
    const html = `
      <div class="vis">
        <h3>Inserir Coordenadas</h3>
        <p>Insira as coordenadas no formato <b>000|000</b>, separadas por espaço ou nova linha:</p>
        <textarea id="campoCoordenadas" style="width: 95%; height: 80px;"></textarea>
        <br><br>
        <button class="btn btn-confirm-yes" id="btnSalvar">Salvar Coordenadas</button>
        <button class="btn" id="btnLimpar">Limpar</button>
        <button class="btn" id="btnFechar">Fechar</button>
      </div>
    `;
    Dialog.show("janela_coordenadas", html);

    const coordsSalvas = localStorage.getItem("coordenadasSalvas");
    if (coordsSalvas) {
      document.getElementById("campoCoordenadas").value = coordsSalvas;
    }

    document.getElementById("btnSalvar").addEventListener("click", function () {
      const campo = document.getElementById("campoCoordenadas");
      const coords = campo.value.match(/\d{3}\|\d{3}/g) || [];
      if (coords.length === 0) {
        UI.ErrorMessage("Nenhuma coordenada válida encontrada.");
        return;
      }
      localStorage.setItem("coordenadasSalvas", coords.join(" "));
      UI.SuccessMessage(`Salvo ${coords.length} coordenadas.`);
      Dialog.close();
      executarEnvio(); // chama o envio logo depois de salvar
    });

    document.getElementById("btnLimpar").addEventListener("click", function () {
      document.getElementById("campoCoordenadas").value = "";
    });

    document.getElementById("btnFechar").addEventListener("click", function () {
      Dialog.close();
    });
  }

  // Função principal para executar o envio
  function executarEnvio() {
    var win = window.frames.length > 0 ? window.main : window,
      data = win.game_data;

    var coordsSalvas = localStorage.getItem("coordenadasSalvas") || "";
    var coordsArray = coordsSalvas ? coordsSalvas.split(" ") : [];

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
      },
    };

    if (data.screen == "place") {
      if (win.$("div[style=red]").length > 0) {
        win.$("div[style*=red]").remove();
        win.$("[name=x]").val("");
        win.$("[name=y]").val("");
      }

      if ("" == win.$("[name=x]").val() && win.$("[name=support]").length > 0) {
        win.$.each(unidadesFixas, function (n, a) {
          if (func.check(n)) {
            func.insert(n, a[0]);
          }
        });

        if (coordsArray.length === 0) {
          UI.ErrorMessage("Nenhuma coordenada salva. Abrindo janela para inserir.");
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
    } else {
      func.redir("place");
    }
  }

  // Inicia abrindo a janela de coordenadas
  abrirJanelaCoordenadas();

  // Expõe funções no window para uso manual se quiser
  window.abrirJanelaCoordenadas = abrirJanelaCoordenadas;
  window.executarEnvio = executarEnvio;
})();
