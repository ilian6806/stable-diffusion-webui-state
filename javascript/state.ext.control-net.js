window.state = window.state || {};
window.state.extensions = window.state.extensions || {};
state = window.state;

state.extensions['control-net'] = (function () {

    let container = null;
    let store = null;
    let cnTabs = [];

    function handleToggle() {

        const id = 'toggled';

        elements = gradioApp().querySelectorAll(`#controlnet>.label-wrap`);

        elements.forEach(function (element) {
            if (store.get(id) === 'true') {
                state.utils.clickToggleMenu(element);
                load();
            }
            element.addEventListener('click', function () {
                let classList = Array.from(this.classList);
                store.set(id, classList.indexOf('open') > -1);
                load();
            });
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
            container.querySelectorAll('.gradio-dropdown').forEach(select => {
                let id = state.utils.txtToId(select.querySelector('label').firstChild.textContent);
                let value = store.get(id);
                state.utils.handleSelect(select, id, store);
                if (id === 'preprocessor' && value && value.toLowerCase() !== 'none') {
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
        setTimeout(function () {
            handleTabs();
            handleCheckboxes();
            handleSelects();
            handleSliders();
            handleRadioButtons();
        }, 500);
    }

    function init() {

        container = gradioApp().getElementById('controlnet');
        store = new state.Store('ext-control-net');

        if (! container) {
            return;
        }

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

        handleToggle();
        load();
    }

    return { init };
}());
