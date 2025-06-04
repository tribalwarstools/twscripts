const total = document.querySelectorAll(".rename-icon").length;
let counter = parseInt(start);
let i = 0;

function processNextRename() {
    const icon = document.querySelector(".rename-icon");
    if (!icon || i >= total) {
        localStorage.setItem(COUNTER_KEY, counter);
        localStorage.removeItem(PENDING_KEY);
        UI.SuccessMessage("Renomeação concluída.");
        return;
    }

    icon.click();

    setTimeout(() => {
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
        setTimeout(processNextRename, 300);
    }, 150);
}

processNextRename();
