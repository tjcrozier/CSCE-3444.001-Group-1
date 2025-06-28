const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { transcribe } = require('./voiceCommand');

// Core imports (existing features)
const {
  ensurePylintInstalled,
  runPylint,
} = require("./program_settings/program_settings/pylintHandler");

const {
  speakMessage,
  stopSpeaking,
  loadSavedSpeechSpeed,
  registerSpeechCommands,
  increaseSpeechSpeed,
  decreaseSpeechSpeed,
} = require("./program_settings/speech_settings/speechHandler");

const {
  initializeErrorHandling,
  registerErrorHandlingCommands
} = require("./program_features/ErrorHandling/errorHandler");

const {
  registerSummarizerCommands,
} = require("./program_features/Summarizer/summaryGenerator.js");

const {
  registerHotkeyGuideCommand,
} = require("./program_settings/guide_settings/hotkeyGuide");

const {
  registerBigOCommand,
} = require("./program_features/Annotations_BigO/bigOAnalysis");

const {
  registerAnnotationCommands,
} = require("./program_features/Annotations_BigO/annotations");

const {
  loadAssignmentFile,
  readNextTask,
  rescanUserCode,
  readNextSequentialTask,
  registerAssignmentTrackerCommands,
} = require("./program_features/Assignment_Tracker/assignmentTracker");

const {
  registerChatCommands,
} = require("./program_features/ChatBot/chat_tutor");

const { registerMoveCursor } = require("./navigation_features/navigationHandler");
const { registerWhereAmICommand } = require("./navigation_features/whereAmI");

function getRecorderWebview() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Voice Recorder</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        button { font-size: 1.2em; margin-right: 10px; }
      </style>
    </head>
    <body>
      <h2>🎙️ EchoCode Voice Recorder</h2>
      <button id="startBtn">Start Recording</button>
      <button id="stopBtn" disabled>Stop Recording</button>
      <p id="status"></p>

      <script>
        const vscode = acquireVsCodeApi();

        let mediaRecorder;
        let audioChunks = [];

        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const status = document.getElementById('status');

        startBtn.addEventListener('click', async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
              }
            };

            mediaRecorder.onstop = async () => {
              const blob = new Blob(audioChunks, { type: 'audio/wav' });
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                vscode.postMessage({ type: 'audio', base64: base64data });
                status.textContent = '✅ Audio sent to extension';
              };
              reader.readAsDataURL(blob);
            };

            mediaRecorder.start();
            startBtn.disabled = true;
            stopBtn.disabled = false;
            status.textContent = '🎙️ Recording...';
          } catch (err) {
            status.textContent = '❌ Error accessing mic: ' + err.message;
          }
        });

        stopBtn.addEventListener('click', () => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            startBtn.disabled = false;
            stopBtn.disabled = true;
            status.textContent = '🛑 Stopped. Processing audio...';
          }
        });
      </script>
    </body>
    </html>
  `;
}

let outputChannel;

async function activate(context) {
  outputChannel = vscode.window.createOutputChannel("EchoCode");
  outputChannel.appendLine("EchoCode activated.");

  loadSavedSpeechSpeed();
  await ensurePylintInstalled();
  initializeErrorHandling(outputChannel);

  registerErrorHandlingCommands(context);
  registerAssignmentTrackerCommands(context);
  registerHotkeyGuideCommand(context);
  registerChatCommands(context, outputChannel);
  registerBigOCommand(context);
  registerAnnotationCommands(context, outputChannel);
  registerSummarizerCommands(context, outputChannel);
  registerSpeechCommands(context, outputChannel);
  registerWhereAmICommand(context);
  registerMoveCursor(context);

  // 🔊 Register new voice webview command
  context.subscriptions.push(
    vscode.commands.registerCommand('echocode.voiceWebview', () => {
      const panel = vscode.window.createWebviewPanel(
        'voiceRecorder',
        'EchoCode Voice Recorder',
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getRecorderWebview();

      panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type === 'audio') {
          try {
            const buffer = Buffer.from(msg.base64, 'base64');
            const filePath = path.join(__dirname, 'recorded.wav');
            fs.writeFileSync(filePath, buffer);

            const transcript = await transcribe(filePath);
            vscode.window.showInformationMessage(`Transcript: ${transcript}`);
          } catch (err) {
            vscode.window.showErrorMessage(`Voice command failed: ${err.message}`);
          }
        }
      });
    })
  );

  outputChannel.appendLine("All EchoCode commands registered.");
}

function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine("EchoCode deactivated.");
    outputChannel.dispose();
  }
}

module.exports = {
  activate,
  deactivate,
};
