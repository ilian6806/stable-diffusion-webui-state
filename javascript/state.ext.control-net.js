window.state = window.state || {};
window.state.extensions = window.state.extensions || {};
state = window.state;


function ControlNetTabContext(tabName, container) {

    this.tabName = tabName;
    this.container = container;
    this.store = new state.Store(`ext-control-net-${this.tabName}`);
    this.tabElements = [];
    this.cnTabs = [];

    let tabs = this.container.querySelectorAll(':scope > div > div > .tabs > .tabitem');

    if (tabs.length) {
        tabs.forEach((tabContainer, i) => {
            this.cnTabs.push({
                container: tabContainer,
                store: new state.Store(`ext-control-net-${this.tabName}-${i}`)
            });
        });
    } else {
        this.cnTabs.push[{
            container: container,
            store: new state.Store(`ext-control-net-${this.tabName}-${i}`)
        }];
    }
}

state.extensions['control-net'] = (function () {

    let contexts = [];

    function handleToggle() {

        const id = 'toggled';

        contexts.forEach(context => {

            const elements = context.container.querySelectorAll(`:scope > .label-wrap`)

            elements.forEach(element => {
                if (context.store.get(id) === 'true') {
                    state.utils.clickToggleMenu(element);
                    load();
                }
                element.addEventListener('click', function () {
                    let classList = Array.from(this.classList);
                    context.store.set(id, classList.indexOf('open') > -1);
                    load();
                });
            });
        });
    }

    function bindTabEvents() {
        contexts.forEach(context => {
            const tabs = context.container.querySelectorAll(':scope > div > div > .tabs > div > button');
            function onTabClick() {
                context.store.set('tab', this.textContent);
                bindTabEvents();
            }
            tabs.forEach(tab => { // dirty hack here
                tab.removeEventListener('click', onTabClick);
                tab.addEventListener('click', onTabClick);
            });
            context.tabElements = tabs;
        });
    }

    function handleTabs() {
        bindTabEvents();
        contexts.forEach(context => {
            let value = context.store.get('tab');
            if (value) {
                for (var i = 0; i < context.tabElements.length; i++) {
                    if (context.tabElements[i].textContent === value) {
                        state.utils.triggerEvent(context.tabElements[i], 'click');
                        break;
                    }
                }
            }
        });
    }

    function handleContext(action) {
        contexts.forEach(context => {
            context.cnTabs.forEach(({ container, store }) => {
                action(container, store);
            });
        });
    }

    function handleCheckboxes() {
        handleContext((container, store) => {
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
        handleContext((container, store) => {
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
        handleContext((container, store) => {
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
        handleContext((container, store) => {
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

        let elements = gradioApp().querySelectorAll('#controlnet');

        if (! elements.length) {
            return;
        }

        contexts[0] = new ControlNetTabContext('txt2img', elements[0]);
        contexts[1] = new ControlNetTabContext('img2img', elements[1]);

        handleToggle();
        load();
    }

    return { init };
}());
