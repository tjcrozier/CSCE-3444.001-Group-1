const vscode = require('vscode'); // VSCode API
const { Selection } = require('./codeParser');
const { speakMessage } = require('./speechHandler');
const { analyzeAI } = require('./AIrequest');

function summarizeClass(editor) {
    // Attempt to retrieve the current class
    const currentClass = new Selection('class');
    currentClass.detectCurrentBlock(editor);

    // Nothing to summarize if the cursor is not in a class
    if (!currentClass.cursorInSelection) {
        console.error("Cursor is not in a class. No summary generated.\n");
        speakMessage("Cursor is not inside a class.")
        return;
    }

    // Otherwise, print the text of the current class to the console
    const classText = currentClass.text;
    console.error("Will generate summary for the following class:")
    console.log("---CLASS TEXT---\n", classText, "\n---END CLASS TEXT---\n");

    speakMessage("Generating summary for " + currentClass.name);

    // Calls the function 
    analyzeAI(classText).then(summary =>{
        speakMessage(summary)
    });
}

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

    speakMessage("Generating summary for " + currentFunction.name);

    // Calls the function 
    analyzeAI(functionText).then(summary =>{
        speakMessage(summary)
    });
}


module.exports = { summarizeFunction, summarizeClass };