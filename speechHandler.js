const vscode = require('vscode');
const say = require('say');

// Track if speech is currently active
let isSpeaking = false;

/**
 * Speak a message aloud
 * @param {string} message - The message to be spoken
 * @param {number} [speed=0.8] - The speed of speech (optional)
 * @returns {Promise<void>}
 */
function speakMessage(message, speed = 0.8) {
  return new Promise((resolve, reject) => {
    isSpeaking = true;
    say.speak(message, undefined, speed, (err) => {
      isSpeaking = false;
      if (err) {
        console.error('Speech Error:', err);
        return reject(err);
      }
      resolve();
    });
  });
}

/**
 * Stop any active speech
 * @returns {boolean} True if speech was stopped, false otherwise
 */
function stopSpeech() {
  if (isSpeaking) {
    say.stop();
    isSpeaking = false;
    return true;
  }
  return false;
}

/**
 * Check if speech is currently active
 * @returns {boolean}
 */
function isActiveSpeech() {
  return isSpeaking;
}

module.exports = {
  speakMessage,
  stopSpeech,
  isActiveSpeech
};
