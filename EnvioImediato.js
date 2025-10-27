(function () {
    'use strict';

    // só roda dentro do jogo
    if (!window.TribalWars || !window.game_data) return;

    // checar tela de envio com confirmação
    if (game_data.screen === 'place' && location.search.includes('try=confirm')) {
        const maxAttempts = 10;    // número máximo de tentativas
        let attempts = 0;

        function tryConfirm() {
            // procurar pelo botão de confirmação mais comum
            const btn =
                document.getElementById('troop_confirm_submit') ||
                document.querySelector('button[type="submit"]') ||
                document.querySelector('input[type="submit"]') ||
                document.querySelector('button[name="confirm"]');

            if (btn) {
                try {
                    btn.click();
                    console.log('⚡ Envio imediato automático executado (modo sempre ativo).');
                } catch (e) {
                    try {
                        // fallback: submeter o form pai
                        const form = btn.closest('form');
                        if (form) form.submit();
                        console.log('⚡ Form submetido como fallback.');
                    } catch (err) {
                        console.warn('Erro ao tentar confirmar envio:', err);
                    }
                }
                return true;
            }
            return false;
        }

        // tentar imediatamente
        if (!tryConfirm()) {
            // se não encontrou, tenta por alguns ciclos (caso o botão seja adicionado depois)
            const timer = setInterval(() => {
                attempts++;
                if (tryConfirm() || attempts >= maxAttempts) {
                    clearInterval(timer);
                    if (attempts >= maxAttempts) {
                        console.warn('Não foi possível encontrar o botão de confirmação após várias tentativas.');
                    }
                }
            }, 300); // tenta a cada 300ms por ~3 segundos
        }
    }
})();
