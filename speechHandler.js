const vscode = require('vscode');

let isSpeaking = false;

async function speakMessage(message) {
    try {
        // Stop any active speech first
        if (isSpeaking) {
            stopSpeech();
        }

        // Mock implementation - log to console and show in VS Code
        console.log('Mock: Speaking message:', message);
        vscode.window.showInformationMessage(`Speaking: ${message}`);
        isSpeaking = true;
    } catch (error) {
        console.error('Error in speakMessage:', error);
        vscode.window.showErrorMessage(`Failed to speak message: ${error.message}`);
    }
}

function stopSpeech() {
    // Mock implementation - stop speaking
    console.log('Mock: Stopping speech');
    isSpeaking = false;
    return true;
}

module.exports = {
    speakMessage,
    stopSpeech
}; 