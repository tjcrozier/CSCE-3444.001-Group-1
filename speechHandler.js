const say = require("say");
const vscode = require("vscode");

let currentSpeed = 1.0;
let announceTimeout = null;
let isSpeaking = false;
let currentSpeechPromise = null;

async function speakMessage(message, options = {}) {
  // Stop any ongoing speech first
  stopSpeaking();

  isSpeaking = true;

  try {
    // Create a new promise for this speech instance
    currentSpeechPromise = new Promise((resolve, reject) => {
      const config = vscode.workspace.getConfiguration("echocode");
      let voice = config.get("voice");
      const rate = config.get("rate") || 1.0;

      // Fallback to Zira if not set and on Windows
      if (!voice && process.platform === "win32") {
        voice = "Microsoft Zira Desktop";
      }

      say.speak(message, voice, rate, (err) => {
        if (err) {
          console.error("Speech Error:", err);
          reject(err);
        } else {
          isSpeaking = false;
          resolve();
        }
      });
    });

    return await currentSpeechPromise;
  } catch (error) {
    isSpeaking = false;
    console.error("Speech error:", error);
    throw error;
  }
}

function stopSpeaking() {
  if (!isSpeaking) {
    return false;
  }

  try {
    // Immediately stop any ongoing speech
    say.stop();

    // Reset the speaking state
    isSpeaking = false;
    currentSpeechPromise = null;

    return true;
  } catch (err) {
    console.error("Error stopping speech:", err);
    return false;
  }
}

function queueSpeedAnnouncement() {
  if (announceTimeout) {
    clearTimeout(announceTimeout);
  }

  announceTimeout = setTimeout(() => {
    stopSpeaking();
    speakMessage(`Speed ${currentSpeed.toFixed(1)}x`);
  }, 900); // Waits 600ms after last change before speaking
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
  getSpeechSpeed,
};
