const vscode = require('vscode');

async function speakMessage(message) {
    // Mock implementation - does nothing
    console.log('Mock: Speaking message:', message);
}

function stopSpeech() {
    // Mock implementation - does nothing
    console.log('Mock: Stopping speech');
    return true;
}

module.exports = {
    speakMessage,
    stopSpeech
}; 