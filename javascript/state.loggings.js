window.state = window.state || {};
state = window.state;

state.logging = {

    name: 'state',

    // Set to true to enable debug logging
    DEBUG: false,

    log: function (message, data) {
        if (!this.DEBUG) return;
        if (data !== undefined) {
            console.log(`[${this.name}]: `, message, data);
        } else {
            console.log(`[${this.name}]: `, message);
        }
    },

    error: function (message, data) {
        // Errors are always shown
        if (data !== undefined) {
            console.error(`[${this.name}]: `, message, data);
        } else {
            console.error(`[${this.name}]: `, message);
        }
    },

    warn: function (message, data) {
        if (!this.DEBUG) return;
        if (data !== undefined) {
            console.warn(`[${this.name}]: `, message, data);
        } else {
            console.warn(`[${this.name}]: `, message);
        }
    },

    // Call this in browser console to enable debugging: state.logging.enable()
    enable: function() {
        this.DEBUG = true;
        console.log(`[${this.name}]: Debug logging enabled`);
    },

    // Call this in browser console to disable debugging: state.logging.disable()
    disable: function() {
        this.DEBUG = false;
        console.log(`[${this.name}]: Debug logging disabled`);
    }
};
