const say = require("say");
const vscode = require("vscode");

let currentSpeed = 1.0;
let announceTimeout = null;
let isSpeaking = false;
let currentSpeechPromise = null;

async function speakMessage(message) {
  isSpeaking = true;

  try {
    currentSpeechPromise = new Promise((resolve, reject) => {
      const config = vscode.workspace.getConfiguration("echocode");
      let voice = config.get("voice");

      // Fallback to Zira if not set and on Windows
      if (!voice && process.platform === "win32") {
        voice = "Microsoft Zira Desktop";
      }

      say.speak(message, voice, currentSpeed, (err) => {  // <-- ⭐ use currentSpeed directly
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
  saveSpeechSpeed(); // <-- Save when changed
}

function decreaseSpeechSpeed() {
  currentSpeed = Math.max(currentSpeed - 0.1, 0.5);
  console.log(`Speech speed decreased to: ${currentSpeed.toFixed(1)}x`);
  queueSpeedAnnouncement();
  saveSpeechSpeed(); // <-- Save when changed
}

function getSpeechSpeed() {
  return currentSpeed;
}

function saveSpeechSpeed() {
  const config = vscode.workspace.getConfiguration("echocode");
  config.update("rate", currentSpeed, vscode.ConfigurationTarget.Global)
    .then(() => {
      console.log(`Saved speech speed: ${currentSpeed.toFixed(1)}x`);
    }, (err) => {
      console.error('Failed to save speech speed:', err);
    });
}

function loadSavedSpeechSpeed() {
  const config = vscode.workspace.getConfiguration("echocode");
  const savedSpeed = config.get("rate");

  if (savedSpeed && typeof savedSpeed === "number") {
    currentSpeed = Math.max(0.5, Math.min(savedSpeed, 3.0)); // Clamp between 0.5 and 3.0
    console.log(`Loaded saved speech speed: ${currentSpeed.toFixed(1)}x`);
  } else {
    console.log("No saved speech speed found. Using default 1.0x");
  }
}

module.exports = {
  speakMessage,
  stopSpeaking,
  increaseSpeechSpeed,
  decreaseSpeechSpeed,
  getSpeechSpeed,
  loadSavedSpeechSpeed,
};
