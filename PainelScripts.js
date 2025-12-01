(function() {
  const STORAGE_KEY = "twPainelAberto";

  // === Lista de Scripts ===
  const scripts = [
	//grupoAldeias.js
	{ nome: 'Grupo de Aldeias', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/grupoAldeias.js').done(() => UI.InfoMessage('✅ Script carregado!', 3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},    
	{ nome: 'Plano de Envio', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/planoEnvio.js').done(() => UI.InfoMessage('✅ Script carregado!', 3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},    
	{ nome: 'Buscar no raio', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/BuscarAldeiasRaio.js').done(() => UI.InfoMessage('✅ Script carregado!', 3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},  
	{ nome: 'Comparador(Casual)', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/comparador.js').done(() => UI.InfoMessage('✅ Script carregado!', 3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},
	{ nome: 'Blindagem', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/blindagem.js').done(() => UI.InfoMessage('✅ Script carregado!',3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},
	{ nome: 'Renomear Aldeias', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/renomear.js').done(() => UI.InfoMessage('✅ Script carregado!',3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},
	{ nome: 'Contador', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/contador.js').done(() => UI.InfoMessage('✅ Script carregado!',3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},	
	{ nome: 'Evolução', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/evolucao.js').done(() => UI.InfoMessage('✅ Script carregado!',3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},
    { nome: 'Configurar Tropas', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/ConfigTropas.js').done(() => UI.InfoMessage('✅ Script carregado!',3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},
    { nome: 'Configurar Envio', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/envioImediato.js').done(() => UI.InfoMessage('✅ Script carregado!',3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},    
    { nome: 'Ataque', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/ScriptAtaque.js').done(() => UI.InfoMessage('✅ Script carregado!', 3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},
	{ nome: 'Apoio', func: () => { $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/ScriptApoio.js').done(() => UI.InfoMessage('✅ Script carregado!', 3000,'success')).fail(() => UI.InfoMessage('❌ Erro ao carregar script.',5000,'error')); }},
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

  const css = `
    #tw-painel { position: fixed; top: 0px; left: 0; background: #2b2b2b; border: 2px solid #654321; border-left: none; border-radius: 0 10px 10px 0; box-shadow: 2px 2px 8px #000; font-family: Verdana, sans-serif; color: #f1e1c1; z-index: 99999; transition: transform 0.3s ease-in-out; transform: translateX(-200px); }
    #tw-toggle { position: absolute; top: 0; right: -28px; width: 28px; height: 40px; background: #5c4023; border: 2px solid #654321; border-left: none; border-radius: 0 6px 6px 0; color: #f1e1c1; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 2px 2px 6px #000; }
    #tw-conteudo { padding: 8px; width: 180px; }
    #tw-conteudo h4 { margin: 0 0 6px 0; font-size: 13px; text-align: center; border-bottom: 1px solid #654321; padding-bottom: 4px; }
    .scriptBtn { display: block; width: 100%; margin: 5px 0; background: #5c4023; border: 1px solid #3c2f2f; border-radius: 6px; color: #f1e1c1; padding: 6px; cursor: pointer; font-size: 12px; text-align: center; }
    .scriptBtn.on { background: #2e7d32 !important; }
    .scriptBtn.off { background: #8b0000 !important; }
    .scriptBtn:hover { filter: brightness(1.1); }
    #tw-painel.ativo { transform: translateX(0); }
  `;
  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);
  document.body.appendChild(painel);

  // === Adicionar botões dinamicamente ===
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

  // === Toggle abre/fecha painel com persistência ===
  const painelEl = document.getElementById("tw-painel");
  const toggleBtn = document.getElementById("tw-toggle");

  // Restaurar estado salvo
  if (localStorage.getItem(STORAGE_KEY) === "aberto") {
    painelEl.classList.add("ativo");
  }

  toggleBtn.addEventListener("click", function () {
    painelEl.classList.toggle("ativo");
    localStorage.setItem(STORAGE_KEY, painelEl.classList.contains("ativo") ? "aberto" : "fechado");
  });
})();




























