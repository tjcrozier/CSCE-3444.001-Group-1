const say = require('say');

let isSpeaking = false;

function stopSpeech() {
    if (isSpeaking) {
        say.stop();
        isSpeaking = false;
        return true;
    }
    return false;
}

function speakMessage(message) {
    return new Promise((resolve) => {
        // Stop any ongoing speech before starting new one
        stopSpeech();
        
        isSpeaking = true;
        say.speak(message, undefined, 0.8, (err) => {
            if (err) {
                console.error('Speech Error:', err);
            }
            isSpeaking = false;
            resolve();
        });
    });
}

module.exports = {
    speakMessage,
    stopSpeech
};
