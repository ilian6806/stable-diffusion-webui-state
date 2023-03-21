window.state = window.state || {};

state.core = (function () {

    const TABS = ['txt2img', 'img2img'];
    const ELEMENTS = {
        'prompt': 'prompt',
        'negative_prompt': 'neg_prompt',
        'sampling': 'sampling',
        'sampling_steps': 'steps',
        'restore_faces': 'restore_faces',
        'tiling': 'tiling',
        'hires_fix': 'enable_hr',
        'hires_upscaler': 'hr_upscaler',
        'hires_steps': 'hires_steps',
        'hires_scale': 'hr_scale',
        'hires_resize_x': 'hr_resize_x',
        'hires_resize_y': 'hr_resize_y',
        'hires_denoising_strength': 'denoising_strength',
        'width': 'width',
        'height': 'height',
        'batch_count': 'batch_count',
        'batch_size': 'batch_size',
        'cfg_scale': 'cfg_scale',
        'denoising_strength': 'denoising_strength',
        'seed': 'seed'
    };

    const ELEMENTS_WITHOUT_PREFIX = {
        'resize_mode': 'resize_mode',
    };

    let store = null;

    function hasSetting(id, tab) {
        const suffix = tab ? `_${tab}` : '';
        return this[`state${suffix}`] && this[`state${suffix}`].indexOf(id) > -1;
    }

    function init() {
        fetch('/state/config.json?_=' + (+new Date()))
            .then(response => response.json())
            .then(config => {
                try {
                    config.hasSetting = hasSetting
                    load(config);
                } catch (error) {
                    console.error('[state]: Error:', error);
                }
            })
            .catch(error => console.error('[state]: Error getting JSON file:', error));
    }

    function load(config) {

        store = new state.Store();

        loadUI();
        restoreTabs(config);

        for (const [settingId, element] of Object.entries(ELEMENTS)) {
            TABS.forEach(tab => {
                if (config.hasSetting(settingId, tab)) {
                    handleSavedInput(`${tab}_${element}`);
                }
            });
        }

        for (const [settingId, element] of Object.entries(ELEMENTS_WITHOUT_PREFIX)) {
            TABS.forEach(tab => {
                if (config.hasSetting(settingId, tab)) {
                    handleSavedInput(`${element}`);
                }
            });
        }

        handleExtensions(config);
    }

    function storeTab() {
        store.set('tab', this.textContent);
        bindTabEvents();
    }

    function bindTabEvents() {
        const tabs = gradioApp().querySelectorAll('#tabs > div:first-child button');
        tabs.forEach(tab => { // dirty hack here
            tab.removeEventListener('click', storeTab);
            tab.addEventListener('click', storeTab);
        });
        return tabs;
    }

    function loadUI() {

        let toolbar = document.createElement("div");
        toolbar.style.minWidth = 0;
        toolbar.className = "gr-box relative w-full border-solid border border-gray-200 gr-padded";

        let resetBtn = document.createElement("button");
        resetBtn.innerHTML = "🔁";
        resetBtn.className = "gr-button gr-button-lg gr-button-tool";
        resetBtn.style.border = "none";
        resetBtn.title = "Reset State";
        resetBtn.addEventListener('click', function () {
            let confirmed = confirm('Reset all state values?');
            if (confirmed) {
                store.clearAll();
                alert('All state values deleted!');
            }
        });

        toolbar.appendChild(resetBtn);

        let quickSettings = gradioApp().getElementById("quicksettings");
        quickSettings.appendChild(toolbar);
    }


    function restoreTabs(config) {

        if (! config.hasSetting('tabs')) {
            return;
        }

        const tabs = bindTabEvents();
        const value = store.get('tab');

        if (value) {
            for (var i = 0; i < tabs.length; i++) {
                if (tabs[i].textContent === value) {
                    state.utils.triggerEvent(tabs[i], 'click');
                    break;
                }
            }
        }
    }

    function handleSavedInput(id) {

        const elements = gradioApp().querySelectorAll(`#${id} textarea, #${id} select, #${id} input`);
        const events = ['change', 'input'];

        if (! elements || ! elements.length) {
            return;
        }

        let forEach = function (action) {
            events.forEach(function(event) {
                elements.forEach(function (element) {
                    action.call(element, event);
                });
            });
        };

        forEach(function (event) {
            this.addEventListener(event, function () {
                let value = this.value;
                if (this.type && this.type === 'checkbox') {
                    value = this.checked;
                }
                store.set(id, value);
            });
        });

        TABS.forEach(tab => {
            const seedInput = gradioApp().querySelector(`#${tab}_seed input`);
            ['random_seed', 'reuse_seed'].forEach(id => {
                const btn = gradioApp().querySelector(`#${tab}_${id}`);
                btn.addEventListener('click', () => {
                    setTimeout(() => {
                        state.utils.triggerEvent(seedInput, 'change');
                    }, 100);
                });
            });
        });

        let value = store.get(id);

        if (! value) {
            return;
        }

        forEach(function (event) {
            switch (this.type) {
                case 'checkbox':
                    this.checked = value === 'true';
                    state.utils.triggerEvent(this, event);
                    break;
                case 'radio':
                    if (this.value === value) {
                        this.checked = true;
                        state.utils.triggerEvent(this, event);
                    } else {
                        this.checked = false;
                    }
                    break;
                default:
                    this.value = value;
                    state.utils.triggerEvent(this, event);
            }
        });
    }

    function handleExtensions(config) {
        if (config['state_extensions']) {
            config['state_extensions'].forEach(function (ext) {
                if (ext in state.extensions) {
                    state.extensions[ext].init();
                }
            });
        }
    }

    return { init };
}());
