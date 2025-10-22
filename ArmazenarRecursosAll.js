// ==UserScript==
// @name         Armazenar Recursos (Auto Máximo 10s)
// @namespace    https://tribalwars.com.br/
// @version      1.3
// @description  Armazena automaticamente o máximo de recursos a cada 10s com painel lateral e persistência
// @match        *://*.tribalwars.com.br/game.php?*screen=snob*
// @grant        none
// ==/UserScript==

(function () {


  // --- GARANTE QUE ESTÁ NA ACADEMIA ---
  if (!location.href.includes('screen=snob')) {
    UI.InfoMessage("Abra a tela da Academia (snob) para usar o script.", 3000, "error");
    return;
  }

  // --- EVITA DUPLICAR O PAINEL ---
  if (window.twRESpainel) {
    UI.InfoMessage("O painel já está aberto.", 2000, "info");
    return;
  }
  window.twRESpainel = true;

  // --- ESTILO DO PAINEL ---
  const style = document.createElement('style');
  style.textContent = `
    #twAR-painel {
      position: fixed; top: 150px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none;
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1;
      z-index: 9996; transition: transform 0.3s ease-in-out; transform: translateX(-200px);
    }
    #twAR-toggle {
      position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023;
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1;
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000;
    }
    #twAR-conteudo { padding: 8px; width: 180px; }
    #twAR-conteudo h4 { margin: 0 0 6px 0; font-size: 13px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 4px; }
    .twRES-btn { display: block; width: 100%; margin: 5px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px;
      color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; text-align: center; transition: background 0.3s; }
    .twRES-btn.on { background: #2e7d32 !important; }
    .twRES-btn.off { background: #8b0000 !important; }
    .twRES-btn:hover { filter: brightness(1.1); }
    #twAR-painel.ativo { transform: translateX(0); }
    .twRES-status { font-size: 12px; margin-top: 6px; text-align: center; }
  `;
  document.head.appendChild(style);

  // --- CRIA PAINEL ---
  const painel = document.createElement('div');
  painel.id = 'twRES-painel';
  painel.innerHTML = `
    <div id="twRES-toggle">⚙️</div>
    <div id="twRES-conteudo">
      <h4>Armazenar Recursos</h4>
      <button id="twRES-ativar" class="twRES-btn off">❌ Inativo</button>
      <div class="twRES-status" id="twRES-status">Modo automático desligado.</div>
    </div>
  `;
  document.body.appendChild(painel);

  // --- ABRIR / FECHAR PAINEL ---
  document.querySelector('#twAR-toggle').addEventListener('click', () => {
    painel.classList.toggle('ativo');
  });

  // --- ELEMENTOS DO JOGO ---
  function getElements() {
    const btnSelecionar = document.querySelector('a.btn');
    const btnArmazenar = document.querySelector('input[type="submit"]');
    return { btnSelecionar, btnArmazenar };
  }

  // --- EXECUÇÃO AUTOMÁTICA ---
  let intervalo = null;

  function executarArmazenamento() {
    const { btnSelecionar, btnArmazenar } = getElements();
    if (!btnSelecionar || !btnArmazenar) {
      console.warn("Botões não encontrados na página.");
      return;
    }

    btnSelecionar.click();
    setTimeout(() => {
      btnArmazenar.click();
      console.log("✅ Armazenamento automático executado.");
    }, 800);
  }

  // --- CONTROLE DO BOTÃO ---
  const btnAtivar = document.getElementById('twRES-ativar');
  const statusTxt = document.getElementById('twRES-status');

  function atualizarPainel(ativo) {
    if (ativo) {
      btnAtivar.textContent = "✅ Ativo";
      btnAtivar.classList.remove('off');
      btnAtivar.classList.add('on');
      statusTxt.textContent = "Executando a cada 10 segundos...";
    } else {
      btnAtivar.textContent = "❌ Inativo";
      btnAtivar.classList.remove('on');
      btnAtivar.classList.add('off');
      statusTxt.textContent = "Modo automático desligado.";
    }
  }

  function alternarAtivacao() {
    const ativo = localStorage.getItem('twRES_ativo') === 'true';
    const novoEstado = !ativo;
    localStorage.setItem('twRES_ativo', novoEstado);
    atualizarPainel(novoEstado);

    if (novoEstado) {
      executarArmazenamento();
      intervalo = setInterval(executarArmazenamento, 10000);
    } else {
      clearInterval(intervalo);
    }
  }

  btnAtivar.addEventListener('click', alternarAtivacao);

  // --- RESTAURA ESTADO SALVO ---
  const ativoSalvo = localStorage.getItem('twRES_ativo') === 'true';
  atualizarPainel(ativoSalvo);
  if (ativoSalvo) {
    intervalo = setInterval(executarArmazenamento, 10000);
  }


})();
