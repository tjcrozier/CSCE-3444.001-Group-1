const vscode = require("vscode"); // VSCode API
const { getCursorPos } = require("../../navigation_features/navigationHandler");
const {
  SUPPORTED_LANGUAGES, symKinds, getSymbolText
} = require("../../getSymbols");

// To speak summary aloud
const {
  speakMessage,
} = require("../../program_settings/speech_settings/speechHandler");

// To call the AI to summarize text
const {
  analyzeAI,
} = require("../../program_settings/program_settings/AIrequest");

function buildPrompt(language, symKind) {
    let instructions;

    if (symKind === "class") {
        instructions = "Mention thename of the class as well as the names of \
        variables and functions defined therein";
    } else if (symKind === "function") {
        instructions = "Be sure to mention the name of the function being \
        summarized";
    } else if (symKind === "file") {
        instructions = "Do not include function and class definitions in the \
        summary, just say that there is a definition";
    } else {
        console.error("Error building prompt. Symbol kind not found.")
        return "Error building prompt";
    }

    return `Give a brief summary of this ${language} ${symKind}. \
    ${instructions}. Do not use any markup language or emojis in your \
    generated summary.`
}

async function summarize(editor, language, symKind) {
    // Get the current position of the cursor in the file
    const curPos = getCursorPos(editor);

    // Get the text to summarize
    let text;
    if (symKind === "file") {
        text = editor.document.getText();
    } else {
        text = await getSymbolText(curPos.pos, symKind, editor);
    }

    // Print the retrieved text for debugging
    console.log(`---${symKind.toUpperCase()} TEXT---`);
    console.log(text);
    console.log(`---END ${symKind.toUpperCase()} TEXT---`);

    // Say something if a symbol of specified type is not found
    if (!text) {
        speakMessage(`Cursor is not in a ${symKind}`);
        return;
    }

    // Build the prompt
    const prompt = buildPrompt(language, symKind);

    // Feed prompt into AI and speak summary aloud
    analyzeAI(text, prompt).then((summary) => { speakMessage(summary); });
}

// Register commands for summarizing classes, functions, and files
function registerSummarizerCommands(context, outputChannel) {
    // Command to summarize a class
    const classSummaryCommand = vscode.commands.registerCommand(
        "echocode.summarizeClass", makeSummaryCommand("class", outputChannel)
    );

    // Command to summarize a function
    const functionSummaryCommand = vscode.commands.registerCommand(
        "echocode.summarizeFunction", 
        makeSummaryCommand("function", outputChannel)
    );

    // Command to summarize a program
    const programSummaryCommand = vscode.commands.registerCommand(
        "echocode.summarizeProgram", makeSummaryCommand("file", outputChannel),
    );
  // Add all commands to context.subscriptions
  context.subscriptions.push(
    classSummaryCommand,
    functionSummaryCommand,
    programSummaryCommand
  );
}

function makeSummaryCommand(symKind, outputChannel) {
    return () => {
        const editor = vscode.window.activeTextEditor;
        const language = editor?.document.languageId;

        outputChannel.appendLine(
            `Summarizing ${symKind} in ${language} file`
        );

        if (editor && SUPPORTED_LANGUAGES.includes(language)) {
            summarize(editor, language, symKind);
        } else {
            vscode.window.showWarningMessage(
                `Please open a Python, C++, or Java file to summarize a \
                ${symKind}.`
            );
        }
    };
}


module.exports = { registerSummarizerCommands };
