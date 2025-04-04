const vscode = require('vscode'); // VSCode API
const { Selection } = require('./codeParser');
const { speakMessage } = require('./speechHandler')

function summarizeFunction(editor) {
    // Attempt to retrieve the current function
    const currentFunction = new Selection('function');
    currentFunction.detectCurrentBlock(editor);

    // Nothing to summarize if the cursor is not in a function
    if (!currentFunction.cursorInSelection) {
        console.error("Cursor is not in a function. No summary generated.\n");
        speakMessage("Cursor is not inside a function.")
        return;
    }

    // Otherwise, print the text of the current function to the console (for now)
    const functionText = currentFunction.text;
    console.error("Will generate summary for the following function:")
    console.log("---FUNCTION TEXT---\n", functionText, "\n---END FUNCTION TEXT---\n");

    generateSummary(currentFunction.name).then(summary => {
        speakMessage("Generating summary for " + summary);
    });
}

async function generateSummary(blockName) {
   return blockName; // Dummy output
}

module.exports = { summarizeFunction };