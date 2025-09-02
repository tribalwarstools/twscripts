(function() {
  // === Lista de Scripts ===
  const scripts = [
    {
      nome: 'Comparador(Casual)',
      func: () => {
        $.getScript('https://tribalwarstools.github.io/beta/ComparadorPontCasual.js')
          .done(() => UI.InfoMessage('✅ Script Comparador carregado com sucesso!', 3000, 'success'))
          .fail(() => UI.InfoMessage('❌ Erro ao carregar o script Comparador.', 5000, 'error'));
      },
    },
    {
      nome: 'Construir Edifícios',
      func: () => {
        $.getScript('https://tribalwarstools.github.io/ConstruirEdificios/construirEdificios.js')
          .done(() => UI.InfoMessage('✅ Script Construir Edifícios carregado com sucesso!', 3000, 'success'))
          .fail(() => UI.InfoMessage('❌ Erro ao carregar o script Construir Edifícios.', 5000, 'error'));
      },
    },
    {
      nome: 'Configurar Tropas',
      func: () => {
        $.getScript('https://tribalwarstools.github.io/ConfigTropas/ConfigTropas.js')
          .done(() => UI.InfoMessage('✅ Script Configurar Tropas carregado!', 3000, 'success'))
          .fail(() => UI.InfoMessage('❌ Erro ao carregar script Configurar Tropas.', 5000, 'error'));
      },
    },
    {
      nome: 'Blindagem',
      func: () => {
        $.getScript('https://tribalwarstools.github.io/beta/blindagem.js')
          .done(() => UI.InfoMessage('✅ Script Blindagem carregado!', 3000, 'success'))
          .fail(() => UI.InfoMessage('❌ Erro ao carregar script Blindagem.', 5000, 'error'));
      },
    },
    {
      nome: 'Renomear Aldeias',
      func: () => {
        $.getScript('https://tribalwarstools.github.io/RenomearAldeias/renomearAld.js')
          .done(() => UI.InfoMessage('✅ Script Renomear Aldeias carregado!', 3000, 'success'))
          .fail(() => UI.InfoMessage('❌ Erro ao carregar script Renomear Aldeias.', 5000, 'error'));
      },
    },
  ];

  // === Criar painel ===
  const painel = document.createElement("div");
  painel.id = "tw-painel";
  painel.innerHTML = `
    <div id="tw-toggle">📜</div>
    <div id="tw-conteudo">
      <h4>Painel de Scripts</h4>
    </div>
  `;

  // Estilo
  const css = `
    #tw-painel {
      position: fixed;
      top: 100px;
      left: 0;
      height: auto;
      background: #2b2b2b;
      border: 2px solid #654321;
      border-left: none;
      border-radius: 0 10px 10px 0;
      box-shadow: 2px 2px 8px #000;
      font-family: Verdana, sans-serif;
      color: #f1e1c1;
      z-index: 9999;
      transition: transform 0.3s ease-in-out;
      transform: translateX(-180px);
    }
    #tw-toggle {
      position: absolute;
      top: 0;
      right: -28px;
      width: 28px;
      height: 40px;
      background: #5c4023;
      border: 2px solid #654321;
      border-left: none;
      border-radius: 0 6px 6px 0;
      color: #f1e1c1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 2px 2px 6px #000;
    }
    #tw-conteudo {
      padding: 8px;
      width: 180px;
    }
    #tw-conteudo h4 {
      margin: 0 0 6px 0;
      font-size: 13px;
      text-align: center;
      border-bottom: 1px solid #654321;
      padding-bottom: 4px;
    }
    .scriptBtn {
      display: block;
      width: 100%;
      margin: 5px 0;
      background: #5c4023;
      border: 1px solid #3c2f2f;
      border-radius: 6px;
      color: #f1e1c1;
      padding: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .scriptBtn:hover {
      background: #7a5637;
    }
    #tw-painel.ativo {
      transform: translateX(0);
    }
  `;
  const style = document.createElement("style");
  style.innerHTML = css;

  // Adicionar ao jogo
  document.head.appendChild(style);
  document.body.appendChild(painel);

  // Adicionar botões dinamicamente
  const conteudo = document.getElementById("tw-conteudo");
  scripts.forEach(script => {
    const btn = document.createElement("button");
    btn.textContent = script.nome;
    btn.className = "scriptBtn";
    btn.onclick = () => {
      try {
        script.func();
      } catch (e) {
        UI.InfoMessage('⚠️ Erro ao executar o script.', 4000, 'error');
        console.error(e);
      }
    };
    conteudo.appendChild(btn);
  });

  // Função abre/fecha
  const painelEl = document.getElementById("tw-painel");
  const toggleBtn = document.getElementById("tw-toggle");

  toggleBtn.addEventListener("click", function () {
    painelEl.classList.toggle("ativo");
  });
})();
