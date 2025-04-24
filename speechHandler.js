const say = require('say');
const vscode = require('vscode');

let currentSpeed = 1.0;
let announceTimeout = null;

function speakMessage(message) {
    return new Promise((resolve) => {
        const config = vscode.workspace.getConfiguration('echocode');
        let voice = config.get('voice');
        const rate = config.get('rate') || 1.0;

        // Fallback to Zira if not set and on Windows
        if (!voice && process.platform === 'win32') {
            voice = 'Microsoft Zira Desktop';
        }

        say.speak(message, voice, rate, (err) => {
            if (err) {
                console.error('Speech Error:', err);
            }
            resolve();
        });
    });
}

function stopSpeaking() {
    say.stop();
}

function queueSpeedAnnouncement() {
    if (announceTimeout) {
        clearTimeout(announceTimeout);
    }

    announceTimeout = setTimeout(() => {
        say.stop();
        const announcement = `Speed ${currentSpeed.toFixed(1)}x`;

        // 🔁 Reuse the same voice-setting logic from speakMessage()
        speakMessage(announcement);
    }, 900);
}

function increaseSpeechSpeed() {
    currentSpeed = Math.min(currentSpeed + 0.1, 3.0);
    console.log(`Speech speed increased to: ${currentSpeed.toFixed(1)}x`);
    queueSpeedAnnouncement();
}

function decreaseSpeechSpeed() {
    currentSpeed = Math.max(currentSpeed - 0.1, 0.5);
    console.log(`Speech speed decreased to: ${currentSpeed.toFixed(1)}x`);
    queueSpeedAnnouncement();
}

function getSpeechSpeed() {
    return currentSpeed;
}

module.exports = {
    speakMessage,
    stopSpeaking,
    increaseSpeechSpeed,
    decreaseSpeechSpeed,
    getSpeechSpeed
};