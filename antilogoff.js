// ==UserScript==
// @name         TW Sistema Unificado - AntiBot + AntiLogoff
// @version      3.2
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // ============================================
    // CONFIGURAÇÕES
    // ============================================
    const CONFIG = {
        telegram: {
            token: localStorage.getItem('tw_telegram_token') || "",
            chatId: localStorage.getItem('tw_telegram_chatid') || ""
        },
        antiLogoff: {
            intervalo: 4 * 60 * 1000, // 4 minutos
            reloadAoDetectar: false
        },
        storage: {
            antibot: 'tw_antibot_enabled',
            antilogoff: 'tw_antilogoff_enabled',
            botPausado: 'tw_bot_pausado',
            reloadFinal: 'tw_reload_final',
            telegramToken: 'tw_telegram_token',
            telegramChatId: 'tw_telegram_chatid'
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
            intervalo: null
        },
        wakelock: {
            lock: null,
            audioCtx: null,
            oscillator: null
        }
    };
    
    // ============================================
    // CONTROLE DE BOTS (Para outros scripts)
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
    // CSS DO PAINEL UNIFICADO
    // ============================================
    const style = document.createElement('style');
    style.textContent = `
        #tw-painel-unified { 
            position: fixed;
            top: 120px;
            left: 0;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #654321;
            border-left: none;
            border-radius: 0 12px 12px 0;
            box-shadow: 4px 4px 16px rgba(0,0,0,0.6);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #f1e1c1;
            z-index: 99999;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateX(-335px);
        }
        
        #tw-toggle-btn { 
            position: absolute;
            top: 10px;
            right: -32px;
            width: 32px;
            height: 50px;
            background: linear-gradient(135deg, #5c4023 0%, #3d2817 100%);
            border: 2px solid #654321;
            border-left: none;
            border-radius: 0 8px 8px 0;
            color: #f1e1c1;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 18px;
            box-shadow: 3px 3px 8px rgba(0,0,0,0.5);
            transition: all 0.2s;
        }
        
        #tw-toggle-btn:hover {
            background: linear-gradient(135deg, #6d5029 0%, #4d3820 100%);
            transform: translateX(2px);
        }
        
        #tw-painel-content {
            padding: 16px;
            width: 300px;
        }
        
        .tw-header {
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            border-bottom: 2px solid #654321;
            padding-bottom: 8px;
            background: linear-gradient(90deg, #654321 0%, #8b6914 50%, #654321 100%);
            border-radius: 6px;
            padding: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .tw-section {
            background: rgba(0,0,0,0.3);
            border: 1px solid #654321;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
        }
        
        .tw-section-title {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #d4b35d;
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
            margin: 4px 2px;
            background: linear-gradient(135deg, #5c4023 0%, #3d2817 100%);
            border: 1px solid #654321;
            border-radius: 6px;
            color: #f1e1c1;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            transition: all 0.2s;
            user-select: none;
        }
        
        .tw-btn:hover {
            background: linear-gradient(135deg, #6d5029 0%, #4d3820 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        .tw-btn:active {
            transform: translateY(0);
        }
        
        .tw-btn.ativo {
            background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%);
            border-color: #2ecc71;
        }
        
        .tw-btn.pausado {
            background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
            border-color: #f39c12;
        }
        
        .tw-btn.inativo {
            background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
            border-color: #e74c3c;
        }
        
        .tw-btn.reset {
            background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%);
            border-color: #9b59b6;
            width: calc(100% - 8px);
            margin: 8px 4px 4px 4px;
        }
        
        .tw-btn.reset:hover {
            background: linear-gradient(135deg, #9b59b6 0%, #7d3c98 100%);
        }
        
        .tw-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .tw-checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            margin-top: 8px;
            cursor: pointer;
            user-select: none;
        }
        
        .tw-checkbox-label input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
        
        .tw-timer {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            padding: 8px;
            background: rgba(0,0,0,0.4);
            border-radius: 6px;
            margin-top: 8px;
            font-family: 'Courier New', monospace;
            color: #2ecc71;
        }
        
        .tw-alert {
            background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
            border: 2px solid #e74c3c;
            border-radius: 8px;
            padding: 12px;
            margin-top: 8px;
            display: none;
            animation: alertBlink 0.5s ease-in-out;
        }
        
        .tw-alert.ativo {
            display: block;
        }
        
        @keyframes alertBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .tw-alert-title {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 13px;
        }
        
        .tw-alert-text {
            font-size: 11px;
            opacity: 0.9;
        }
        
        #tw-painel-unified.aberto {
            transform: translateX(0);
        }
        
        .tw-counter-display {
            font-size: 12px;
            color: #95a5a6;
            text-align: center;
            margin-top: 6px;
        }
        
        .tw-confirm-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            animation: fadeIn 0.2s;
        }
        
        .tw-confirm-modal.ativo {
            display: flex;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .tw-confirm-box {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 3px solid #9b59b6;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.9);
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideIn {
            from { 
                transform: translateY(-50px);
                opacity: 0;
            }
            to { 
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .tw-confirm-title {
            font-size: 18px;
            font-weight: bold;
            color: #9b59b6;
            margin-bottom: 12px;
            text-align: center;
        }
        
        .tw-confirm-text {
            font-size: 14px;
            color: #f1e1c1;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        
        .tw-confirm-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        
        .tw-confirm-btn {
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid;
        }
        
        .tw-confirm-btn.sim {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            border-color: #e74c3c;
            color: white;
        }
        
        .tw-confirm-btn.sim:hover {
            background: linear-gradient(135deg, #ff6b5b 0%, #d44638 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
        }
        
        .tw-confirm-btn.nao {
            background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
            border-color: #95a5a6;
            color: white;
        }
        
        .tw-confirm-btn.nao:hover {
            background: linear-gradient(135deg, #a8b9ba 0%, #8d9a9b 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(149, 165, 166, 0.4);
        }
        
        .tw-input-group {
            margin: 8px 0;
        }
        
        .tw-input-label {
            display: block;
            font-size: 11px;
            margin-bottom: 4px;
            color: #d4b35d;
            font-weight: bold;
        }
        
        .tw-input-field {
            width: 100%;
            padding: 6px 8px;
            background: rgba(0,0,0,0.5);
            border: 1px solid #654321;
            border-radius: 4px;
            color: #f1e1c1;
            font-size: 11px;
            box-sizing: border-box;
        }
        
        .tw-input-field:focus {
            outline: none;
            border-color: #d4b35d;
            box-shadow: 0 0 4px rgba(212, 179, 93, 0.5);
        }
        
        .tw-input-hint {
            font-size: 9px;
            color: #95a5a6;
            margin-top: 2px;
            font-style: italic;
        }
        
        .tw-save-btn {
            background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%);
            border-color: #2ecc71;
            width: 100%;
            margin-top: 8px;
        }
        
        .tw-save-btn:hover {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
        }
        
        .tw-test-btn {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            border-color: #3498db;
            width: 100%;
            margin-top: 4px;
        }
        
        .tw-test-btn:hover {
            background: linear-gradient(135deg, #5dade2 0%, #3498db 100%);
        }
        
        .tw-telegram-status {
            font-size: 11px;
            text-align: center;
            margin-top: 6px;
            padding: 4px;
            border-radius: 4px;
            background: rgba(0,0,0,0.3);
        }
        
        .tw-telegram-status.ativo {
            color: #2ecc71;
            border: 1px solid #2ecc71;
        }
        
        .tw-telegram-status.inativo {
            color: #e74c3c;
            border: 1px solid #e74c3c;
        }
    `;
    document.head.appendChild(style);
    
    // ============================================
    // HTML DO PAINEL
    // ============================================
    const painel = document.createElement('div');
    painel.id = 'tw-painel-unified';
    painel.innerHTML = `
        <div id="tw-toggle-btn">☰</div>
        <div id="tw-painel-content">
            <div class="tw-header">🛡️ Sistema TW Unificado 3.2</div>
            
            <!-- ANTIBOT -->
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
            
            <!-- ANTILOGOFF -->
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
            
            <!-- TELEGRAM CONFIG -->
            <div class="tw-section">
                <div class="tw-section-title">📡 Configuração Telegram</div>
                
                <div class="tw-input-group">
                    <label class="tw-input-label">Bot Token:</label>
                    <input type="text" class="tw-input-field" id="telegram-token" value="${CONFIG.telegram.token}" placeholder="Ex: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz">
                    <div class="tw-input-hint">Token do seu bot do Telegram</div>
                </div>
                
                <div class="tw-input-group">
                    <label class="tw-input-label">Chat ID:</label>
                    <input type="text" class="tw-input-field" id="telegram-chatid" value="${CONFIG.telegram.chatId}" placeholder="Ex: 1234567890">
                    <div class="tw-input-hint">Seu ID de chat do Telegram</div>
                </div>
                
                <button class="tw-btn tw-save-btn" id="telegram-save">💾 Salvar Configurações</button>
                <button class="tw-btn tw-test-btn" id="telegram-test">📨 Testar Conexão</button>
                
                <div class="tw-telegram-status inativo" id="telegram-status">
                    ⚠️ Configuração não testada
                </div>
            </div>
            
            <!-- RESET -->
            <button class="tw-btn reset" id="reset-btn">🔄 Reset Completo do Sistema</button>
        </div>
    `;
    document.body.appendChild(painel);
    
    // Modal de confirmação
    const modal = document.createElement('div');
    modal.className = 'tw-confirm-modal';
    modal.id = 'tw-confirm-modal';
    modal.innerHTML = `
        <div class="tw-confirm-box">
            <div class="tw-confirm-title">⚠️ Confirmar Reset Completo</div>
            <div class="tw-confirm-text">
                Esta ação irá:<br>
                • Desativar todos os sistemas<br>
                • Limpar todo o localStorage<br>
                • Resetar todas as configurações<br>
                • Retornar ao estado inicial<br><br>
                <strong>Deseja continuar?</strong>
            </div>
            <div class="tw-confirm-buttons">
                <button class="tw-confirm-btn sim" id="confirm-sim">Sim, Resetar</button>
                <button class="tw-confirm-btn nao" id="confirm-nao">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // ============================================
    // ELEMENTOS DO DOM
    // ============================================
    const UI = {
        toggle: document.getElementById('tw-toggle-btn'),
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
        },
        telegram: {
            token: document.getElementById('telegram-token'),
            chatId: document.getElementById('telegram-chatid'),
            saveBtn: document.getElementById('telegram-save'),
            testBtn: document.getElementById('telegram-test'),
            status: document.getElementById('telegram-status')
        },
        reset: {
            btn: document.getElementById('reset-btn'),
            modal: document.getElementById('tw-confirm-modal'),
            confirmSim: document.getElementById('confirm-sim'),
            confirmNao: document.getElementById('confirm-nao')
        }
    };
    
    // ============================================
    // FUNÇÕES DE UI
    // ============================================
    function atualizarUIAntiBot() {
        if (Estado.antibot.pausado) {
            UI.antibot.indicator.className = 'tw-status-indicator pausado';
            UI.antibot.statusText.textContent = 'Fazendo Logout...';
            UI.antibot.toggleBtn.className = 'tw-btn pausado';
            UI.antibot.toggleBtn.textContent = '🚪 Desconectando...';
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
    
    function atualizarUITelegram() {
        // Verifica se as configurações estão preenchidas
        const tokenPreenchido = UI.telegram.token.value.trim().length > 0;
        const chatIdPreenchido = UI.telegram.chatId.value.trim().length > 0;
        
        if (tokenPreenchido && chatIdPreenchido) {
            UI.telegram.status.textContent = '✅ Configurações salvas';
            UI.telegram.status.className = 'tw-telegram-status ativo';
        } else {
            UI.telegram.status.textContent = '⚠️ Configure Token e Chat ID';
            UI.telegram.status.className = 'tw-telegram-status inativo';
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
            UI.antilogoff.timer.textContent = 'Executando...';
        } else {
            UI.antilogoff.timer.textContent = formatarTempo(Estado.antilogoff.tempoRestante);
        }
        
        UI.antilogoff.counter.textContent = `Ações: ${Estado.antilogoff.contadorAcoes}`;
    }
    
    // ============================================
    // TELEGRAM
    // ============================================
    async function enviarTelegram(msg) {
        const token = UI.telegram.token.value.trim() || CONFIG.telegram.token;
        const chatId = UI.telegram.chatId.value.trim() || CONFIG.telegram.chatId;
        
        if (!token || !chatId) {
            console.error('❌ Token ou Chat ID não configurados');
            return false;
        }
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: msg,
                    parse_mode: 'Markdown'
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                console.log('📨 Telegram enviado:', msg);
                return true;
            } else {
                console.error('❌ Erro ao enviar telegram:', data.description);
                return false;
            }
        } catch (e) {
            console.error('❌ Erro de conexão:', e);
            return false;
        }
    }
    
    async function testarTelegram() {
        UI.telegram.status.textContent = '🔄 Testando conexão...';
        UI.telegram.status.className = 'tw-telegram-status inativo';
        
        const sucesso = await enviarTelegram('🧪 *Teste de Conexão*\n\n✅ Sistema TW Unificado\n📡 Conexão Telegram funcionando perfeitamente!');
        
        if (sucesso) {
            UI.telegram.status.textContent = '✅ Conexão funcionando!';
            UI.telegram.status.className = 'tw-telegram-status ativo';
            
            // Mostrar notificação de sucesso
            mostrarNotificacao('✅ Conexão Telegram testada com sucesso!', 'sucesso');
        } else {
            UI.telegram.status.textContent = '❌ Falha na conexão';
            UI.telegram.status.className = 'tw-telegram-status inativo';
            
            // Mostrar notificação de erro
            mostrarNotificacao('❌ Falha ao testar conexão Telegram. Verifique Token e Chat ID.', 'erro');
        }
        
        return sucesso;
    }
    
    function salvarConfigTelegram() {
        const token = UI.telegram.token.value.trim();
        const chatId = UI.telegram.chatId.value.trim();
        
        if (!token || !chatId) {
            mostrarNotificacao('⚠️ Preencha Token e Chat ID antes de salvar.', 'aviso');
            return false;
        }
        
        // Salvar no localStorage
        localStorage.setItem(CONFIG.storage.telegramToken, token);
        localStorage.setItem(CONFIG.storage.telegramChatId, chatId);
        
        // Atualizar configuração em tempo real
        CONFIG.telegram.token = token;
        CONFIG.telegram.chatId = chatId;
        
        // Atualizar UI
        atualizarUITelegram();
        
        console.log('💾 Configurações Telegram salvas:', { token, chatId });
        mostrarNotificacao('✅ Configurações Telegram salvas com sucesso!', 'sucesso');
        
        return true;
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
        enviarTelegram('🤖 *Anti-Bot Detector ATIVADO*\nMonitorando proteções do jogo...');
    }
    
    function desativarAntiBot() {
        Estado.antibot.ativo = false;
        Estado.antibot.pausado = false;
        localStorage.setItem(CONFIG.storage.antibot, '0');
        localStorage.setItem(CONFIG.storage.botPausado, '0');
        window.TWBotControl.pausado = false;
        atualizarUIAntiBot();
        console.log('🤖 Anti-Bot Detector DESATIVADO');
    }
    
    function pausarSistema() {
        window.TWBotControl.pausar();
        Estado.antibot.pausado = true;
        atualizarUIAntiBot();
        
        const timestamp = new Date().toLocaleString('pt-BR');
        const msg = `⚠️ *ANTI-BOT DETECTADO!*\n\n` +
                   `🕒 ${timestamp}\n` +
                   `🚪 Realizando logout automático...\n` +
                   `🔴 Todos os bots foram desativados\n\n` +
                   `👋 Você foi desconectado por segurança`;
        
        enviarTelegram(msg);
        
        // Som de alerta
        try {
            new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS99+aqVRILTKXh8sBvIA==').play();
        } catch (e) {}
        
        // Desativar anti-logoff antes do logout
        if (Estado.antilogoff.ativo) {
            desativarAntiLogoff();
        }
        
        // Aguarda 2 segundos e faz logout
        console.log('🚪 Fazendo logout em 2 segundos...');
        setTimeout(() => {
            fazerLogout();
        }, 2000);
    }
    
    function fazerLogout() {
        // Tenta encontrar o link de logout
        const logoutLink = document.querySelector("a[href*='logout']");
        
        if (logoutLink) {
            console.log('🚪 Logout via link encontrado');
            logoutLink.click();
        } else {
            // Fallback: redireciona direto para logout
            console.log('🚪 Logout via redirecionamento');
            window.location.href = "/game.php?village=0&screen=logout";
        }
    }
    
    function retomarSistema() {
        window.TWBotControl.retomar();
        Estado.antibot.pausado = false;
        atualizarUIAntiBot();
        enviarTelegram('✅ *Sistema Retomado*\nUsuário resolveu o anti-bot manualmente.\nTodos os bots externos foram retomados.');
    }
    
    // Detector de Anti-Bot
    const observerAntiBot = new MutationObserver(() => {
        if (!Estado.antibot.ativo || Estado.antibot.pausado) return;
        
        // Novos - Tribal Wars atual
        const botprotectionQuest = document.getElementById('botprotection_quest');
        
        // Antigos - métodos anteriores
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
            } catch (e) {
                console.error('❌ Erro na ação anti-logoff:', e);
            }
        }, CONFIG.antiLogoff.intervalo);
        
        atualizarUIAntiLogoff();
        atualizarTimer();
        console.log('⏰ Anti-Logoff ATIVADO');
        enviarTelegram('⏰ *Anti-Logoff ATIVADO*\nSistema mantendo sessão ativa...');
    }
    
    function desativarAntiLogoff() {
        clearInterval(Estado.antilogoff.intervalo);
        Estado.antilogoff.ativo = false;
        Estado.antilogoff.intervalo = null;
        Estado.antilogoff.tempoRestante = null;
        Estado.antilogoff.contadorAcoes = 0;
        localStorage.setItem(CONFIG.storage.antilogoff, '0');
        
        desativarWakeLock();
        atualizarUIAntiLogoff();
        atualizarTimer();
        console.log('⏰ Anti-Logoff DESATIVADO');
    }
    
    // Atualizar contador a cada segundo
    setInterval(() => {
        if (Estado.antilogoff.ativo && Estado.antilogoff.tempoRestante !== null) {
            Estado.antilogoff.tempoRestante -= 1000;
            if (Estado.antilogoff.tempoRestante < 0) {
                Estado.antilogoff.tempoRestante = 0;
            }
            atualizarTimer();
        }
    }, 1000);
    
    // ============================================
    // NOTIFICAÇÕES
    // ============================================
    function mostrarNotificacao(mensagem, tipo = 'info') {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 16px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 9999999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
            border: 2px solid;
            animation: popIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: center;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Cores baseadas no tipo
        switch(tipo) {
            case 'sucesso':
                notif.style.background = 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)';
                notif.style.borderColor = '#2ecc71';
                notif.style.color = 'white';
                break;
            case 'erro':
                notif.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
                notif.style.borderColor = '#e74c3c';
                notif.style.color = 'white';
                break;
            case 'aviso':
                notif.style.background = 'linear-gradient(135deg, #f39c12 0%, #d35400 100%)';
                notif.style.borderColor = '#f39c12';
                notif.style.color = 'white';
                break;
            default:
                notif.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
                notif.style.borderColor = '#3498db';
                notif.style.color = 'white';
        }
        
        notif.innerHTML = mensagem;
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'fadeOut 0.3s';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }
    
    // ============================================
    // RESET COMPLETO
    // ============================================
    function resetCompleto() {
        console.log('🔄 Iniciando Reset Completo do Sistema...');
        
        // 1. Desativar todos os sistemas
        if (Estado.antibot.ativo) {
            desativarAntiBot();
        }
        
        if (Estado.antilogoff.ativo) {
            desativarAntiLogoff();
        }
        
        // 2. Parar observer
        observerAntiBot.disconnect();
        
        // 3. Limpar todos os intervalos
        if (Estado.antilogoff.intervalo) {
            clearInterval(Estado.antilogoff.intervalo);
        }
        
        // 4. Desativar WakeLock
        desativarWakeLock();
        
        // 5. Limpar localStorage
        Object.values(CONFIG.storage).forEach(key => {
            localStorage.removeItem(key);
        });
        
        // 6. Resetar estados
        Estado.antibot.ativo = false;
        Estado.antibot.pausado = false;
        Estado.antilogoff.ativo = false;
        Estado.antilogoff.tempoRestante = null;
        Estado.antilogoff.contadorAcoes = 0;
        Estado.antilogoff.intervalo = null;
        Estado.wakelock.lock = null;
        Estado.wakelock.audioCtx = null;
        Estado.wakelock.oscillator = null;
        
        // 7. Resetar controle de bots
        window.TWBotControl.pausado = false;
        
        // 8. Atualizar UI
        atualizarUIAntiBot();
        atualizarUIAntiLogoff();
        atualizarUITelegram();
        
        // 9. Resetar campos de input
        UI.telegram.token.value = '';
        UI.telegram.chatId.value = '';
        
        // 10. Fechar painel
        painel.classList.remove('aberto');
        
        console.log('✅ Reset Completo finalizado!');
        console.log('📊 Sistema retornado ao estado inicial');
        
        // 11. Notificar via Telegram (se ainda tiver config salva)
        setTimeout(() => {
            enviarTelegram('🔄 *Sistema Resetado*\n\n✅ Reset completo realizado\n📊 Todos os estados limpos\n🎮 Sistema pronto para nova execução');
        }, 1000);
        
        // 12. Notificação visual
        mostrarNotificacao('✅ Sistema Resetado com Sucesso!', 'sucesso');
    }
    
    function mostrarConfirmacao() {
        UI.reset.modal.classList.add('ativo');
    }
    
    function esconderConfirmacao() {
        UI.reset.modal.classList.remove('ativo');
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    // Toggle painel
    UI.toggle.addEventListener('click', () => {
        painel.classList.toggle('aberto');
        console.log(`📌 Painel ${painel.classList.contains('aberto') ? 'aberto' : 'fechado'}`);
    });
    
    // AntiBot
    UI.antibot.toggleBtn.addEventListener('click', () => {
        if (Estado.antibot.ativo) {
            desativarAntiBot();
        } else {
            ativarAntiBot();
            observerAntiBot.observe(document.body, { childList: true, subtree: true });
        }
    });
    
    // AntiLogoff
    UI.antilogoff.toggleBtn.addEventListener('click', () => {
        Estado.antilogoff.ativo ? desativarAntiLogoff() : ativarAntiLogoff();
    });
    
    // Telegram - Salvar
    UI.telegram.saveBtn.addEventListener('click', () => {
        salvarConfigTelegram();
    });
    
    // Telegram - Testar
    UI.telegram.testBtn.addEventListener('click', () => {
        testarTelegram();
    });
    
    // Telegram - Atualizar status ao digitar
    UI.telegram.token.addEventListener('input', atualizarUITelegram);
    UI.telegram.chatId.addEventListener('input', atualizarUITelegram);
    
    // Reset - Abrir modal
    UI.reset.btn.addEventListener('click', () => {
        mostrarConfirmacao();
    });
    
    // Reset - Confirmar
    UI.reset.confirmSim.addEventListener('click', () => {
        esconderConfirmacao();
        resetCompleto();
    });
    
    // Reset - Cancelar
    UI.reset.confirmNao.addEventListener('click', () => {
        esconderConfirmacao();
    });
    
    // Fechar modal ao clicar fora
    UI.reset.modal.addEventListener('click', (e) => {
        if (e.target === UI.reset.modal) {
            esconderConfirmacao();
        }
    });
    
    // ============================================
    // RESTAURAR ESTADO
    // ============================================
    function restaurarEstado() {
        // Restaurar AntiBot
        if (localStorage.getItem(CONFIG.storage.antibot) === '1') {
            ativarAntiBot();
            observerAntiBot.observe(document.body, { childList: true, subtree: true });
        }
        
        // Restaurar pausado
        if (localStorage.getItem(CONFIG.storage.botPausado) === '1') {
            Estado.antibot.pausado = true;
            window.TWBotControl.pausado = true;
            atualizarUIAntiBot();
        }
        
        // Restaurar AntiLogoff
        if (localStorage.getItem(CONFIG.storage.antilogoff) === '1') {
            ativarAntiLogoff();
        }
        
        // Atualizar UIs
        atualizarUIAntiBot();
        atualizarUIAntiLogoff();
        atualizarUITelegram();
    }
    
    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    console.log('🎮 Sistema TW Unificado 3.2 carregado!');
    console.log('📡 API para scripts externos:');
    console.log('   - window.TWBotControl.pausar()');
    console.log('   - window.TWBotControl.retomar()');
    console.log('   - window.TWBotControl.podeExecutar()');
    console.log('   - Eventos: "tw:pausar" e "tw:retomar"');
    
    restaurarEstado();
    
    // Mensagem de boas-vindas no Telegram (se configurado)
    setTimeout(() => {
        if (UI.telegram.token.value && UI.telegram.chatId.value) {
            enviarTelegram('🎮 *Sistema TW Unificado 3.2 Iniciado*\n\n✅ Painel carregado com sucesso\n📊 Estado restaurado\n⚙️ Configurações Telegram carregadas');
        }
    }, 2000);
    
    // Adicionar animações ao CSS
    const animations = document.createElement('style');
    animations.textContent = `
        @keyframes popIn {
            0% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.05);
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
    `;
    document.head.appendChild(animations);
    
})();
