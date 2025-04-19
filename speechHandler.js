const say = require('say');

function speakMessage(message) {
    return new Promise((resolve) => {
        say.speak(message, undefined, 0.8, (err) => {
            if (err) {
                console.error('Speech Error:', err);
            }
            resolve();
        });
    });
}

module.exports = { speakMessage };