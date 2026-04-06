// ==UserScript==
// @name         TW Sistema Unificado - AntiBot + AntiLogoff
// @version      3.5
// @description  Sistema Anti-Bot e Anti-Logoff com painel minimizável em ícone circular
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÕES
    // ============================================
    const CONFIG = {
        antiLogoff: {
            intervalo: 4 * 60 * 1000, // 4 minutos
            reloadAoDetectar: false,
            reloadAoFinalizar: true
        },
        storage: {
            antibot: 'tw_antibot_enabled',
            antilogoff: 'tw_antilogoff_enabled',
            botPausado: 'tw_bot_pausado'
        }
    };

    // ============================================
    // ESTADO GLOBAL
    // ============================================
    const Estado = {
        antibot: {
            ativo: false,
            pausado: false
        },
        antilogoff: {
            ativo: false,
            tempoRestante: null,
            contadorAcoes: 0,
            intervalo: null,
            reloadTimeout: null
        },
        wakelock: {
            lock: null,
            audioCtx: null,
            oscillator: null
        },
        painel: {
            minimizado: true
        }
    };

    // ============================================
    // CONTROLE DE BOTS
    // ============================================
    window.TWBotControl = {
        pausado: false,

        pausar: function() {
            this.pausado = true;
            Estado.antibot.pausado = true;
            localStorage.setItem(CONFIG.storage.botPausado, '1');
            window.dispatchEvent(new CustomEvent('tw:pausar', {
                detail: { timestamp: Date.now() }
            }));
            console.log('🛑 Sistema pausado - Bots externos foram pausados');
        },

        retomar: function() {
            this.pausado = false;
            Estado.antibot.pausado = false;
            localStorage.setItem(CONFIG.storage.botPausado, '0');
            window.dispatchEvent(new CustomEvent('tw:retomar', {
                detail: { timestamp: Date.now() }
            }));
            console.log('✅ Sistema retomado - Bots externos foram retomados');
        },

        podeExecutar: function() {
            return !this.pausado && localStorage.getItem(CONFIG.storage.botPausado) !== '1';
        }
    };

    // ============================================
    // CSS DO PAINEL
    // ============================================
    const style = document.createElement('style');
    style.textContent = `
        #tw-painel-unificado {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            background: #1e1e1e;
            color: #fff;
            border-radius: 10px;
            z-index: 99999;
            font-family: Arial, sans-serif;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            border: 1px solid #333;
            transition: all 0.3s ease;
        }

        #tw-painel-unificado.minimizado {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            background: #ff9900;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        #tw-painel-unificado.minimizado .painel-header,
        #tw-painel-unificado.minimizado .painel-conteudo {
            display: none;
        }

        #tw-painel-unificado.minimizado::before {
            content: "🛡️";
            font-size: 28px;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        .painel-header {
            background: #ff9900;
            padding: 10px 15px;
            border-radius: 10px 10px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .painel-header h3 {
            margin: 0;
            color: #1a1a1a;
            font-size: 14px;
        }

        .painel-header button {
            background: rgba(0,0,0,0.3);
            color: white;
            border: none;
            padding: 2px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }

        .painel-header button:hover {
            background: rgba(0,0,0,0.5);
        }

        .painel-conteudo {
            padding: 15px;
            max-height: 500px;
            overflow-y: auto;
        }

        .tw-section {
            background: #252525;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .tw-section-title {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #ff9900;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .tw-status-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 6px 0;
            font-size: 12px;
        }

        .tw-status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 6px;
            animation: pulse 2s infinite;
        }

        .tw-status-indicator.ativo {
            background: #2ecc71;
            box-shadow: 0 0 8px #2ecc71;
        }

        .tw-status-indicator.inativo {
            background: #e74c3c;
            box-shadow: 0 0 8px #e74c3c;
        }

        .tw-status-indicator.pausado {
            background: #f39c12;
            box-shadow: 0 0 8px #f39c12;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .tw-btn {
            display: inline-block;
            padding: 8px 16px;
            margin: 4px 0;
            background: #ff9900;
            color: #1a1a1a;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            transition: all 0.2s;
            width: 100%;
        }

        .tw-btn:hover {
            background: #ffaa33;
            transform: translateY(-1px);
        }

        .tw-btn.ativo {
            background: #006600;
            color: #fff;
        }

        .tw-btn.inativo {
            background: #990000;
            color: #fff;
        }

        .tw-timer {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            padding: 8px;
            background: #1a1a1a;
            border-radius: 6px;
            margin-top: 8px;
            font-family: 'Courier New', monospace;
            color: #2ecc71;
        }

        .tw-counter-display {
            font-size: 11px;
            color: #888;
            text-align: center;
            margin-top: 6px;
        }

        .tw-alert {
            background: #990000;
            border: 1px solid #ff0000;
            border-radius: 6px;
            padding: 8px;
            margin-top: 8px;
            display: none;
        }

        .tw-alert.ativo {
            display: block;
        }

        .tw-alert-title {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 12px;
            color: #ff9900;
        }

        .tw-alert-text {
            font-size: 10px;
            opacity: 0.9;
        }

        .info-text {
            font-size: 10px;
            color: #888;
            margin-top: 5px;
            text-align: center;
        }

        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // ============================================
    // MENSAGENS TOAST
    // ============================================
    const Toast = {
        _container: null,
        _getContainer: function() {
            if (!this._container) {
                this._container = document.createElement('div');
                this._container.id = 'tw-toast-container';
                this._container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 100000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                document.body.appendChild(this._container);
            }
            return this._container;
        },
        _show: function(message, type, duration = 3000) {
            const toast = document.createElement('div');
            toast.style.cssText = `
                background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#ff9800'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-family: Arial, sans-serif;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                animation: slideInRight 0.3s ease;
                cursor: pointer;
            `;
            toast.innerHTML = message;
            toast.onclick = () => toast.remove();
            this._getContainer().appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },
        success: function(message) { this._show(message, 'success'); },
        error: function(message) { this._show(message, 'error'); },
        info: function(message) { this._show(message, 'info'); }
    };

    // ============================================
    // HTML DO PAINEL
    // ============================================
    const painel = document.createElement('div');
    painel.id = 'tw-painel-unificado';
    painel.className = 'minimizado';
    painel.innerHTML = `
        <div class="painel-header">
            <h3>🛡️ Sistema Anti-Bot + Anti-Logoff</h3>
            <button id="tw-minimizarBtn">−</button>
        </div>
        <div class="painel-conteudo">
            <div class="tw-section">
                <div class="tw-section-title">🤖 Anti-Bot Detector</div>
                <div class="tw-status-line">
                    <span>
                        <span class="tw-status-indicator inativo" id="antibot-indicator"></span>
                        <span id="antibot-status-text">Inativo</span>
                    </span>
                </div>
                <button class="tw-btn inativo" id="antibot-toggle">Ativar Detector</button>
                <div class="tw-alert" id="antibot-alert">
                    <div class="tw-alert-title">⚠️ ANTI-BOT DETECTADO!</div>
                    <div class="tw-alert-text">Fazendo logout automático em 2 segundos...</div>
                </div>
            </div>

            <div class="tw-section">
                <div class="tw-section-title">⏰ Anti-Logoff</div>
                <div class="tw-status-line">
                    <span>
                        <span class="tw-status-indicator inativo" id="antilogoff-indicator"></span>
                        <span id="antilogoff-status-text">Inativo</span>
                    </span>
                </div>
                <button class="tw-btn inativo" id="antilogoff-toggle">Ativar Anti-Logoff</button>
                <div class="tw-timer" id="antilogoff-timer">--:--</div>
                <div class="tw-counter-display" id="antilogoff-counter">Ações: 0</div>
            </div>

            <hr>

            <div class="info-text">
                💡 <strong>Anti-Bot:</strong> Detecta e evita captchas<br>
                💡 <strong>Anti-Logoff:</strong> Mantém sua sessão ativa<br>
                💡 <strong>Reload:</strong> Recarrega ao final do cronômetro
            </div>
        </div>
    `;
    document.body.appendChild(painel);

    // ============================================
    // ELEMENTOS DO DOM
    // ============================================
    const UI = {
        painel: painel,
        minimizarBtn: document.getElementById('tw-minimizarBtn'),
        antibot: {
            indicator: document.getElementById('antibot-indicator'),
            statusText: document.getElementById('antibot-status-text'),
            toggleBtn: document.getElementById('antibot-toggle'),
            alert: document.getElementById('antibot-alert')
        },
        antilogoff: {
            indicator: document.getElementById('antilogoff-indicator'),
            statusText: document.getElementById('antilogoff-status-text'),
            toggleBtn: document.getElementById('antilogoff-toggle'),
            timer: document.getElementById('antilogoff-timer'),
            counter: document.getElementById('antilogoff-counter')
        }
    };

    // ============================================
    // FUNÇÕES DE UI
    // ============================================
    function atualizarUIAntiBot() {
        if (Estado.antibot.pausado) {
            UI.antibot.indicator.className = 'tw-status-indicator pausado';
            UI.antibot.statusText.textContent = 'Fazendo Logout...';
            UI.antibot.toggleBtn.className = 'tw-btn inativo';
            UI.antibot.toggleBtn.textContent = 'Desconectando...';
            UI.antibot.toggleBtn.disabled = true;
            UI.antibot.alert.classList.add('ativo');
        } else if (Estado.antibot.ativo) {
            UI.antibot.indicator.className = 'tw-status-indicator ativo';
            UI.antibot.statusText.textContent = 'Monitorando';
            UI.antibot.toggleBtn.className = 'tw-btn ativo';
            UI.antibot.toggleBtn.textContent = '✓ Detector Ativo';
            UI.antibot.toggleBtn.disabled = false;
            UI.antibot.alert.classList.remove('ativo');
        } else {
            UI.antibot.indicator.className = 'tw-status-indicator inativo';
            UI.antibot.statusText.textContent = 'Inativo';
            UI.antibot.toggleBtn.className = 'tw-btn inativo';
            UI.antibot.toggleBtn.textContent = 'Ativar Detector';
            UI.antibot.toggleBtn.disabled = false;
            UI.antibot.alert.classList.remove('ativo');
        }
    }

    function atualizarUIAntiLogoff() {
        if (Estado.antilogoff.ativo) {
            UI.antilogoff.indicator.className = 'tw-status-indicator ativo';
            UI.antilogoff.statusText.textContent = 'Ativo';
            UI.antilogoff.toggleBtn.className = 'tw-btn ativo';
            UI.antilogoff.toggleBtn.textContent = '✓ Anti-Logoff Ativo';
        } else {
            UI.antilogoff.indicator.className = 'tw-status-indicator inativo';
            UI.antilogoff.statusText.textContent = 'Inativo';
            UI.antilogoff.toggleBtn.className = 'tw-btn inativo';
            UI.antilogoff.toggleBtn.textContent = 'Ativar Anti-Logoff';
            UI.antilogoff.timer.textContent = '--:--';
            UI.antilogoff.counter.textContent = 'Ações: 0';
        }
    }

    function formatarTempo(ms) {
        const seg = Math.floor(ms / 1000);
        const min = Math.floor(seg / 60);
        const segRest = seg % 60;
        return `${min.toString().padStart(2, '0')}:${segRest.toString().padStart(2, '0')}`;
    }

    function atualizarTimer() {
        if (!Estado.antilogoff.ativo || Estado.antilogoff.tempoRestante === null) {
            UI.antilogoff.timer.textContent = '--:--';
            return;
        }

        if (Estado.antilogoff.tempoRestante <= 0) {
            UI.antilogoff.timer.textContent = 'Recarregando...';
        } else {
            UI.antilogoff.timer.textContent = formatarTempo(Estado.antilogoff.tempoRestante);
        }

        UI.antilogoff.counter.textContent = `Ações: ${Estado.antilogoff.contadorAcoes}`;
    }

    // ============================================
    // FUNÇÃO DE RELOAD
    // ============================================
    function executarReload() {
        if (CONFIG.antiLogoff.reloadAoFinalizar) {
            console.log('🔄 Cronômetro finalizado! Recarregando a página...');
            Toast.info('🔄 Recarregando página para manter sessão ativa...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    // ============================================
    // WAKELOCK / WEBAUDIO
    // ============================================
    async function ativarWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                Estado.wakelock.lock = await navigator.wakeLock.request('screen');
                Estado.wakelock.lock.addEventListener('release', () => {
                    console.log('🔓 Wake Lock liberado');
                });
                console.log('💡 Wake Lock ativado');
            } else {
                ativarWebAudioFallback();
            }
        } catch (e) {
            console.warn('⚠️ Falha no WakeLock, usando WebAudio', e);
            ativarWebAudioFallback();
        }
    }

    function ativarWebAudioFallback() {
        if (!Estado.wakelock.audioCtx) {
            Estado.wakelock.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            Estado.wakelock.oscillator = Estado.wakelock.audioCtx.createOscillator();
            const gainNode = Estado.wakelock.audioCtx.createGain();
            gainNode.gain.value = 0;
            Estado.wakelock.oscillator.connect(gainNode).connect(Estado.wakelock.audioCtx.destination);
            Estado.wakelock.oscillator.start();
            console.log('🎵 WebAudio fallback ativado');
        }
    }

    function desativarWakeLock() {
        if (Estado.wakelock.lock) {
            Estado.wakelock.lock.release().catch(() => {});
            Estado.wakelock.lock = null;
        }
        if (Estado.wakelock.oscillator) {
            Estado.wakelock.oscillator.stop();
            Estado.wakelock.oscillator.disconnect();
            Estado.wakelock.oscillator = null;
        }
        if (Estado.wakelock.audioCtx) {
            Estado.wakelock.audioCtx.close().catch(() => {});
            Estado.wakelock.audioCtx = null;
        }
        console.log('🔴 WakeLock/WebAudio desativado');
    }

    // ============================================
    // ANTI-BOT
    // ============================================
    function ativarAntiBot() {
        Estado.antibot.ativo = true;
        Estado.antibot.pausado = false;
        localStorage.setItem(CONFIG.storage.antibot, '1');
        atualizarUIAntiBot();
        console.log('🤖 Anti-Bot Detector ATIVADO');
        Toast.success('🤖 Anti-Bot Detector ativado!');
    }

    function desativarAntiBot() {
        Estado.antibot.ativo = false;
        Estado.antibot.pausado = false;
        localStorage.setItem(CONFIG.storage.antibot, '0');
        localStorage.setItem(CONFIG.storage.botPausado, '0');
        window.TWBotControl.pausado = false;
        atualizarUIAntiBot();
        console.log('🤖 Anti-Bot Detector DESATIVADO');
        Toast.info('🤖 Anti-Bot Detector desativado');
    }

    function pausarSistema() {
        window.TWBotControl.pausar();
        Estado.antibot.pausado = true;
        atualizarUIAntiBot();

        const timestamp = new Date().toLocaleString('pt-BR');
        console.log(`🚨 ANTI-BOT DETECTADO! ${timestamp}`);
        Toast.error('⚠️ ANTI-BOT DETECTADO! Fazendo logout...');

        try {
            new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS99+aqVRILTKXh8sBvIA==').play();
        } catch (e) {}

        if (Estado.antilogoff.ativo) {
            desativarAntiLogoff();
        }

        setTimeout(() => {
            fazerLogout();
        }, 2000);
    }

    function fazerLogout() {
        console.log('🚪 Executando logout...');
        Estado.antibot.pausado = false;
        Estado.antibot.ativo = false;
        localStorage.setItem(CONFIG.storage.antibot, '0');
        localStorage.setItem(CONFIG.storage.botPausado, '0');
        atualizarUIAntiBot();
        observerAntiBot.disconnect();

        const logoutLink = document.querySelector("a[href*='logout']");
        if (logoutLink) {
            console.log('🚪 Logout via link encontrado');
            logoutLink.click();
        } else {
            console.log('🚪 Logout via redirecionamento');
            window.location.href = "/game.php?village=0&screen=logout";
        }
    }

    const observerAntiBot = new MutationObserver(() => {
        if (!Estado.antibot.ativo || Estado.antibot.pausado) return;

        const botprotectionQuest = document.getElementById('botprotection_quest');
        const selectors = [
            '.bot-protection-row',
            '#bot_check',
            '.bot_check',
            "img[src*='popup-script']",
            "[class*='captcha']",
            "[id*='captcha']"
        ];

        const antiBotAntigo = document.querySelector(selectors.join(', '));

        if (botprotectionQuest || antiBotAntigo) {
            console.log('🚨 ANTI-BOT DETECTADO!');
            pausarSistema();
        }
    });

    // ============================================
    // ANTI-LOGOFF
    // ============================================
    function ativarAntiLogoff() {
        if (Estado.antilogoff.ativo) return;

        Estado.antilogoff.ativo = true;
        Estado.antilogoff.contadorAcoes = 0;
        Estado.antilogoff.tempoRestante = CONFIG.antiLogoff.intervalo;
        localStorage.setItem(CONFIG.storage.antilogoff, '1');

        ativarWakeLock();

        const acoes = [
            () => {
                document.title = document.title;
                console.log('📝 Ação: atualizar título');
            },
            () => {
                document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
                console.log('🖱️ Ação: mousemove');
            },
            () => {
                const evt = new KeyboardEvent('keypress', { bubbles: true });
                document.dispatchEvent(evt);
                console.log('⌨️ Ação: keypress');
            },
            () => {
                fetch('/game.php').catch(() => {});
                console.log('🌐 Ação: fetch keepalive');
            }
        ];

        Estado.antilogoff.intervalo = setInterval(() => {
            try {
                const acao = acoes[Estado.antilogoff.contadorAcoes % acoes.length];
                acao();
                Estado.antilogoff.contadorAcoes++;
                Estado.antilogoff.tempoRestante = CONFIG.antiLogoff.intervalo;
                atualizarTimer();

                if (Estado.antilogoff.reloadTimeout) {
                    clearTimeout(Estado.antilogoff.reloadTimeout);
                    Estado.antilogoff.reloadTimeout = null;
                }
            } catch (e) {
                console.error('❌ Erro na ação anti-logoff:', e);
            }
        }, CONFIG.antiLogoff.intervalo);

        atualizarUIAntiLogoff();
        atualizarTimer();
        console.log('⏰ Anti-Logoff ATIVADO');
        Toast.success('⏰ Anti-Logoff ativado!');
    }

    function desativarAntiLogoff() {
        clearInterval(Estado.antilogoff.intervalo);
        if (Estado.antilogoff.reloadTimeout) {
            clearTimeout(Estado.antilogoff.reloadTimeout);
            Estado.antilogoff.reloadTimeout = null;
        }
        Estado.antilogoff.ativo = false;
        Estado.antilogoff.intervalo = null;
        Estado.antilogoff.tempoRestante = null;
        Estado.antilogoff.contadorAcoes = 0;
        localStorage.setItem(CONFIG.storage.antilogoff, '0');

        desativarWakeLock();
        atualizarUIAntiLogoff();
        atualizarTimer();
        console.log('⏰ Anti-Logoff DESATIVADO');
        Toast.info('⏰ Anti-Logoff desativado');
    }

    setInterval(() => {
        if (Estado.antilogoff.ativo && Estado.antilogoff.tempoRestante !== null) {
            Estado.antilogoff.tempoRestante -= 1000;
            if (Estado.antilogoff.tempoRestante < 0) {
                Estado.antilogoff.tempoRestante = 0;

                if (CONFIG.antiLogoff.reloadAoFinalizar && !Estado.antilogoff.reloadTimeout) {
                    Estado.antilogoff.reloadTimeout = setTimeout(() => {
                        executarReload();
                    }, 1000);
                }
            }
            atualizarTimer();
        }
    }, 1000);

    // ============================================
    // MINIMIZAR/MAXIMIZAR - VERSÃO CORRIGIDA
    // ============================================
    function togglePainel(event) {
        event.stopPropagation();

        if (Estado.painel.minimizado) {
            // Maximizar
            Estado.painel.minimizado = false;
            painel.classList.remove('minimizado');
            UI.minimizarBtn.textContent = '−';
            console.log('📂 Painel maximizado');
        } else {
            // Minimizar
            Estado.painel.minimizado = true;
            painel.classList.add('minimizado');
            UI.minimizarBtn.textContent = '+';
            console.log('📁 Painel minimizado');
        }
    }

    // Clique no botão minimizar
    if (UI.minimizarBtn) {
        UI.minimizarBtn.addEventListener('click', togglePainel);
    }

    // Clique no painel quando minimizado (área do círculo)
    painel.addEventListener('click', function(event) {
        // Se estiver minimizado E não clicou no botão (já tratado acima)
        if (Estado.painel.minimizado && event.target !== UI.minimizarBtn) {
            event.stopPropagation();
            Estado.painel.minimizado = false;
            painel.classList.remove('minimizado');
            UI.minimizarBtn.textContent = '−';
            console.log('📂 Painel maximizado pelo clique no círculo');
        }
    });

    // ============================================
    // EVENT LISTENERS
    // ============================================
    UI.antibot.toggleBtn.addEventListener('click', () => {
        if (Estado.antibot.ativo) {
            desativarAntiBot();
        } else {
            ativarAntiBot();
            observerAntiBot.observe(document.body, { childList: true, subtree: true });
        }
    });

    UI.antilogoff.toggleBtn.addEventListener('click', () => {
        Estado.antilogoff.ativo ? desativarAntiLogoff() : ativarAntiLogoff();
    });

    // ============================================
    // RESTAURAR ESTADO
    // ============================================
    function restaurarEstado() {
        if (localStorage.getItem(CONFIG.storage.antibot) === '1') {
            ativarAntiBot();
            observerAntiBot.observe(document.body, { childList: true, subtree: true });
        }

        if (localStorage.getItem(CONFIG.storage.botPausado) === '1') {
            Estado.antibot.pausado = true;
            window.TWBotControl.pausado = true;
            atualizarUIAntiBot();
        }

        if (localStorage.getItem(CONFIG.storage.antilogoff) === '1') {
            ativarAntiLogoff();
        }

        atualizarUIAntiBot();
        atualizarUIAntiLogoff();

        // Garantir que comece minimizado
        Estado.painel.minimizado = true;
        painel.classList.add('minimizado');
        UI.minimizarBtn.textContent = '+';
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    console.log('🎮 Sistema TW Unificado 3.5 carregado!');
    console.log('📍 Painel fixo no canto inferior direito');
    console.log('🖱️ Clique no ícone 🛡️ para abrir/fechar o painel');
    console.log('📡 API disponível: window.TWBotControl');

    restaurarEstado();

})();
