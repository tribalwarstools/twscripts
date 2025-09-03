(function () {
  const STORAGE_KEY = 'twAL_AntiLogoffAtivo';
  const INTERVALO_ACOES = 4 * 60 * 1000; // 4 minutos

  let wakeLock = null;
  let audioCtx = null;
  let oscillator = null;
  let proximaAcaoTempo = null;

  // === CSS isolado para o painel ===
  const style = document.createElement('style');
  style.textContent = `
    #twAL-painel { 
      position: fixed; top: 120px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none; 
      border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; 
      z-index: 9999; transition: transform 0.3s ease-in-out; transform: translateX(-180px); 
    }
    #twAL-toggle { 
      position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023; 
      border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1; 
      display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; 
    }
    #twAL-conteudo { padding: 8px; width: 180px; }
    #twAL-conteudo h4 { margin: 0 0 6px 0; font-size: 13px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 4px; }
    .twAL-scriptBtn { display: block; width: 100%; margin: 5px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px; 
      color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; text-align: center; }
    .twAL-scriptBtn.on { background: #2e7d32 !important; }
    .twAL-scriptBtn.off { background: #8b0000 !important; }
    .twAL-scriptBtn:hover { filter: brightness(1.1); }
    #twAL-painel.ativo { transform: translateX(0); }
    .twAL-blink { animation: twAL-blinkAnim 0.3s ease; }
    @keyframes twAL-blinkAnim { 0% { background-color: inherit; } 50% { background-color: #d4b35d; } 100% { background-color: inherit; } }
  `;
  document.head.appendChild(style);

  // === Criar painel ===
  const painel = document.createElement("div");
  painel.id = "twAL-painel";
  painel.innerHTML = `
    <div id="twAL-toggle">☰</div>
    <div id="twAL-conteudo">
      <h4>Anti-Logoff Robusto</h4>
      <button class="twAL-scriptBtn" id="twAL-btnToggle">Ligar</button>
      <div class="twAL-status" id="twAL-status">Status: Inativo 🔴</div>
      <div class="twAL-contador" id="twAL-contador">Próxima ação: --:--</div>
    </div>
  `;
  document.body.appendChild(painel);

  // Toggle painel lateral
  const toggle = painel.querySelector('#twAL-toggle');
  toggle.addEventListener('click', () => painel.classList.toggle('ativo'));

  // Funções WakeLock/WebAudio
  async function ativarWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => console.log('🔓 Wake Lock liberado'));
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
    if (wakeLock) { wakeLock.release().catch(()=>{}); wakeLock=null; }
    if (oscillator) { oscillator.stop(); oscillator.disconnect(); oscillator=null; }
    if (audioCtx) { audioCtx.close().catch(()=>{}); audioCtx=null; }
    console.log('❌ Wake Lock / Web Audio desativado');
  }

  function formatarTempo(ms) {
    const seg = Math.floor(ms/1000);
    const min = Math.floor(seg/60);
    const segRest = seg%60;
    return `${min.toString().padStart(2,'0')}:${segRest.toString().padStart(2,'0')}`;
  }

  function atualizarContador() {
    const contadorEl = painel.querySelector('#twAL-contador');
    if (!window.twAL_Ativo || !proximaAcaoTempo) {
      contadorEl.textContent = 'Próxima ação: --:--';
      return;
    }
    const agora = Date.now();
    const tempoRestante = proximaAcaoTempo - agora;
    contadorEl.textContent = tempoRestante <=0 ? 'Executando ação...' : `Próxima ação: ${formatarTempo(tempoRestante)}`;
  }
  setInterval(atualizarContador, 1000);

  function iniciarAntiLogoffRobusto() {
    if(window.twAL_Ativo) return;
    window.twAL_Ativo=true;
    localStorage.setItem(STORAGE_KEY,'true');

    ativarWakeLock();

    let contador=0;
    const acoes=[
      ()=>document.title=document.title,
      ()=>document.body.dispatchEvent(new MouseEvent('mousemove',{bubbles:true})),
      ()=>{document.body.classList.add('twAL-blink'); setTimeout(()=>document.body.classList.remove('twAL-blink'),100);},
      ()=>fetch('/game.php').catch(()=>{})
    ];

    proximaAcaoTempo = Date.now() + INTERVALO_ACOES;

    window.twAL_intervalo = setInterval(()=>{
      try{
        acoes[contador%acoes.length]();
        console.log(`💤 Mantendo ativo... [Ação ${contador+1}]`);
        proximaAcaoTempo = Date.now() + INTERVALO_ACOES;
      } catch(e){ console.warn("⚠️ Erro na ação anti-logoff:", e); }
      contador++;
    }, INTERVALO_ACOES);

    atualizarStatus();
    atualizarContador();
  }

  function desativarAntiLogoff() {
    clearInterval(window.twAL_intervalo);
    window.twAL_Ativo=false;
    localStorage.setItem(STORAGE_KEY,'false');
    desativarWakeLock();
    proximaAcaoTempo=null;
    console.log("❌ Anti-logoff desativado.");
    atualizarStatus();
    atualizarContador();
  }

  function atualizarStatus() {
    const statusEl = painel.querySelector('#twAL-status');
    const btnToggle = painel.querySelector('#twAL-btnToggle');
    if(window.twAL_Ativo){
      statusEl.textContent="Status: Ativo 🟢";
      statusEl.style.color="#0f0";
      btnToggle.textContent="Desligar";
      btnToggle.classList.add('on'); btnToggle.classList.remove('off');
    } else {
      statusEl.textContent="Status: Inativo 🔴";
      statusEl.style.color="#f33";
      btnToggle.textContent="Ligar";
      btnToggle.classList.add('off'); btnToggle.classList.remove('on');
    }
  }

  painel.querySelector('#twAL-btnToggle').addEventListener('click', ()=>{
    window.twAL_Ativo ? desativarAntiLogoff() : iniciarAntiLogoffRobusto();
  });

  // Drag
  const painelTitulo = painel.querySelector('h4');
  let offsetX, offsetY, isDragging=false;
  painelTitulo.addEventListener('mousedown', e=>{
    isDragging=true;
    const rect=painel.getBoundingClientRect();
    offsetX=e.clientX-rect.left;
    offsetY=e.clientY-rect.top;
    painel.style.transition='none';
  });
  document.addEventListener('mousemove', e=>{
    if(!isDragging) return;
    let left=e.clientX-offsetX;
    let top=e.clientY-offsetY;
    const maxLeft=window.innerWidth-painel.offsetWidth;
    const maxTop=window.innerHeight-painel.offsetHeight;
    painel.style.left=Math.min(Math.max(0,left),maxLeft)+'px';
    painel.style.top=Math.min(Math.max(0,top),maxTop)+'px';
  });
  document.addEventListener('mouseup', ()=>{ if(isDragging){isDragging=false;painel.style.transition='';} });

  // Restaurar estado salvo
  if(localStorage.getItem(STORAGE_KEY)==='true') iniciarAntiLogoffRobusto();
  else{ window.twAL_Ativo=false; atualizarStatus(); atualizarContador(); }

  window.iniciarAntiLogoffRobusto = iniciarAntiLogoffRobusto;
  window.desativarAntiLogoff = desativarAntiLogoff;

})();




