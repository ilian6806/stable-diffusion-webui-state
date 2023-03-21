window.state = window.state || {};

state.utils = {
    triggerEvent: function triggerEvent(element, event) {
        if (! element) {
            return;
        }
        element.dispatchEvent(new Event(event.trim()));
        return element;
    }
};
