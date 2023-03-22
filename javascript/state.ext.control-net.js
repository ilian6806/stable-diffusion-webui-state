window.state = window.state || {};
window.state.extensions = window.state.extensions || {};

state.extensions['control-net'] = (function () {

    let container = null;
    let store = null;
    let cnTabs = [];

    function handleToggle() {
        let value = store.get('toggled');
        let toggleBtn = container.querySelector('div.cursor-pointer');
        if (value && value === 'true') {
            state.utils.triggerEvent(toggleBtn, 'click');
        }
        toggleBtn.addEventListener('click', function () {
            let span = this.querySelector('.transition');
            store.set('toggled', !span.classList.contains('rotate-90'));
        });
    }

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

    function handleCheckboxes() {
        cnTabs.forEach(({ container, store }) => {
            let checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(function (checkbox) {
                let label = checkbox.nextElementSibling;
                let id = state.utils.txtToId(label.textContent);
                let value = store.get(id);
                if (value) {
                    state.utils.setValue(checkbox, value, 'change');
                }
                checkbox.addEventListener('change', function () {
                    store.set(id, this.checked);
                });
            });
        });
    }

    function handleSelects() {
        cnTabs.forEach(({ container, store }) => {
            let selects = container.querySelectorAll('select');
            selects.forEach(function (select) {
                let label = select.previousElementSibling;
                let id = state.utils.txtToId(label.textContent);
                let value = store.get(id);
                if (value) {
                    state.utils.setValue(select, value, 'change');
                }
                select.addEventListener('change', function () {
                    store.set(id, this.value);
                });
                if (id === 'preprocessor' && value && value !== 'none') {
                    state.utils.onNextUiUpdates(handleSliders); // update new sliders if needed
                }
            });
        });
    }

    function handleSliders() {
        cnTabs.forEach(({ container, store }) => {
            let sliders = container.querySelectorAll('input[type="range"]');
            sliders.forEach(function (slider) {
                let label = slider.previousElementSibling.querySelector('label span');
                let id = state.utils.txtToId(label.textContent);
                let value = store.get(id);
                if (value) {
                    state.utils.setValue(slider, value, 'change');
                }
                slider.addEventListener('change', function () {
                    store.set(id, this.value);
                });
            });
        });
    }

    function handleRadioButtons() {
        cnTabs.forEach(({ container, store }) => {
            let fieldsets = container.querySelectorAll('fieldset');
            fieldsets.forEach(function (fieldset) {
                let label = fieldset.firstChild.nextElementSibling;
                let radios = fieldset.querySelectorAll('input[type="radio"]');
                let id = state.utils.txtToId(label.textContent);
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
        });
    }

    function load() {
        handleToggle();
        handleTabs();
        handleCheckboxes();
        handleSelects();
        handleSliders();
        handleRadioButtons();
    }

    function init() {

        container = gradioApp().getElementById('controlnet');
        store = new state.Store('ext-control-net');

        let tabs = container.querySelectorAll('.tabitem');

        if (tabs.length) {
            cnTabs = [];
            tabs.forEach((tabContainer, i) => {
                cnTabs.push({
                    container: tabContainer,
                    store: new state.Store('ext-control-net-' + i)
                });
            });
        } else {
            cnTabs = [{
                container: container,
                store: new state.Store('ext-control-net-0')
            }];
        }

        load();
    }

    return { init };
}());
