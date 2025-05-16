const vscode = require("vscode"); // VSCode API
const { Selection } = require("./codeParser");
const { speakMessage } = require("../../speechHandler");
const { analyzeAI } = require("../../AIrequest");

function summarizeClass(editor) {
  // Attempt to retrieve the current class
  const currentClass = new Selection("class");
  currentClass.detectCurrentBlock(editor);

  // Nothing to summarize if the cursor is not in a class
  if (!currentClass.cursorInSelection) {
    console.error("Cursor is not in a class. No summary generated.\n");
    speakMessage("Cursor is not inside a class.");
    return;
  }

  // Otherwise, print the text of the current class to the console
  const classText = currentClass.text;
  console.error("Will generate summary for the following class:");
  console.log("---CLASS TEXT---\n", classText, "\n---END CLASS TEXT---\n");

  const prompt =
    "Give a brief summary of this python class. Mention thename of the class as well as the names of variables and functions defined therein. Do not use any markup language or emojis in your generated summary.";

  // Calls the function
  analyzeAI(classText, prompt).then((summary) => {
    speakMessage(summary);
  });
}

function summarizeFunction(editor) {
  // Attempt to retrieve the current function
  const currentFunction = new Selection("function");
  currentFunction.detectCurrentBlock(editor);

  // Nothing to summarize if the cursor is not in a function
  if (!currentFunction.cursorInSelection) {
    console.error("Cursor is not in a function. No summary generated.\n");
    speakMessage("Cursor is not inside a function.");
    return;
  }

  // Otherwise, print the text of the current function to the console (for now)
  const functionText = currentFunction.text;

  // replace with different prompts
  const instructionPrompt =
    "Give a brief summary of the following python function. Be sure to mention the name of the function being summarized. Do not use any markup language or emojis in your generated summary.";

  console.error("Will generate summary for the following function:");
  console.log(
    "---FUNCTION TEXT---\n",
    functionText,
    "\n---END FUNCTION TEXT---\n"
  );

  // Calls the function
  analyzeAI(functionText, instructionPrompt).then((summary) => {
    speakMessage(summary);
  });
}

function summarizeProgram(editor) {
  const programText = editor.document.getText();

  // replace with different prompts
  const instructionPrompt =
    "Give a brief summary of the following python program. Do not include function and class definitions in the summary, just say that there is a definition. Do not use any markup language or emojis in your generated summary.";

  console.error("Program Summary:");

  // Calls the function
  analyzeAI(programText, instructionPrompt).then((summary) => {
    console.error(summary), speakMessage(summary);
  });
}

module.exports = { summarizeFunction, summarizeClass, summarizeProgram };
