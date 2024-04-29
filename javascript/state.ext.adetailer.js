window.state = window.state || {};
window.state.extensions = window.state.extensions || {};
state = window.state;

state.extensions['adetailer'] = (function () {

    let container = null;
    let store = null;
    let cnTabs = [];

    function bindTabEvents() {
        const tabs = container.querySelectorAll('.tabs > div > button');
        tabs.forEach(tab => { // dirty hack here
            tab.removeEventListener('click', onTabClick);
            tab.addEventListener('click', onTabClick);
        });
        return tabs;
    }

    function handleTabs() {
        let tabs = bindTabEvents();
        let value = store.get('tab');
        if (value) {
            for (var i = 0; i < tabs.length; i++) {
                if (tabs[i].textContent === value) {
                    state.utils.triggerEvent(tabs[i], 'click');
                    break;
                }
            }
        }
    }

    function onTabClick() {
        store.set('tab', this.textContent);
        bindTabEvents();
    }

    function handleCheckbox(checkbox, id) {
        let value = store.get(id);
        if (value) {
            state.utils.setValue(checkbox, value, 'change');
        }
        checkbox.addEventListener('change', function () {
            store.set(id, this.checked);
        });
    }

    function handleCheckboxes(container, container_idx) {
        let checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function checkbox(checkbox, idx) {
            handleCheckbox(checkbox, `ad-tab-${container_idx}-checkbox-${idx}`)
        });
    }

    function handleSliders(container, container_idx) {
        let sliders = container.querySelectorAll('input[type="range"]');
        sliders.forEach(function (slider, idx) {
            let id = `ad-tab-${container_idx}-slider-${idx}`;
            let value = store.get(id);
            if (value) {
            state.utils.setValue(slider, value, 'change');
            }
            slider.addEventListener('change', function () {
            store.set(id, this.value);
            });
        });
    }

    function handleTextboxes(container, container_idx) {
        let textboxes = container.querySelectorAll('textarea');
        textboxes.forEach(function (textbox, idx) {
            let id = `ad-tab-${container_idx}-textbox-${idx}`;
            let value = store.get(id);
            if (value) {
                state.utils.setValue(textbox, value, 'change');
            }
            textbox.addEventListener('change', function () {
                store.set(id, this.value);
            });
        });
    }

    function handleSelects(container, container_idx) {
        let selects = container.querySelectorAll('.gradio-dropdown')
        selects.forEach(function (select, idx) {
            state.utils.handleSelect(select, `ad-tab-${container_idx}-select-${idx}`, store);
        });
    }

    function handleRadioButtons(container, container_idx) {
        let fieldsets = container.querySelectorAll('fieldset');
        fieldsets.forEach(function (fieldset, idx) {
            let radios = fieldset.querySelectorAll('input[type="radio"]');
            let id = `ad-tab-${container_idx}-fieldset-${idx}`;
            let value = store.get(id);
            if (value) {
                radios.forEach(function (radio) {
                    state.utils.setValue(radio, value, 'change');
                });
            }
            radios.forEach(function (radio) {
                radio.addEventListener('change', function () {
                    store.set(id, this.value);
                });
            });
        });
    }

    function handleDropdown(dropdown, id) {
        let value = store.get(id);

        if (value && value === 'true') {
            state.utils.triggerEvent(dropdown, 'click');
        }
        dropdown.addEventListener('click', function () {
            let span = this.querySelector('.transition, .icon');
            store.set(id, span.style.transform !== 'rotate(90deg)');
        });
    }

    function handleDropdowns(container, container_idx) {
        let dropdowns = container.querySelectorAll('.gradio-accordion .label-wrap');
        dropdowns.forEach(function (dropdown, idx) {
            handleDropdown(dropdown, `ad-tab-${container_idx}-dropdown-${idx}`);
        });
    }

    function load() {
        setTimeout(function () {
            handleDropdown(container.querySelector('#script_txt2img_adetailer_ad_main_accordion > .label-wrap'), 'ad-dropdown-main');
            handleCheckbox(container.querySelector('#script_txt2img_adetailer_ad_enable > label > input'), 'ad-checkbox-enable');
            cnTabs.forEach(({ container, container_idx }) => {
                handleTabs(container, container_idx);
                handleTextboxes(container, container_idx);
                handleCheckboxes(container, container_idx);
                handleSliders(container, container_idx);
                handleRadioButtons(container, container_idx);
                handleSelects(container, container_idx);
                handleDropdowns(container, container_idx);
            });
        }, 500);
    }

    function init() {

        container = gradioApp().getElementById('script_txt2img_adetailer_ad_main_accordion');
        store = new state.Store('ext-adetailerr');

        if (! container) {
            return;
        }

        let tabs = container.querySelectorAll('.tabitem');

        if (tabs.length) {
            cnTabs = [];
            tabs.forEach((tabContainer, i) => {
                cnTabs.push({
                    container: tabContainer,
                    container_idx: i
                });
            });
        } else {
            cnTabs = [{
                container: container
            }];
        }

        load();
    }

    return { init };
}());
