(function () {
  if (document.getElementById('painelScriptsTribal')) {
    document.getElementById('painelScriptsTribal').style.display = 'block';
    return;
  }

  function aplicarEstiloTWPadrao() {
    const style = document.createElement('style');
    style.textContent = `
      .twPainelScripts {
        position: fixed;
        bottom: 60px;
        right: 0px;
        width: 180px;
        background: #2e2e2e;
        border: 2px solid #b79755;
        border-radius: 6px;
        padding: 0;
        font-family: Verdana, sans-serif;
        font-size: 9px;
        color: #f5deb3;
        z-index: 99999;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: height 0.3s ease, opacity 0.3s ease;
        height: 40px;
      }

      .twPainelScripts h3 {
        margin: 0 0 10px;
        font-size: 9px;
        color: #f0e2b6;
      }

      .twPainelScripts select, .twPainelScripts input[type="number"], .twPainelScripts button {
        font-size: 9px;
        padding: 3px 6px;
        margin: 4px 0;
        border-radius: 4px;
        border: 1px solid #b79755;
        background-color: #1c1c1c;
        color: #f5deb3;
      }

      .twPainelScripts button:hover {
        background-color: #3a3a3a;
        cursor: pointer;
      }

      .twPainelScripts .linha {
        margin-bottom: 8px;
      }

      .twPainelScripts .contador {
        font-size: 14px;
        font-weight: bold;
        margin-left: 6px;
        color: #ffd700;
      }

      .twPainelScripts .header {
        background: linear-gradient(180deg, #3c2f0f 0%, #261e07 100%);
        border-bottom: 1px solid #b79755;
        padding: 6px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        font-weight: bold;
        font-size: 9px;
      }

      .twPainelScripts .toggleBtn {
        background: transparent;
        border: none;
        color: #f5deb3;
        font-weight: bold;
        font-size: 9px;
        line-height: 20px;
        cursor: pointer;
        user-select: none;
      }

      .twPainelScripts .listaScripts {
        display: none;
        flex-direction: column;
        padding: 8px 10px;
        gap: 6px;
        background: #1c1810;
        max-height: 280px;
        overflow-y: auto;
      }

      .twPainelScripts .scriptBtn {
        font-family: Verdana, sans-serif;
        font-size: 14px;
        color: #f5deb3;
        background: linear-gradient(180deg, #3c2f0f 0%, #261e07 100%);
        border: 1px solid #b79755;
        border-radius: 4px;
        padding: 6px 10px;
        cursor: pointer;
        text-align: left;
        user-select: none;
        transition: background 0.25s ease;
      }

      .twPainelScripts .scriptBtn:hover {
        background: linear-gradient(180deg, #533e0f 0%, #3a2b06 100%);
      }
    `;
    document.head.appendChild(style);
  }

  aplicarEstiloTWPadrao();

  const painel = document.createElement('div');
  painel.id = 'painelScriptsTribal';
  painel.className = 'twPainelScripts';

  painel.innerHTML = `
    <div class="header" id="headerPainel">
      <span>SCRIPTS</span>
      <button id="btnToggle" class="toggleBtn">▼</button>
    </div>
    <div id="listaScripts" class="listaScripts"></div>
  `;

  document.body.appendChild(painel);

  const btnToggle = painel.querySelector('#btnToggle');
  const lista = painel.querySelector('#listaScripts');
  const header = painel.querySelector('#headerPainel');

  const scripts = [
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
      nome: 'Agendador de Envio',
      func: () => {
        $.getScript('https://tribalwarstools.github.io/agendadorEnvio/agendadorEnvio.js')
          .done(() => UI.InfoMessage('✅ Script Agendador de Envio carregado!', 3000, 'success'))
          .fail(() => UI.InfoMessage('❌ Erro ao carregar script Agendador de Envio.', 5000, 'error'));
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

  function criarBotaoScript(script) {
    const btn = document.createElement('button');
    btn.textContent = script.nome;
    btn.className = 'scriptBtn';
    btn.onclick = () => {
      try {
        script.func();
      } catch (e) {
        UI.InfoMessage('⚠️ Erro ao executar o script.', 4000, 'error');
        console.error(e);
      }
    };
    return btn;
  }

  scripts.forEach(s => lista.appendChild(criarBotaoScript(s)));

  let aberto = false;
  function toggle() {
    aberto = !aberto;
    lista.style.display = aberto ? 'flex' : 'none';
    painel.style.height = aberto ? 'auto' : '40px';
    btnToggle.textContent = aberto ? '▲' : '▼';
  }

  btnToggle.onclick = e => {
    e.stopPropagation();
    toggle();
  };

  header.onclick = toggle;
})();








