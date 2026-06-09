document.addEventListener('DOMContentLoaded', () => {
    const showArrow = document.getElementById('showArrow');
    const showIcons = document.getElementById('showIcons');
    const showEval = document.getElementById('showEval');
    const engineLevel = document.getElementById('engineLevel');
    const levelValue = document.getElementById('levelValue');

    // Load saved settings
    chrome.storage.sync.get({
        showArrow: true,
        showIcons: true,
        showEval: true,
        engineLevel: 20
    }, (items) => {
        showArrow.checked = items.showArrow;
        showIcons.checked = items.showIcons;
        showEval.checked = items.showEval;
        engineLevel.value = items.engineLevel;
        levelValue.textContent = items.engineLevel;
    });

    // Save settings on change
    function saveSettings() {
        chrome.storage.sync.set({
            showArrow: showArrow.checked,
            showIcons: showIcons.checked,
            showEval: showEval.checked,
            engineLevel: parseInt(engineLevel.value, 10)
        });
    }

    showArrow.addEventListener('change', saveSettings);
    showIcons.addEventListener('change', saveSettings);
    showEval.addEventListener('change', saveSettings);
    
    engineLevel.addEventListener('input', () => {
        levelValue.textContent = engineLevel.value;
    });
    engineLevel.addEventListener('change', saveSettings);
});
