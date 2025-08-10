(function () {
  const STORAGE_KEY = 'twAntiLogoffAtivo';
  const RELOAD_INTERVAL = 5 * 60; // segundos (5 minutos)

  const style = document.createElement('style');

style.textContent = `
    #twPainelAntiLogoff {
      position: fixed;
      bottom: auto;
      left: 0px;
      background: #2e2e2e;
      border: 2px solid #b79755;
      border-radius: 6px;
      padding: 10px 15px;
      font-family: "Tahoma", sans-serif;
      font-size: 14px;
      color: #f0e6d2;
      box-shadow: 0 0 8px rgba(0,0,0,0.8);
      z-index: 1000;
      width: 180px;
      user-select: none;
      text-align: center;
    }

    #twPainelAntiLogoff h4 {
      margin: 0 0 8px 0;
      font-weight: bold;
      color: #d4b35d;
      cursor: move;
    }
    #twPainelAntiLogoff button {
      background: #b79755;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      color: #2e2e2e;
      font-weight: bold;
      width: 100%;
      transition: background 0.3s ease;
    }
    #twPainelAntiLogoff button:hover:not(:disabled) {
      background: #d4b35d;
    }
    #twPainelAntiLogoff .status {
      margin-top: 6px;
      font-weight: bold;
    }
    #twPainelAntiLogoff .contador {
      margin-top: 4px;
      font-size: 12px;
      color: #ccc;
    }
    .anti-logoff-blink {
      animation: blinkAnim 0.3s ease;
    }
    @keyframes blinkAnim {
      0% { background-color: inherit; }
      50% { background-color: #d4b35d; }
      100% { background-color: inherit; }
    }
  `;
  document.head.appendChild(style);

  const painel = document.createElement('div');
  painel.id = 'twPainelAntiLogoff';
  painel.innerHTML = `
    <h4 id="painelTitulo">Anti-Logoff Robusto</h4>
    <button id="btnToggle">Iniciar</button>
    <div id="status" class="status">Inativo 🔴</div>
    <div id="contador" class="contador">Parado 00:00</div>
  `;
  document.body.appendChild(painel);

  let tempoRestante = RELOAD_INTERVAL;
  let contadorInterval;
  let reloadTimer;

  function atualizarContador() {
    const min = String(Math.floor(tempoRestante / 60)).padStart(2, '0');
    const sec = String(tempoRestante % 60).padStart(2, '0');
    painel.querySelector('#contador').textContent = `Recarregando em ${min}:${sec}`;
    if (tempoRestante <= 0) {
      location.reload();
    }
    tempoRestante--;
  }

  function iniciarContador() {
    tempoRestante = RELOAD_INTERVAL;
    atualizarContador();
    clearInterval(contadorInterval);
    contadorInterval = setInterval(atualizarContador, 1000);
  }

  function iniciarAntiLogoffRobusto() {
    if (window.antiLogoffRobustoAtivo) return;
    window.antiLogoffRobustoAtivo = true;
    localStorage.setItem(STORAGE_KEY, 'true');

    iniciarContador();

    const intervalo = 4 * 60 * 1000;
    let contador = 0;
    const acoes = [
      () => { document.title = document.title; },
      () => { document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); },
      () => {
        document.body.classList.add('anti-logoff-blink');
        setTimeout(() => document.body.classList.remove('anti-logoff-blink'), 100);
      },
      () => { fetch('/game.php').catch(() => {}); }
    ];

    window.antiLogoffIntervalo = setInterval(() => {
      try {
        acoes[contador % acoes.length]();
        console.log(`💤 Mantendo ativo... [Ação ${contador + 1}]`);
      } catch (e) {
        console.warn("⚠️ Erro na ação anti-logoff:", e);
      }
      contador++;
    }, intervalo);

    atualizarStatus();
  }

  function desativarAntiLogoff() {
    clearInterval(window.antiLogoffIntervalo);
    clearInterval(contadorInterval);
    window.antiLogoffRobustoAtivo = false;
    localStorage.setItem(STORAGE_KEY, 'false');
    console.log("❌ Anti-logoff desativado.");
    atualizarStatus();
  }

  function atualizarStatus() {
    const statusEl = painel.querySelector('#status');
    const btnToggle = painel.querySelector('#btnToggle');
    if (window.antiLogoffRobustoAtivo) {
      statusEl.textContent = "Status: Ativo";
      statusEl.style.color = "#0f0";
      btnToggle.textContent = "Desligar";
      btnToggle.style.backgroundColor = "#dc3545";
    } else {
      statusEl.textContent = "Status: Inativo";
      statusEl.style.color = "#f33";
      btnToggle.textContent = "Ligar";
      btnToggle.style.backgroundColor = "#b79755";
      painel.querySelector('#contador').textContent = "Parado 00:00";
    }
  }

  painel.querySelector('#btnToggle').addEventListener('click', () => {
    if (window.antiLogoffRobustoAtivo) {
      desativarAntiLogoff();
    } else {
      iniciarAntiLogoffRobusto();
    }
  });

  // Drag para mover o painel
  const painelTitulo = painel.querySelector('#painelTitulo');
  let offsetX, offsetY, isDragging = false;

  painelTitulo.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = painel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    painel.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;
    const maxLeft = window.innerWidth - painel.offsetWidth;
    const maxTop = window.innerHeight - painel.offsetHeight;
    painel.style.left = Math.min(Math.max(0, left), maxLeft) + 'px';
    painel.style.top = Math.min(Math.max(0, top), maxTop) + 'px';
    painel.style.right = 'auto';
    painel.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      painel.style.transition = '';
    }
  });

  const estadoSalvo = localStorage.getItem(STORAGE_KEY) === 'true';
  if (estadoSalvo) {
    iniciarAntiLogoffRobusto();
  } else {
    window.antiLogoffRobustoAtivo = false;
    atualizarStatus();
  }

  window.iniciarAntiLogoffRobusto = iniciarAntiLogoffRobusto;
  window.desativarAntiLogoff = desativarAntiLogoff;
})();








