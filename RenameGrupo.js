if (window.location.href.includes("screen=overview_villages") && localStorage.getItem(PENDING_KEY)) {
    const { groupId, nameBase, start } = JSON.parse(localStorage.getItem(PENDING_KEY));
    let counter = parseInt(start);
    let i = 0;
    const total = document.querySelectorAll(".rename-icon").length;

    Dialog.close();

    async function processRename(icon) {
        icon.click();

        // Aguarda o campo de texto aparecer
        await new Promise(resolve => {
            const check = setInterval(() => {
                const input = document.querySelector('.vis input[type="text"]');
                if (input) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });

        const input = document.querySelector('.vis input[type="text"]');
        if (input) {
            input.value = `${String(counter).padStart(2, "0")} ${nameBase}`;
            counter++;
            i++;

            const okBtn = Array.from(document.querySelectorAll('input[type="button"]'))
                .find(btn => btn.value.toLowerCase().includes("ok") || btn.value.toLowerCase().includes("salvar"));

            if (okBtn) okBtn.click();

            UI.SuccessMessage(`Renomeado ${i}/${total}`);
        }

        // Aguarda o campo de edição desaparecer
        await new Promise(resolve => {
            const check = setInterval(() => {
                const open = document.querySelector('.vis input[type="text"]');
                if (!open) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    async function run() {
        const icons = Array.from(document.querySelectorAll(".rename-icon"));
        for (let icon of icons) {
            await processRename(icon);
        }

        localStorage.setItem(COUNTER_KEY, counter);
        localStorage.removeItem(PENDING_KEY);
        UI.SuccessMessage("Renomeação concluída.");
    }

    run();
    return;
}
