const vscode = require('vscode'); // VSCode API
const { speakMessage } = require('./speechHandler');
const { analyzeAI } = require('./AIrequest');

function describeCursorPosition(editor) {
    // Get full text of the current file
    const fullText = editor.document.getText();

    // Get cursor position
    const cursorPos = editor.selection.active;
    const cursorLineNo = cursorPos.line + 1;
    const cursorColNo = cursorPos.character + 1;

    const prompt = "My cursor is at line " + cursorLineNo + ", column " + cursorColNo + " in the following Python code. Give a brief description of the cursor's location in the code in a TTS-friendly format.";
    
    // Pass the prompt and text selection into the AI
    analyzeAI(fullText, prompt).then(posDescription =>{
        console.log(posDescription);
        // speakMessage(posDescription);
    });
}

module.exports = { describeCursorPosition }
 