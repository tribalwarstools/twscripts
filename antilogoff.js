(function () {
  const STORAGE_KEY = 'twAntiLogoffAtivo';
  const INTERVALO_ACOES = 4 * 60 * 1000; // 4 minutos

  let wakeLock = null;
  let audioCtx = null;
  let oscillator = null;
  let proximaAcaoTempo = null; // Variável para armazenar o tempo da próxima ação

  async function ativarWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          console.log('🔓 Wake Lock liberado');
        });
        console.log('🔒 Wake Lock ativo');
      } else {
        ativarWebAudioFallback();
      }
    } catch (err) {
      console.warn('⚠️ Falha no Wake Lock, usando Web Audio fallback:', err);
      ativarWebAudioFallback();
    }
  }

  function ativarWebAudioFallback() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // inaudível
      oscillator.connect(gainNode).connect(audioCtx.destination);
      oscillator.start();
      console.log('🎵 Web Audio fallback ativado');
    }
  }

  function desativarWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    console.log('❌ Wake Lock / Web Audio desativado');
  }

  const style = document.createElement('style');
  style.textContent = `
    #twPainelAntiLogoff {
      position: fixed;
      bottom: 30px;
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
      width: 200px;
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
      margin-bottom: 8px;
    }
    #twPainelAntiLogoff button:hover:not(:disabled) {
      background: #d4b35d;
    }
    #twPainelAntiLogoff .status {
      margin-top: 6px;
      font-weight: bold;
    }
    #twPainelAntiLogoff .contador {
      font-size: 12px;
      margin-top: 6px;
      color: #d4b35d;
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
    <div id="contador" class="contador">Próxima ação: --:--</div>
  `;
  document.body.appendChild(painel);

  // Função para formatar o tempo em minutos:segundos
  function formatarTempo(milissegundos) {
    const segundos = Math.floor(milissegundos / 1000);
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segundosRestantes.toString().padStart(2, '0')}`;
  }

  // Função para atualizar o contador
  function atualizarContador() {
    const contadorEl = painel.querySelector('#contador');
    if (!window.antiLogoffRobustoAtivo || !proximaAcaoTempo) {
      contadorEl.textContent = 'Próxima ação: --:--';
      return;
    }

    const agora = Date.now();
    const tempoRestante = proximaAcaoTempo - agora;
    
    if (tempoRestante <= 0) {
      contadorEl.textContent = 'Executando ação...';
    } else {
      contadorEl.textContent = `Próxima ação: ${formatarTempo(tempoRestante)}`;
    }
  }

  // Atualizar o contador a cada segundo
  setInterval(atualizarContador, 1000);

  function iniciarAntiLogoffRobusto() {
    if (window.antiLogoffRobustoAtivo) return;
    window.antiLogoffRobustoAtivo = true;
    localStorage.setItem(STORAGE_KEY, 'true');

    ativarWakeLock();

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

    // Definir o tempo da próxima ação
    proximaAcaoTempo = Date.now() + INTERVALO_ACOES;
    
    window.antiLogoffIntervalo = setInterval(() => {
      try {
        acoes[contador % acoes.length]();
        console.log(`💤 Mantendo ativo... [Ação ${contador + 1}]`);
        
        // Atualizar o tempo da próxima ação
        proximaAcaoTempo = Date.now() + INTERVALO_ACOES;
      } catch (e) {
        console.warn("⚠️ Erro na ação anti-logoff:", e);
      }
      contador++;
    }, INTERVALO_ACOES);

    atualizarStatus();
    atualizarContador();
  }

  function desativarAntiLogoff() {
    clearInterval(window.antiLogoffIntervalo);
    window.antiLogoffRobustoAtivo = false;
    localStorage.setItem(STORAGE_KEY, 'false');
    desativarWakeLock();
    proximaAcaoTempo = null;
    console.log("❌ Anti-logoff desativado.");
    atualizarStatus();
    atualizarContador();
  }

  function atualizarStatus() {
    const statusEl = painel.querySelector('#status');
    const btnToggle = painel.querySelector('#btnToggle');
    if (window.antiLogoffRobustoAtivo) {
      statusEl.textContent = "Status: Ativo 🟢";
      statusEl.style.color = "#0f0";
      btnToggle.textContent = "Desligar";
      btnToggle.style.backgroundColor = "#dc3545";
    } else {
      statusEl.textContent = "Status: Inativo 🔴";
      statusEl.style.color = "#f33";
      btnToggle.textContent = "Ligar";
      btnToggle.style.backgroundColor = "#b79755";
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

  // Restaurar estado salvo
  const estadoSalvo = localStorage.getItem(STORAGE_KEY) === 'true';
  if (estadoSalvo) {
    iniciarAntiLogoffRobusto();
  } else {
    window.antiLogoffRobustoAtivo = false;
    atualizarStatus();
    atualizarContador();
  }

  window.iniciarAntiLogoffRobusto = iniciarAntiLogoffRobusto;
  window.desativarAntiLogoff = desativarAntiLogoff;
})();
