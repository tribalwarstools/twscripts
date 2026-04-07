// ==UserScript==
// @name         Tribal Wars - Agendador de Ataques (Compatível Basic/Premium)
// @namespace    http://tampermonkey.net/
// @version      15.0
// @description  Agende ataques com precisão - Com NT4 e NT5 na lista de ataques (envio instantâneo)
// @author       Você
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONSTANTES
    // ============================================
    const TROOP_LIST = [
        { id: 'spear', nome: 'Lanceiro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_spear.png' },
        { id: 'sword', nome: 'Espadachim', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_sword.png' },
        { id: 'axe', nome: 'Bárbaro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_axe.png' },
        { id: 'archer', nome: 'Arqueiro', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_archer.png' },
        { id: 'spy', nome: 'Explorador', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_spy.png' },
        { id: 'light', nome: 'Cavalaria leve', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_light.png' },
        { id: 'marcher', nome: 'Arqueiro a cavalo', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_marcher.png' },
        { id: 'heavy', nome: 'Cavalaria pesada', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_heavy.png' },
        { id: 'ram', nome: 'Aríete', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_ram.png' },
        { id: 'catapult', nome: 'Catapulta', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_catapult.png' },
        { id: 'knight', nome: 'Paladino', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_knight.png' },
        { id: 'snob', nome: 'Nobre', icon: 'https://dsgvo.tribalwars.com.br/graphic/unit/unit_snob.png' }
    ];
    const TROOP_IDS = TROOP_LIST.map(t => t.id);
    const TROOP_ICONS = Object.fromEntries(TROOP_LIST.map(t => [t.id, t.icon]));
    const TROOP_NAMES = Object.fromEntries(TROOP_LIST.map(t => [t.id, t.nome]));

    const STORAGE_KEYS = {
        FORM_DATA: 'tws_form_data_v6',
        ATTACKS: 'tws_ataques_v7',
        TEMPLATES: 'tws_templates_v3',
        PANEL_POSITION: 'tws_panel_position',
        PANEL_MINIMIZED: 'tws_panel_minimized'
    };

    const world = location.hostname.split('.')[0];
    const VILLAGE_TXT_URL = `/map/village.txt`;
    let _villageMap = {};
    let _myVillages = [];

    // ============================================
    // DATA/HORA DO SERVIDOR
    // ============================================

    function getServerTimestampSeconds() {
        if (window.Timing && typeof Timing.getCurrentServerTime === 'function') {
            return Timing.getCurrentServerTime() / 1000;
        }

        const serverTimeSpan = document.getElementById('serverTime');
        const serverDateSpan = document.getElementById('serverDate');

        if (serverTimeSpan && serverDateSpan) {
            const timeStr = serverTimeSpan.textContent;
            const dateStr = serverDateSpan.textContent;
            const [day, month, year] = dateStr.split('/');
            const [hours, minutes, seconds] = timeStr.split(':');
            const serverDate = new Date(year, month - 1, day, hours, minutes, seconds);
            return serverDate.getTime() / 1000;
        }

        return Date.now() / 1000;
    }

    function getServerDate() {
        return new Date(getServerTimestampSeconds() * 1000);
    }

    function formatDateToString(date) {
        const pad = n => String(n).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
               `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function preencherDataHoraAutomatica() {
        const dataInput = document.getElementById('data');
        const horaInput = document.getElementById('hora');
        if (!dataInput || !horaInput) return;
        const now = getServerDate();
        const pad = n => String(n).padStart(2, '0');
        dataInput.value = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
        horaInput.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }

    function adicionarMinutos(minutos) {
        const now = getServerDate();
        now.setMinutes(now.getMinutes() + minutos);
        return formatDateToString(now);
    }

    // ============================================
    // BUSCAR SUAS ALDEIAS
    // ============================================
    async function fetchMyVillages() {
        try {
            console.log('[TWS] Buscando aldeias...');

            const response = await fetch(VILLAGE_TXT_URL);
            if (!response.ok) throw new Error('Falha ao carregar village.txt');

            const data = await response.text();

            const allVillages = data.trim().split('\n').map(line => {
                const [id, name, x, y, player, points] = line.split(',');
                return {
                    id: id,
                    name: decodeURIComponent(name.replace(/\+/g, ' ')),
                    coord: `${x}|${y}`,
                    x: parseInt(x),
                    y: parseInt(y),
                    player: parseInt(player),
                    points: parseInt(points)
                };
            });

            const meuId = window.game_data?.player?.id;
            if (!meuId) {
                console.warn('[TWS] game_data.player.id não encontrado');
                return [];
            }

            _myVillages = allVillages.filter(v => v.player === meuId);
            _myVillages.sort((a, b) => a.name.localeCompare(b.name));

            _villageMap = {};
            _myVillages.forEach(v => {
                _villageMap[v.coord] = v.id;
            });

            console.log(`[TWS] ✅ ${_myVillages.length} aldeias encontradas!`);
            return _myVillages;

        } catch (err) {
            console.error('[TWS] Erro ao buscar aldeias:', err);
            _myVillages = [];
            return [];
        }
    }

    // ============================================
    // SISTEMA DE EVENTOS
    // ============================================
    const EventSystem = {
        _events: {},
        on(event, cb) { (this._events[event] = this._events[event] || []).push(cb); return this; },
        off(event, cb) {
            if (!this._events[event]) return this;
            if (!cb) delete this._events[event];
            else {
                const i = this._events[event].indexOf(cb);
                if (i > -1) this._events[event].splice(i, 1);
            }
            return this;
        },
        trigger(event, data) {
            (this._events[event] || []).forEach(cb => cb(data));
            return this;
        }
    };

    // ============================================
    // TOAST
    // ============================================
    const Toast = {
        _container: null,
        _getContainer() {
            if (!this._container) {
                this._container = document.createElement('div');
                this._container.id = 'tws-toast-container';
                this._container.style.cssText = `
                    position:fixed;top:20px;right:20px;z-index:999999;
                    display:flex;flex-direction:column;gap:10px;`;
                document.body.appendChild(this._container);
            }
            return this._container;
        },
        _show(message, type, duration = 3000) {
            const colors = { success: '#4caf50', error: '#f44336', info: '#ff9800' };
            const el = document.createElement('div');
            el.style.cssText = `
                background:${colors[type]};color:white;padding:12px 20px;
                border-radius:8px;font-size:14px;font-family:Arial,sans-serif;
                box-shadow:0 2px 10px rgba(0,0,0,.2);cursor:pointer;z-index:999999;
                animation:slideInRight 0.3s ease;`;
            el.innerHTML = message;
            el.onclick = () => el.remove();
            this._getContainer().appendChild(el);
            setTimeout(() => el.remove(), duration);
        },
        success(m, d) { this._show(m, 'success', d); },
        error(m, d) { this._show(m, 'error', d); },
        info(m, d) { this._show(m, 'info', d); }
    };

    // CSS animations
    if (!document.querySelector('#tws-animations')) {
        const s = document.createElement('style');
        s.id = 'tws-animations';
        s.textContent = `
            @keyframes tws-spin { to { transform:rotate(360deg); } }
            @keyframes slideInRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
            @keyframes slideOutRight { from{transform:translateX(0);opacity:1} to{transform:translateX(100%);opacity:0} }
        `;
        document.head.appendChild(s);
    }

    // ============================================
    // CAIXA DE CONFIRMAÇÃO
    // ============================================
    const ConfirmationBox = {
        show(message, onConfirm, onCancel) {
            const fader = document.createElement('div');
            fader.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;
                background:rgba(0,0,0,.5);z-index:999999;display:flex;
                justify-content:center;align-items:center;`;
            const box = document.createElement('div');
            box.style.cssText = `background:#2a2a2a;border-radius:10px;padding:20px;
                min-width:300px;max-width:400px;box-shadow:0 5px 25px rgba(0,0,0,.3);
                border:1px solid #ff9900;z-index:999999;`;
            box.innerHTML = `
                <p style="color:#fff;margin-bottom:20px;font-size:14px;">${message}</p>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="tws-confirm-no" style="background:#555;color:#fff;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Não</button>
                    <button id="tws-confirm-yes" style="background:#ff9900;color:#1a1a1a;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;font-weight:bold;">Sim</button>
                </div>`;
            fader.appendChild(box);
            document.body.appendChild(fader);
            document.getElementById('tws-confirm-yes').onclick = () => { fader.remove(); onConfirm && onConfirm(); };
            document.getElementById('tws-confirm-no').onclick = () => { fader.remove(); onCancel && onCancel(); };
        }
    };

    // ============================================
    // LOADING INDICATOR
    // ============================================
    const LoadingIndicator = {
        _el: null,
        show() {
            if (!this._el) {
                if (!document.querySelector('#tws-spinner-style')) {
                    const s = document.createElement('style');
                    s.id = 'tws-spinner-style';
                    s.textContent = `.tws-spinner{width:20px;height:20px;border:2px solid #ff9900;
                        border-top-color:transparent;border-radius:50%;
                        animation:tws-spin .8s linear infinite;}`;
                    document.head.appendChild(s);
                }
                this._el = document.createElement('div');
                this._el.id = 'tws-loading';
                this._el.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                    background:rgba(0,0,0,.8);color:#ff9900;padding:20px 30px;border-radius:10px;
                    z-index:999999;font-size:16px;font-weight:bold;display:flex;gap:10px;align-items:center;`;
                this._el.innerHTML = '<div class="tws-spinner"></div> Enviando ataques...';
                document.body.appendChild(this._el);
            }
            this._el.style.display = 'flex';
        },
        hide() { if (this._el) this._el.style.display = 'none'; }
    };

    // ============================================
    // SCROLL SLIM
    // ============================================
    function initSlimScroll(container) {
        if (!container) return;
        container.style.overflowY = 'auto';
        container.style.maxHeight = '400px';
        container.style.scrollbarWidth = 'thin';
        container.style.scrollbarColor = '#ff9900 #333';
    }

    // ============================================
    // PERSISTÊNCIA DO PAINEL
    // ============================================
    function salvarPosicaoPainel(x, y) {
        localStorage.setItem(STORAGE_KEYS.PANEL_POSITION, JSON.stringify({
            x: x + (window.scrollX || 0),
            y: y + (window.scrollY || 0)
        }));
    }

    function carregarPosicaoPainel(painel) {
        const saved = localStorage.getItem(STORAGE_KEYS.PANEL_POSITION);
        if (!saved) return false;
        try {
            const { x, y } = JSON.parse(saved);
            const ax = x - (window.scrollX || 0);
            const ay = y - (window.scrollY || 0);
            const maxX = window.innerWidth - painel.offsetWidth;
            const maxY = window.innerHeight - painel.offsetHeight;
            const nx = Math.min(Math.max(0, ax), maxX);
            const ny = Math.min(Math.max(0, ay), maxY);
            if (nx >= 0 && nx <= maxX && ny >= 0 && ny <= maxY) {
                painel.style.left = `${nx}px`;
                painel.style.top = `${ny}px`;
                painel.style.transform = 'none';
                painel.style.right = 'auto';
                painel.style.bottom = 'auto';
                return true;
            }
        } catch (_) { }
        return false;
    }

    function salvarEstadoMinimizado(v) { localStorage.setItem(STORAGE_KEYS.PANEL_MINIMIZED, v ? '1' : '0'); }
    function carregarEstadoMinimizado() { return localStorage.getItem(STORAGE_KEYS.PANEL_MINIMIZED) === '1'; }

    // ============================================
    // TEMPLATES DE TROPAS
    // ============================================
    let troopTemplates = [];

    function loadTemplates() {
        const s = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
        if (s) troopTemplates = JSON.parse(s);
    }
    function saveTemplates() {
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(troopTemplates));
    }
    function saveCurrentAsTemplate(name) {
        const tropas = {};
        TROOP_IDS.forEach(t => {
            const inp = document.getElementById(t);
            if (inp) tropas[t] = parseInt(inp.value) || 0;
        });
        troopTemplates.push({ id: Date.now(), name, tropas });
        saveTemplates();
        renderTemplateList();
        Toast.success(`✅ Template "${name}" salvo!`);
    }
    function loadTemplate(id) {
        const tpl = troopTemplates.find(t => t.id === id);
        if (!tpl) return;
        TROOP_IDS.forEach(t => {
            const inp = document.getElementById(t);
            if (inp && tpl.tropas[t] !== undefined) inp.value = tpl.tropas[t];
        });
        Toast.success(`✅ Template "${tpl.name}" carregado!`);
    }
    function deleteTemplate(id) {
        ConfirmationBox.show('Excluir este template?', () => {
            troopTemplates = troopTemplates.filter(t => t.id !== id);
            saveTemplates();
            renderTemplateList();
            Toast.success('✅ Template excluído!');
        });
    }
    function renderTemplateList() {
        const c = document.getElementById('tws-template-list');
        if (!c) return;
        if (!troopTemplates.length) {
            c.innerHTML = '<div style="color:#666;text-align:center;padding:10px;">Nenhum template salvo</div>';
            return;
        }
        c.innerHTML = troopTemplates.map(t => `
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:5px;background:#333;margin-bottom:5px;border-radius:4px;">
                <span style="font-size:12px;cursor:pointer;" onclick="window.loadTemplate(${t.id})">
                    📋 ${escapeHtml(t.name)}
                </span>
                <button onclick="window.deleteTemplate(${t.id})"
                    style="background:#990000;color:#fff;border:none;padding:2px 8px;border-radius:3px;cursor:pointer;">✖</button>
            </div>`).join('');
    }
    window.loadTemplate = loadTemplate;
    window.deleteTemplate = deleteTemplate;

    // ============================================
    // IMPORTAÇÃO BBCODE
    // ============================================
    function importarBBCode() {
        const texto = prompt('Cole o BBCode dos ataques:');
        if (!texto) return;
        const modo = confirm('Adicionar mesmo se já existirem?\nOK = sim | Cancelar = ignorar duplicatas');
        const linhas = texto.split('[*]').filter(l => l.trim());
        let importados = 0, ignorados = 0;

        for (const linha of linhas) {
            const coords = linha.match(/(\d{1,4}\|\d{1,4})/g);
            if (!coords || coords.length < 2) continue;
            const origem = coords[0], alvo = coords[1];
            const dataMatch = linha.match(/(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}(?::\d{2})?)/);
            if (!dataMatch) continue;
            let datahora = dataMatch[1];
            if (datahora.split(':').length === 2) datahora += ':00';
            const urlMatch = linha.match(/\[url=(.*?)\]/);
            const tropas = {};
            if (urlMatch) {
                const params = new URLSearchParams(urlMatch[1].split('?')[1] || '');
                TROOP_IDS.forEach(t => { const v = params.get(`att_${t}`); if (v) tropas[t] = parseInt(v); });
            }
            const ataques = carregarAtaques();
            const existe = ataques.some(a => a.origem === origem && a.alvo === alvo && a.datahora === datahora);
            if (!modo && existe) { ignorados++; continue; }
            ataques.push({ id: Date.now() + Math.random() + importados, origem, alvo, datahora, ...tropas,
                enviado: false, travado: false, sucesso: null });
            salvarAtaques(ataques);
            importados++;
        }
        if (importados > 0)
            Toast.success(`✅ ${importados} ataques importados!${ignorados > 0 ? ` (${ignorados} ignorados)` : ''}`);
        else if (ignorados > 0)
            Toast.info(`ℹ️ ${ignorados} ataques já existentes.`);
        else
            Toast.error('❌ Nenhum ataque encontrado!');
    }

    // ============================================
    // EXIBIÇÃO DE TROPAS
    // ============================================
    function formatTroopsForDisplay(tropas) {
        const list = TROOP_IDS.filter(t => (tropas[t] || 0) > 0);
        if (!list.length) return '';
        const show = list.slice(0, 6);
        const hasMore = list.length > 6;
        let html = '<div class="troops-preview">';
        show.forEach(t => {
            html += `<span style="background:#333;padding:2px 5px;border-radius:3px;
                        display:inline-flex;align-items:center;gap:3px;">
                        <img src="${TROOP_ICONS[t]}" style="width:16px;height:16px;" title="${TROOP_NAMES[t]}">
                        ${number_format(tropas[t], '.')}
                     </span>`;
        });
        if (hasMore) html += `<span style="background:#333;padding:2px 5px;border-radius:3px;">+${list.length - 6}</span>`;
        html += '</div>';
        return html;
    }

    function number_format(n, sep) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    }

    // ============================================
    // POPUP TEMPLATES
    // ============================================
    function showTemplatePopup() {
        let popup = document.getElementById('tws-template-popup');
        if (popup) { popup.style.display = popup.style.display === 'none' ? 'flex' : 'none'; return; }
        popup = document.createElement('div');
        popup.id = 'tws-template-popup';
        popup.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:#1e1e1e;border:2px solid #ff9900;border-radius:10px;padding:20px;
            z-index:999999;min-width:300px;box-shadow:0 5px 25px rgba(0,0,0,.5);`;
        popup.innerHTML = `
            <h4 style="color:#ff9900;margin:0 0 15px 0;">📋 Templates de Tropas</h4>
            <div id="tws-template-list" style="margin-bottom:15px;max-height:300px;overflow-y:auto;"></div>
            <div style="display:flex;gap:10px;">
                <input type="text" id="tws-new-template-name" placeholder="Nome do template"
                    style="flex:1;background:#333;border:1px solid #555;color:#fff;padding:5px;border-radius:4px;">
                <button id="tws-save-template"
                    style="background:#006600;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">
                    Salvar Atual</button>
            </div>
            <button id="tws-close-popup"
                style="position:absolute;top:5px;right:10px;background:none;border:none;color:#fff;cursor:pointer;font-size:18px;">✖</button>`;
        document.body.appendChild(popup);
        renderTemplateList();
        initSlimScroll(document.getElementById('tws-template-list'));
        document.getElementById('tws-save-template').onclick = () => {
            const name = document.getElementById('tws-new-template-name').value.trim();
            name ? saveCurrentAsTemplate(name) : Toast.error('Digite um nome!');
        };
        document.getElementById('tws-close-popup').onclick = () => popup.remove();
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    // ============================================
    // VERIFICAR TROPAS DISPONÍVEIS
    // ============================================
    async function getVillageTroops(villageId) {
        try {
            const url = `/game.php?village=${villageId}&screen=place`;
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res.ok) throw new Error('Falha ao carregar /place');
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const troops = {};
            TROOP_IDS.forEach(u => {
                let el = doc.querySelector(`#units_entry_all_${u}`) ||
                         doc.querySelector(`#units_home_${u}`) ||
                         doc.querySelector(`.unit-input-faded a[data-unit="${u}"] + span`);
                const txt = el ? (el.textContent || '').replace(/\./g, '').replace(/,/g, '').trim() : '0';
                const m = txt.match(/(\d+)/g);
                troops[u] = m ? parseInt(m.join(''), 10) : 0;
            });
            return troops;
        } catch (err) {
            console.error('[TWS] Erro getVillageTroops:', err);
            return null;
        }
    }

    function validateTroops(requested, available) {
        const errors = [];
        TROOP_IDS.forEach(u => {
            const req = Number(requested[u] || 0);
            const avail = Number(available[u] || 0);
            if (req > avail) errors.push(`${TROOP_NAMES[u]}: ${req}/${avail}`);
        });
        return errors;
    }

    // ============================================
    // DETECTAR CONFIRMAÇÃO
    // ============================================
    function isAttackConfirmed(htmlText) {
        const patterns = [
            /<tr class="command-row">/i,
            /class="command-row"/i,
            /Movimento de tropas/i,
            /Comando adicionado/i,
            /ataque foi adicionado/i,
            /command-row.*ataque/i
        ];

        for (const pattern of patterns) {
            if (pattern.test(htmlText)) {
                console.log('[TWS] ✅ ATAQUE CONFIRMADO!');
                return true;
            }
        }

        console.log('[TWS] ❌ Nenhum comando detectado na resposta');
        return false;
    }

    // ============================================
    // EXECUTAR ATAQUE
    // ============================================
    async function executeAttack(cfg) {
        try {
            const origemId = _villageMap[cfg.origem];
            if (!origemId) throw new Error(`Vila origem ${cfg.origem} não encontrada`);

            const [x, y] = (cfg.alvo || '').split('|');
            if (!x || !y) throw new Error(`Alvo inválido: ${cfg.alvo}`);

            const availableTroops = await getVillageTroops(origemId);
            if (availableTroops) {
                const errors = validateTroops(cfg, availableTroops);
                if (errors.length) {
                    throw new Error(`Tropas insuficientes: ${errors.join(', ')}`);
                }
            }

            const placeUrl = `/game.php?village=${origemId}&screen=place`;

            const getRes = await fetch(placeUrl, { credentials: 'same-origin' });
            if (!getRes.ok) throw new Error(`GET /place falhou: ${getRes.status}`);

            const html = await getRes.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            let form = doc.querySelector('#command-data-form') ||
                       doc.querySelector('form[action*="screen=place"]') ||
                       doc.forms[0];
            if (!form) throw new Error('Formulário não encontrado');

            const payload = {};
            form.querySelectorAll('input, select, textarea').forEach(inp => {
                if (!inp.name) return;
                if (inp.type === 'checkbox' || inp.type === 'radio') {
                    if (inp.checked) payload[inp.name] = inp.value || 'on';
                } else {
                    payload[inp.name] = inp.value || '';
                }
            });

            payload.x = String(x);
            payload.y = String(y);
            TROOP_IDS.forEach(u => { payload[u] = String(cfg[u] !== undefined ? cfg[u] : 0); });

            payload.attack = 'Ataque';

            let postUrl = form.getAttribute('action') || placeUrl;
            if (postUrl.startsWith('/')) postUrl = postUrl;

            const postRes = await fetch(postUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: new URLSearchParams(payload).toString()
            });

            if (!postRes.ok && postRes.status !== 302)
                throw new Error(`POST inicial falhou: ${postRes.status}`);

            const postText = await postRes.text();

            if (postText.includes('try=confirm') || postText.includes('confirmation')) {
                const postDoc = new DOMParser().parseFromString(postText, 'text/html');
                const confirmForm = postDoc.querySelector('form[action*="try=confirm"]') ||
                                   postDoc.querySelector('#command-data-form');

                if (confirmForm) {
                    const confirmPayload = {};
                    confirmForm.querySelectorAll('input, select, textarea').forEach(inp => {
                        if (!inp.name) return;
                        if (inp.type === 'checkbox' || inp.type === 'radio') {
                            if (inp.checked) confirmPayload[inp.name] = inp.value || 'on';
                        } else {
                            confirmPayload[inp.name] = inp.value || '';
                        }
                    });

                    const confirmBtn = confirmForm.querySelector('#troop_confirm_submit') ||
                                      confirmForm.querySelector('button[type="submit"]') ||
                                      confirmForm.querySelector('input[type="submit"]');
                    if (confirmBtn?.name) confirmPayload[confirmBtn.name] = confirmBtn.value || '';

                    let confirmUrl = confirmForm.getAttribute('action') || postRes.url || placeUrl;
                    if (confirmUrl.startsWith('/')) confirmUrl = confirmUrl;

                    const confirmRes = await fetch(confirmUrl, {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                        },
                        body: new URLSearchParams(confirmPayload).toString()
                    });

                    const finalText = await confirmRes.text();
                    return isAttackConfirmed(finalText);
                }
            }

            return isAttackConfirmed(postText);

        } catch (err) {
            console.error('[TWS] executeAttack error:', err);
            throw err;
        }
    }

    // ============================================
    // FUNÇÕES NT4 e NT5 NA LISTA DE ATAQUES (SEM DELAY)
    // ============================================

    /**
     * Envia múltiplos ataques idênticos - INSTANTÂNEO (sem delay)
     * @param {number} index - Índice do ataque na lista
     * @param {number} quantidade - Número de ataques a enviar (4 ou 5)
     */
    async function enviarMultiplosDoAtaque(index, quantidade) {
        const ataques = carregarAtaques();
        const ataqueOriginal = ataques[index];

        if (!ataqueOriginal) {
            Toast.error('Ataque não encontrado!');
            return;
        }

        // Verificar se o ataque original tem tropas
        const hasTroops = TROOP_IDS.some(t => (ataqueOriginal[t] || 0) > 0);
        if (!hasTroops) {
            Toast.error('Este ataque não possui tropas configuradas!');
            return;
        }

        // Montar mensagem de confirmação
        let tropasMsg = '';
        TROOP_IDS.forEach(t => {
            if (ataqueOriginal[t] && ataqueOriginal[t] > 0) {
                tropasMsg += `\n${TROOP_NAMES[t]}: ${number_format(ataqueOriginal[t], '.')}`;
            }
        });

        ConfirmationBox.show(
            `🚀 Enviar ${quantidade} ataques INSTANTÂNEOS (sem delay!):\n\n` +
            `Origem: ${ataqueOriginal.origem}\n` +
            `Alvo: ${ataqueOriginal.alvo}${tropasMsg}\n\n` +
            `⚠️ Todos os ${quantidade} ataques serão disparados SIMULTANEAMENTE!`,
            async () => {
                LoadingIndicator.show();

                // Disparar TODOS os ataques ao mesmo tempo (Promise.all)
                const promises = [];
                for (let i = 1; i <= quantidade; i++) {
                    promises.push(
                        executeAttack(ataqueOriginal)
                            .then(sucesso => ({ index: i, sucesso }))
                            .catch(err => ({ index: i, sucesso: false, error: err.message }))
                    );
                }

                // Aguardar todos completarem
                const results = await Promise.all(promises);

                const sucessos = results.filter(r => r.sucesso === true).length;
                const falhas = results.filter(r => r.sucesso === false).length;

                LoadingIndicator.hide();

                // Mostrar resultado resumido
                results.forEach(r => {
                    if (r.sucesso) {
                        Toast.success(`✅ Ataque ${r.index}/${quantidade} enviado!`, 1500);
                    } else {
                        Toast.error(`❌ Ataque ${r.index}/${quantidade} falhou: ${r.error || 'motivo desconhecido'}`, 1500);
                    }
                });

                if (sucessos === quantidade) {
                    Toast.success(`🎯 PERFEITO! ${sucessos}/${quantidade} ataques simultâneos enviados!`);
                } else {
                    Toast.info(`📊 Resultado: ${sucessos} sucessos, ${falhas} falhas`);
                }
            }
        );
    }

    function enviarNT4DoAtaque(index) {
        enviarMultiplosDoAtaque(index, 4);
    }

    function enviarNT5DoAtaque(index) {
        enviarMultiplosDoAtaque(index, 5);
    }

    // Expor funções globalmente
    window.enviarNT4DoAtaque = enviarNT4DoAtaque;
    window.enviarNT5DoAtaque = enviarNT5DoAtaque;

    // ============================================
    // ARMAZENAMENTO
    // ============================================
    function salvarAtaques(ataques) {
        localStorage.setItem(STORAGE_KEYS.ATTACKS, JSON.stringify(ataques));
        renderizarLista();
    }
    function carregarAtaques() {
        const d = localStorage.getItem(STORAGE_KEYS.ATTACKS);
        return d ? JSON.parse(d) : [];
    }

    function salvarDadosFormulario() {
        const dados = {
            origem: document.getElementById('origem')?.value || '',
            alvo: document.getElementById('alvo')?.value || '',
            data: document.getElementById('data')?.value || '',
            hora: document.getElementById('hora')?.value || '00:00:00'
        };
        TROOP_IDS.forEach(t => {
            const inp = document.getElementById(t);
            if (inp) dados[t] = inp.value;
        });
        localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(dados));
        Toast.success('✅ Dados do formulário salvos!');
    }

    function carregarDadosFormulario() {
        const d = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
        if (!d) return;
        try {
            const f = JSON.parse(d);
            if (f.origem) document.getElementById('origem').value = f.origem;
            if (f.alvo) document.getElementById('alvo').value = f.alvo;
            if (f.data) document.getElementById('data').value = f.data;
            if (f.hora) document.getElementById('hora').value = f.hora;
            TROOP_IDS.forEach(t => {
                if (f[t] !== undefined) {
                    const inp = document.getElementById(t);
                    if (inp) inp.value = f[t];
                }
            });
        } catch (e) { console.error('[TWS] Erro ao carregar dados:', e); }
    }

    // ============================================
    // SCHEDULER
    // ============================================
    const executando = new Set();

    function iniciarScheduler() {
        setInterval(verificarAtaques, 1000);
        console.log('[TWS] Scheduler iniciado');
    }

    async function verificarAtaques() {
        const ataques = carregarAtaques();
        const agora = getServerTimestampSeconds();

        for (const ataque of ataques) {
            if (ataque.enviado || executando.has(ataque.id)) continue;

            const [dataPart, horaPart] = ataque.datahora.split(' ');
            const [dia, mes, ano] = dataPart.split('/');
            const [hora, minuto, segundo = '00'] = horaPart.split(':');
            const dataAgendada = new Date(ano, mes - 1, dia, hora, minuto, segundo).getTime() / 1000;
            const diferenca = dataAgendada - agora;

            if (Math.abs(diferenca) <= 1) {
                executando.add(ataque.id);
                ataque.travado = true;
                salvarAtaques(ataques);

                (async () => {
                    try {
                        const sucesso = await executeAttack(ataque);
                        ataque.enviado = true;
                        ataque.sucesso = sucesso;
                        ataque.dataEnvio = new Date().toISOString();
                        if (sucesso) {
                            Toast.success(`✅ Ataque ${ataque.origem} → ${ataque.alvo} enviado!`);
                            EventSystem.trigger('attack_sent', ataque);
                        } else {
                            Toast.error(`❌ Falha no ataque ${ataque.origem} → ${ataque.alvo}`);
                        }
                    } catch (err) {
                        ataque.enviado = true;
                        ataque.sucesso = false;
                        ataque.erro = err.message;
                        Toast.error(`❌ Erro: ${err.message}`);
                    } finally {
                        ataque.travado = false;
                        executando.delete(ataque.id);
                        salvarAtaques(ataques);
                    }
                })();
            }
        }
    }

    // ============================================
    // ENVIO IMEDIATO
    // ============================================
    function enviarImediato(index) {
        const ataques = carregarAtaques();
        const ataque = ataques[index];
        if (!ataque) { Toast.error('Ataque não encontrado!'); return; }

        let tropasMsg = '';
        TROOP_IDS.forEach(t => {
            if (ataque[t] && ataque[t] > 0) tropasMsg += `\n${TROOP_NAMES[t]}: ${number_format(ataque[t], '.')}`;
        });

        ConfirmationBox.show(`Enviar ataque IMEDIATAMENTE?\n\n${ataque.origem} → ${ataque.alvo}${tropasMsg}`,
            async () => {
                LoadingIndicator.show();
                try {
                    const sucesso = await executeAttack(ataque);
                    ataques[index].enviado = true;
                    ataques[index].sucesso = sucesso;
                    ataques[index].dataEnvio = new Date().toISOString();
                    ataques[index].travado = false;
                    salvarAtaques(ataques);
                    sucesso ? Toast.success('✅ Ataque enviado!') : Toast.error('❌ Falha no envio');
                } catch (err) {
                    Toast.error(`❌ Erro: ${err.message}`);
                } finally {
                    LoadingIndicator.hide();
                }
            });
    }

    window.enviarImediato = enviarImediato;

    // ============================================
    // REPETIR ATAQUE
    // ============================================
    window.repetirAtaque = async (index) => {
        const ataques = carregarAtaques();
        const ataqueOriginal = ataques[index];
        if (!ataqueOriginal) { Toast.error('Ataque não encontrado!'); return; }

        ConfirmationBox.show(`Repetir IMEDIATAMENTE?\n\n${ataqueOriginal.origem} → ${ataqueOriginal.alvo}`,
            async () => {
                LoadingIndicator.show();
                try {
                    const sucesso = await executeAttack(ataqueOriginal);
                    sucesso ? Toast.success('✅ Ataque repetido!') : Toast.error('❌ Falha');
                } catch (err) {
                    Toast.error(`❌ Erro: ${err.message}`);
                } finally {
                    LoadingIndicator.hide();
                }
            });
    };

    // ============================================
    // INTERFACE VISUAL
    // ============================================
    let offsetX, offsetY, dragging = false;
    let painelElemento = null;

    function atualizarSelectAldeias() {
        const select = document.getElementById('origemSelect');
        if (!select) return;

        if (_myVillages.length === 0) {
            select.innerHTML = '<option value="">Nenhuma aldeia encontrada</option>';
            return;
        }

        select.innerHTML = '<option value="">Selecione uma aldeia...</option>';

        _myVillages.forEach(village => {
            const option = document.createElement('option');
            option.value = village.coord;
            option.textContent = `${village.name} (${village.coord}) - ${number_format(village.points, '.')} pts`;
            select.appendChild(option);
        });

        const currentCoord = window.game_data?.village?.coord;
        if (currentCoord && _myVillages.some(v => v.coord === currentCoord)) {
            select.value = currentCoord;
            document.getElementById('origem').value = currentCoord;
        }

        console.log(`[TWS] Select atualizado com ${_myVillages.length} aldeias`);
    }

    function criarInterface() {
        if (painelElemento) { painelElemento.style.display = 'flex'; return; }

        painelElemento = document.createElement('div');
        painelElemento.id = 'ataques-painel';

        const tropasGridHtml = TROOP_LIST.map(t => `
            <div class="tropa-item">
                <span class="tropa-label">
                    <img src="${t.icon}" style="width:20px;height:20px;vertical-align:middle;" title="${t.nome}">
                </span>
                <input type="number" id="${t.id}" value="0" min="0" step="1">
            </div>`).join('');

        painelElemento.innerHTML = `
        <style>
            #ataques-painel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                width:550px;background:#1e1e1e;color:#fff;border-radius:10px;z-index:999999;
                font-family:Arial,sans-serif;box-shadow:0 5px 20px rgba(0,0,0,.5);border:1px solid #333;}
            .painel-header{background:#ff9900;padding:10px 15px;border-radius:10px 10px 0 0;
                cursor:move;display:flex;justify-content:space-between;align-items:center;}
            .painel-header h3{margin:0;color:#1a1a1a;font-size:14px;}
            .painel-header button{background:rgba(0,0,0,.3);color:white;border:none;
                padding:2px 10px;border-radius:5px;cursor:pointer;}
            .painel-conteudo{padding:15px;max-height:600px;overflow-y:auto;}
            .campo{margin-bottom:10px;}
            .campo label{display:block;font-size:11px;margin-bottom:3px;color:#ff9900;}
            .campo input, .campo select{width:100%;padding:6px;background:#333;border:1px solid #555;
                color:#fff;border-radius:4px;box-sizing:border-box;}
            .linha-dupla{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
            .tropas-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;
                margin-bottom:10px;background:#252525;padding:10px;border-radius:5px;
                max-height:250px;overflow-y:auto;}
            .tropa-item{display:flex;justify-content:space-between;align-items:center;
                background:#333;padding:5px 8px;border-radius:4px;}
            .tropa-label{font-size:11px;color:#ff9900;display:flex;align-items:center;gap:5px;}
            .tropa-item input{width:70px;padding:3px;text-align:center;background:#1a1a1a;
                border:1px solid #555;color:#fff;border-radius:3px;}
            button{background:#ff9900;color:#1a1a1a;border:none;padding:8px 12px;border-radius:4px;
                cursor:pointer;margin-right:5px;margin-bottom:5px;font-weight:bold;}
            button.danger{background:#990000;color:#fff;}
            button.success{background:#006600;color:#fff;}
            .btn-nt{background:#cc6600;color:#fff;font-weight:bold;padding:2px 6px;font-size:10px;margin-left:5px;}
            .btn-nt4{background:#b87333;color:#fff;}
            .btn-nt5{background:#a0522d;color:#fff;}
            .ataque-item{background:#252525;padding:8px;margin-bottom:8px;border-radius:4px;
                font-size:11px;border-left:3px solid #ff9900;}
            .ataque-item.sent{border-left-color:#00ff00;opacity:.7;}
            .ataque-item.failed{border-left-color:#ff0000;}
            .ataque-item.past{border-left-color:#ffaa00;background:#2a2a1a;}
            .status{font-size:10px;color:#ff9900;margin-top:3px;}
            .miniatura{text-align:center;padding:20px;color:#666;}
            hr{border-color:#333;margin:10px 0;}
            .botoes-linha{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}
            .troops-preview{font-size:10px;margin-top:4px;color:#aaa;
                display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
            .btn-enviar-agora{background:#ff6600;color:#fff;font-size:10px;padding:2px 8px;
                margin-left:5px;border-radius:3px;cursor:pointer;border:none;}
            .btn-repetir{background:#0066cc;color:#fff;font-size:10px;padding:2px 8px;
                margin-left:5px;border-radius:3px;cursor:pointer;border:none;}
            .btn-data-hora{background:#2980b9;color:white;font-size:10px;
                padding:4px 8px;margin:0;width:auto;}
            .btn-mais-hora{background:#27ae60;color:white;font-size:10px;
                padding:4px 8px;margin:0;width:auto;}
            .linha-hora{display:flex;gap:5px;align-items:center;}
            .linha-hora input{flex:1;}
            #tws-server-indicator{font-size:9px;color:#888;margin-left:4px;}
            #tws-server-indicator.native{color:#4caf50;}
            .village-count{font-size:10px;color:#ff9900;margin-left:5px;}
            .botoes-ataque{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;}
        </style>

        <div class="painel-header" id="painel-header">
            <h3>⚔️ Agendador de Ataques
                <span id="tws-server-indicator" title="Fonte do horário do servidor">⏱</span>
                <span id="villageCount" class="village-count"></span>
            </h3>
            <button id="minimizarBtn">−</button>
        </div>

        <div class="painel-conteudo" id="painel-conteudo">
            <div class="campo">
                <label>🏠 Vila Origem</label>
                <select id="origemSelect" style="margin-bottom:5px;">
                    <option value="">Carregando aldeias...</option>
                </select>
                <input type="text" id="origem" placeholder="Ou digite coordenadas manualmente (ex: 500|500)">
            </div>
            <div class="campo">
                <label>🎯 Vila Alvo</label>
                <input type="text" id="alvo" placeholder="Ex: 510|510">
            </div>
            <div class="linha-dupla">
                <div class="campo">
                    <label>📅 Data</label>
                    <input type="text" id="data" placeholder="25/12/2024">
                </div>
                <div class="campo">
                    <label>⏰ Hora</label>
                    <div class="linha-hora">
                        <input type="text" id="hora" placeholder="15:30:00" value="00:00:00">
                        <button id="btnAgora" class="btn-data-hora" title="Horário atual do servidor">Agora</button>
                        <button id="btnMais1Hora" class="btn-mais-hora" title="+1 hora">+1h</button>
                        <button id="btnMais30Min" class="btn-mais-hora" title="+30 min">+30m</button>
                    </div>
                </div>
            </div>
            <div class="tropas-grid">${tropasGridHtml}</div>
            <div class="botoes-linha">
                <button id="agendarBtn">📅 Agendar</button>
                <button id="importarBtn" class="success">📋 Importar BBCode</button>
                <button id="templatesBtn" class="success">💾 Templates</button>
                <button id="salvarDadosBtn" class="success">💾 Salvar</button>
                <button id="limparBtn" class="danger">🗑️ Limpar Tudo</button>
                <button id="limparConcluidosBtn" class="danger">🧹 Limpar Concluídos</button>
                <button id="destravarBtn" class="danger">🔓 Destravar</button>
                <button id="resetPosicaoBtn" class="danger">🎯 Resetar Posição</button>
                <button id="recarregarAldeiasBtn" class="success">🔄 Recarregar Aldeias</button>
            </div>
            <hr>
            <h4 style="margin:5px 0;">📋 Agendados</h4>
            <div id="listaAtaques"></div>
        </div>`;

        document.body.appendChild(painelElemento);

        // Configurar eventos do select de origem
        const origemSelect = document.getElementById('origemSelect');
        const origemInput = document.getElementById('origem');

        if (origemSelect && origemInput) {
            origemSelect.addEventListener('change', () => {
                if (origemSelect.value) {
                    origemInput.value = origemSelect.value;
                }
            });

            origemInput.addEventListener('input', () => {
                if (origemInput.value) {
                    origemSelect.value = '';
                }
            });
        }

        // Botão recarregar aldeias
        document.getElementById('recarregarAldeiasBtn').onclick = async () => {
            LoadingIndicator.show();
            await fetchMyVillages();
            atualizarSelectAldeias();
            const countSpan = document.getElementById('villageCount');
            if (countSpan) countSpan.textContent = `(${_myVillages.length})`;
            LoadingIndicator.hide();
            Toast.success(`✅ ${_myVillages.length} aldeias recarregadas!`);
        };

        // Indicador de fonte do horário
        const indicator = document.getElementById('tws-server-indicator');
        const hasTiming = window.Timing && typeof Timing.getCurrentServerTime === 'function';
        if (hasTiming) {
            indicator.textContent = '⏱ servidor nativo';
            indicator.className = 'native';
            indicator.title = 'Usando Timing.getCurrentServerTime() — máxima precisão';
        } else {
            indicator.textContent = '⏱ via HTML';
            indicator.title = 'Timing não disponível — usando horário do elemento HTML';
        }

        // Posição
        const posicaoCarregada = carregarPosicaoPainel(painelElemento);
        if (!posicaoCarregada) {
            painelElemento.style.left = '50%';
            painelElemento.style.top = '50%';
            painelElemento.style.transform = 'translate(-50%,-50%)';
        }

        // Estado minimizado
        const estavaMinimizado = carregarEstadoMinimizado();
        const conteudo = document.getElementById('painel-conteudo');
        const minimizarBtn = document.getElementById('minimizarBtn');
        if (estavaMinimizado) { conteudo.style.display = 'none'; minimizarBtn.textContent = '+'; }

        // Arrastar
        const header = document.getElementById('painel-header');
        header.addEventListener('mousedown', e => {
            if (e.target === minimizarBtn) return;
            dragging = true;
            painelElemento.style.transform = 'none';
            const rect = painelElemento.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging || !painelElemento) return;
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            const maxX = window.innerWidth - painelElemento.offsetWidth;
            const maxY = window.innerHeight - painelElemento.offsetHeight;
            painelElemento.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            painelElemento.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            painelElemento.style.right = 'auto';
            painelElemento.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => {
            if (dragging && painelElemento) {
                dragging = false;
                const l = parseInt(painelElemento.style.left);
                const t = parseInt(painelElemento.style.top);
                if (!isNaN(l) && !isNaN(t)) salvarPosicaoPainel(l, t);
            }
        });

        let minimizado = estavaMinimizado;
        minimizarBtn.addEventListener('click', () => {
            minimizado = !minimizado;
            conteudo.style.display = minimizado ? 'none' : 'block';
            minimizarBtn.textContent = minimizado ? '+' : '−';
            salvarEstadoMinimizado(minimizado);
        });

        // Botões principais
        document.getElementById('agendarBtn').onclick = agendarAtaque;
        document.getElementById('limparBtn').onclick = limparTudo;
        document.getElementById('limparConcluidosBtn').onclick = limparConcluidos;
        document.getElementById('salvarDadosBtn').onclick = salvarDadosFormulario;
        document.getElementById('destravarBtn').onclick = destravarAtaques;
        document.getElementById('templatesBtn').onclick = showTemplatePopup;
        document.getElementById('importarBtn').onclick = importarBBCode;
        document.getElementById('resetPosicaoBtn').onclick = () => {
            painelElemento.style.left = '50%';
            painelElemento.style.top = '50%';
            painelElemento.style.transform = 'translate(-50%,-50%)';
            painelElemento.style.right = 'auto';
            painelElemento.style.bottom = 'auto';
            localStorage.removeItem(STORAGE_KEYS.PANEL_POSITION);
            Toast.success('✅ Posição resetada!');
        };

        document.getElementById('btnAgora').onclick = () => {
            preencherDataHoraAutomatica();
            Toast.success('✅ Horário do servidor inserido!');
        };
        document.getElementById('btnMais1Hora').onclick = () => {
            const [d, h] = adicionarMinutos(60).split(' ');
            document.getElementById('data').value = d;
            document.getElementById('hora').value = h;
            Toast.success('✅ +1 hora adicionada!');
        };
        document.getElementById('btnMais30Min').onclick = () => {
            const [d, h] = adicionarMinutos(30).split(' ');
            document.getElementById('data').value = d;
            document.getElementById('hora').value = h;
            Toast.success('✅ +30 minutos adicionados!');
        };

        // Atualizar select com as aldeias carregadas
        atualizarSelectAldeias();
        const countSpan = document.getElementById('villageCount');
        if (countSpan) countSpan.textContent = `(${_myVillages.length})`;
    }

    // ============================================
    // RENDERIZAR LISTA - COM BOTÕES NT4 e NT5
    // ============================================
    function renderizarLista() {
        const container = document.getElementById('listaAtaques');
        if (!container) return;
        const ataques = carregarAtaques();
        const agora = getServerTimestampSeconds();

        if (!ataques.length) {
            container.innerHTML = '<div class="miniatura">Nenhum ataque agendado</div>';
            return;
        }

        container.innerHTML = ataques.map((ataque, index) => {
            const tropasHtml = formatTroopsForDisplay(ataque);
            const [dataPart, horaPart] = ataque.datahora.split(' ');
            const [dia, mes, ano] = dataPart.split('/');
            const [hora, min, seg = '00'] = horaPart.split(':');
            const dataAgendada = new Date(ano, mes - 1, dia, hora, min, seg).getTime() / 1000;
            const isPast = !ataque.enviado && dataAgendada < agora;

            // Botão Repetir (só aparece se já foi enviado com sucesso)
            const repetirBtn = ataque.enviado && ataque.sucesso
                ? `<button class="btn-repetir" onclick="window.repetirAtaque(${index})">🔄 Repetir</button>`
                : '';

            // Botão Enviar Agora (aparece se está atrasado ou não enviado)
            const enviarAgoraBtn = (!ataque.enviado || isPast)
                ? `<button class="btn-enviar-agora" onclick="window.enviarImediato(${index})">▶ Enviar agora</button>`
                : '';

            // Botões NT4 e NT5 (aparecem para qualquer ataque que tenha tropas)
            const nt4Btn = `<button class="btn-nt btn-nt4" onclick="window.enviarNT4DoAtaque(${index})" title="Enviar 4 ataques idênticos simultaneamente">⚡NT4</button>`;
            const nt5Btn = `<button class="btn-nt btn-nt5" onclick="window.enviarNT5DoAtaque(${index})" title="Enviar 5 ataques idênticos simultaneamente">🔥NT5</button>`;

            return `
            <div class="ataque-item ${ataque.enviado ? 'sent' : ''} ${ataque.sucesso === false ? 'failed' : ''} ${isPast ? 'past' : ''}">
                <div><strong>${escapeHtml(ataque.origem)}</strong> → <strong>${escapeHtml(ataque.alvo)}</strong></div>
                <div>📅 ${escapeHtml(ataque.datahora)}</div>
                ${tropasHtml}
                <div class="botoes-ataque">
                    ${repetirBtn}
                    ${enviarAgoraBtn}
                    ${nt4Btn}
                    ${nt5Btn}
                    ${!ataque.enviado ? `<button onclick="window.removerAtaque(${index})" style="background:#990000;color:#fff;font-size:10px;padding:2px 8px;border-radius:3px;cursor:pointer;border:none;">🗑️ Remover</button>` : ''}
                </div>
                <div class="status">
                    ${ataque.enviado
                        ? (ataque.sucesso
                            ? '✅ Enviado com sucesso'
                            : `❌ Falhou: ${escapeHtml(ataque.erro || 'motivo desconhecido')}`)
                        : (isPast
                            ? '⏰ Atrasado — clique em "Enviar agora"'
                            : (ataque.travado ? '⏳ Enviando...' : '⏰ Agendado'))}
                </div>
            </div>`;
        }).join('');

        initSlimScroll(container);
    }

    window.removerAtaque = (index) => {
        ConfirmationBox.show('Remover este ataque?', () => {
            const ataques = carregarAtaques();
            ataques.splice(index, 1);
            salvarAtaques(ataques);
            Toast.success('✅ Ataque removido!');
        });
    };

    // ============================================
    // AGENDAR
    // ============================================
    function agendarAtaque() {
        const origem = document.getElementById('origem').value.trim();
        const alvo = document.getElementById('alvo').value.trim();
        const data = document.getElementById('data').value.trim();
        const hora = document.getElementById('hora').value.trim();

        if (!origem || !alvo || !data || !hora) { Toast.error('Preencha todos os campos!'); return; }

        const datahora = `${data} ${hora}`;

        if (!/^\d{1,4}\|\d{1,4}$/.test(origem) || !/^\d{1,4}\|\d{1,4}$/.test(alvo)) {
            Toast.error('Coordenadas inválidas! Use: 500|500'); return;
        }
        if (!/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(datahora)) {
            Toast.error('Data/hora inválida! Use: DD/MM/AAAA HH:MM:SS'); return;
        }

        const tropas = {};
        TROOP_IDS.forEach(t => {
            const inp = document.getElementById(t);
            tropas[t] = parseInt(inp?.value || 0);
        });

        const novoAtaque = {
            id: Date.now() + Math.random(), origem, alvo, datahora, ...tropas,
            enviado: false, travado: false, sucesso: null
        };

        const ataques = carregarAtaques();
        ataques.push(novoAtaque);
        salvarAtaques(ataques);
        Toast.success(`✅ Ataque agendado para ${datahora}`);
        EventSystem.trigger('attack_scheduled', novoAtaque);
    }

    function limparTudo() {
        ConfirmationBox.show('⚠️ Remover TODOS os ataques agendados?', () => {
            salvarAtaques([]);
            Toast.success('🗑️ Todos os ataques removidos!');
        });
    }

    function limparConcluidos() {
        const ataques = carregarAtaques();
        const naoConcluidos = ataques.filter(a => !a.enviado);
        salvarAtaques(naoConcluidos);
        Toast.success(`Removidos ${ataques.length - naoConcluidos.length} ataques concluídos`);
    }

    function destravarAtaques() {
        const ataques = carregarAtaques();
        let modificados = 0;
        for (const a of ataques) {
            if (a.travado && !a.enviado) {
                a.travado = false;
                modificados++;
            }
        }
        if (modificados > 0) {
            salvarAtaques(ataques);
            Toast.success(`✅ ${modificados} ataques destravados!`);
        } else {
            Toast.info('Nenhum ataque travado encontrado.');
        }
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    async function inicializar() {
        console.log('[TWS] Inicializando agendador...');

        LoadingIndicator.show();

        try {
            await fetchMyVillages();
            loadTemplates();
            criarInterface();
            carregarDadosFormulario();
            renderizarLista();

            setTimeout(() => {
                preencherDataHoraAutomatica();
            }, 500);

            iniciarScheduler();
            LoadingIndicator.hide();

            console.log('[TWS] Agendador inicializado com sucesso!');

            if (_myVillages.length > 0) {
                Toast.success(`✅ ${_myVillages.length} aldeias carregadas!`);
            } else {
                Toast.info('ℹ️ Nenhuma aldeia encontrada. Use o campo de texto para digitar coordenadas.');
            }
        } catch (err) {
            console.error('[TWS] Erro na inicialização:', err);
            LoadingIndicator.hide();
            Toast.error('❌ Erro ao inicializar. Recarregue a página.');

            criarInterface();
            iniciarScheduler();
        }
    }

    if (window.game_data) {
        inicializar();
    } else {
        const checkGameData = setInterval(() => {
            if (window.game_data) {
                clearInterval(checkGameData);
                inicializar();
            }
        }, 100);
    }

})();
