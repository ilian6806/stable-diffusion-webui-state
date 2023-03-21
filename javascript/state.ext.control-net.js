window.state = window.state || {};
window.state.extensions = window.state.extensions || {};

state.extensions['control-net'] = (function () {

    let container = null;
    let store = null;

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

    function init() {
        container = gradioApp().getElementById('controlnet');
        store = new state.Store('ext-control-net');
        handleTabs();
    }

    return { init }
}());
