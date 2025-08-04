// ==UserScript==
// @name         Painel de Scripts Tribal Wars
// @namespace    https://tribalwarstools.github.io/
// @version      1.0
// @description  Painel flutuante com atalhos para scripts do Tribal Wars
// @author       Giovani
// @match        https://*.tribalwars.com.br/game.php*
// @icon         https://dsm01pap001files.storage.live.com/y4m9-4-icontribalwars.png
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  if (document.getElementById('painelScriptsTribal')) {
    document.getElementById('painelScriptsTribal').style.display = 'block';
    return;
  }

  if (!document.getElementById('font-belgrano')) {
    const link = document.createElement('link');
    link.id = 'font-belgrano';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Belgrano&display=swap';
    document.head.appendChild(link);
  }

  const painel = document.createElement('div');
  painel.id = 'painelScriptsTribal';
  painel.style.position = 'fixed';
  painel.style.bottom = '60px';
  painel.style.right = '15px';
  painel.style.width = '200px';
  painel.style.backgroundColor = '#121212';
  painel.style.color = '#d0b973';
  painel.style.fontFamily = "'Belgrano', serif";
  painel.style.border = '1px solid #d0b973';
  painel.style.borderRadius = '6px';
  painel.style.boxShadow = '0 0 12px 2px rgba(208, 185, 115, 0.5)';
  painel.style.zIndex = 10000;
  painel.style.overflow = 'hidden';
  painel.style.transition = 'height 0.3s ease, opacity 0.3s ease';
  painel.style.height = '40px';
  painel.style.display = 'flex';
  painel.style.flexDirection = 'column';

  painel.innerHTML = `
    <div id="headerPainel" style="
      background: linear-gradient(180deg, #3c2f0f 0%, #261e07 100%);
      border-bottom: 1px solid #d0b973;
      padding: 6px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      font-weight: bold;
      font-size: 16px;
    ">
      <span>SCRIPTS</span>
      <button id="btnToggle" style="
        background: transparent;
        border: none;
        color: #d0b973;
        font-weight: bold;
        font-size: 20px;
        line-height: 20px;
        cursor: pointer;
        user-select: none;
      ">▼</button>
    </div>
    <div id="listaScripts" style="
      display: none;
      flex-direction: column;
      padding: 8px 10px;
      gap: 6px;
      background: #1c1810;
      max-height: 280px;
      overflow-y: auto;
    ">
    </div>
  `;

  document.body.appendChild(painel);

  const btnToggle = painel.querySelector('#btnToggle');
  const lista = painel.querySelector('#listaScripts');
  const header = painel.querySelector('#headerPainel');

  const scripts = [
    {
      nome: 'Construir Edifícios',
      func: () => {
        $.getScript('https://tribalwarstools.github.io/ConstruirEdificios/construir.js')
          .done(() => UI.InfoMessage('✅ Script Construir Edifícios carregado com sucesso!', 3000, 'success'))
          .fail(() => UI.InfoMessage('❌ Erro ao carregar o script Construir Edifícios.', 5000, 'error'));
      },
    },
    {
      nome: 'Renomear Aldeias',
      func: () => {
        $.getScript('https://tribalwarstools.github.io/RenomearAvancado/renomearAldAvan.js')
          .done(() => UI.InfoMessage('✅ Script Renomear Aldeias carregado!', 3000, 'success'))
          .fail(() => UI.InfoMessage('❌ Erro ao carregar script de renomear.', 5000, 'error'));
      },
    },
    {
      nome: 'Outro Exemplo',
      func: () => alert('⚙️ Aqui você pode adicionar mais scripts!'),
    },
  ];

  function criarBotaoScript(script) {
    const btn = document.createElement('button');
    btn.textContent = script.nome;
    btn.style.fontFamily = "'Belgrano', serif";
    btn.style.fontSize = '14px';
    btn.style.color = '#d0b973';
    btn.style.background = 'linear-gradient(180deg, #3c2f0f 0%, #261e07 100%)';
    btn.style.border = '1px solid #d0b973';
    btn.style.borderRadius = '4px';
    btn.style.padding = '6px 10px';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'left';
    btn.style.userSelect = 'none';
    btn.style.transition = 'background 0.25s ease';

    btn.onmouseenter = () => {
      btn.style.background = 'linear-gradient(180deg, #533e0f 0%, #3a2b06 100%)';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'linear-gradient(180deg, #3c2f0f 0%, #261e07 100%)';
    };

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
    if (aberto) {
      lista.style.display = 'flex';
      painel.style.height = 'auto';
      btnToggle.textContent = '▲';
      header.style.borderBottom = '1px solid transparent';
    } else {
      lista.style.display = 'none';
      painel.style.height = '40px';
      btnToggle.textContent = '▼';
      header.style.borderBottom = '1px solid #d0b973';
    }
  }

  btnToggle.onclick = e => {
    e.stopPropagation();
    toggle();
  };

  header.onclick = toggle;
})();
