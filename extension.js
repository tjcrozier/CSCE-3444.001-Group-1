const vscode = require('vscode');
const { runPylint } = require('./pylintHandler');
const { speakMessage } = require('./speechHandler');
const { exec } = require('child_process');

let outputChannel;

const ANNOTATION_PROMPT = `You are a code tutor who helps students learn how to write better code. Your job is to evaluate a block of code that the user gives you. You will then annotate any lines that could be improved with a brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is enough that it will impact the readability and maintainability of the code. Be friendly with your suggestions and remember that these are students so they need gentle guidance. Format each suggestion as a single JSON object. It is not necessary to wrap your response in triple backticks. Here is an example of what your response should look like:

{ "line": 1, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }{ "line": 12, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }
`;

/**
 * Checks if Pylint is installed.
 */
function ensurePylintInstalled() {
    return new Promise((resolve, reject) => {
        exec(`python -m pylint --version`, (error) => {
            if (error) {
                vscode.window.showErrorMessage(
                    "Pylint is not installed. Click here to install it.",
                    "Install"
                ).then((selection) => {
                    if (selection === "Install") {
                        vscode.commands.executeCommand('workbench.action.terminal.new');
                        vscode.window.showInformationMessage("Run: pip install pylint in the terminal.");
                    }
                });
                reject("Pylint not installed");
                return;
            }
            resolve(true);
        });
    });
}

/**
 * Activates the extension.
 */
async function activate(context) {
    outputChannel = vscode.window.createOutputChannel('EchoCodeTutor');
    outputChannel.appendLine('EchoCodeTutor activated.');

    await ensurePylintInstalled();

    // Trigger on file save for Python files
    vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === 'python') {
            handlePythonErrors(document.uri.fsPath);
        }
    });

    // Command to manually trigger error reading
    let disposableReadErrors = vscode.commands.registerCommand('echocode.readErrors', () => {
        outputChannel.appendLine('echocode.readErrors command triggered');
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'python') {
            handlePythonErrors(editor.document.uri.fsPath);
        } else {
            vscode.window.showWarningMessage('Please open a Python file to read errors.');
        }
    });

    // Command to annotate code
    let disposableAnnotate = vscode.commands.registerTextEditorCommand('code-tutor.annotate', async (textEditor) => {
        outputChannel.appendLine('code-tutor.annotate command triggered');
        try {
            const codeWithLineNumbers = getVisibleCodeWithLineNumbers(textEditor);
            const [model] = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4o',
            });
            if (!model) {
                vscode.window.showErrorMessage('No language model available. Please ensure Copilot is enabled.');
                outputChannel.appendLine('No language model available');
                return;
            }
            const messages = [
                new vscode.LanguageModelChatMessage(0, ANNOTATION_PROMPT), // 0 = User role
                new vscode.LanguageModelChatMessage(0, codeWithLineNumbers),
            ];
            const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
            await parseChatResponse(chatResponse, textEditor);
            outputChannel.appendLine('Annotations applied successfully');
        } catch (error) {
            outputChannel.appendLine('Error in annotate command: ' + error.message);
            vscode.window.showErrorMessage('Failed to annotate code: ' + error.message);
        }
    });

    context.subscriptions.push(disposableReadErrors, disposableAnnotate);
    outputChannel.appendLine('Commands registered: echocode.readErrors, code-tutor.annotate');
}

async function handlePythonErrors(filePath) {
    try {
        const errors = await runPylint(filePath);
        if (errors.length === 0) {
            vscode.window.showInformationMessage('✅ No issues detected!');
            return;
        }

        outputChannel.appendLine(`📢 Found ${errors.length} Pylint error(s):`);

        for (const error of errors) {
            const message = `Line ${error.line}: ${error.message}`;
            outputChannel.appendLine(message);
            if (error.critical) {
                await speakMessage(message);
            }
        }

        outputChannel.show();
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to run Pylint: ${err}`);
        outputChannel.appendLine(`Error running Pylint: ${err}`);
    }
}

function getVisibleCodeWithLineNumbers(textEditor) {
    let currentLine = textEditor.visibleRanges[0].start.line;
    const endLine = textEditor.visibleRanges[0].end.line;
    let code = '';
    while (currentLine < endLine) {
        code += `${currentLine + 1}: ${textEditor.document.lineAt(currentLine).text} \n`;
        currentLine++;
    }
    return code;
}

async function parseChatResponse(chatResponse, textEditor) {
    let accumulatedResponse = "";
    for await (const fragment of chatResponse.text) {
        accumulatedResponse += fragment;
        if (fragment.includes("}")) {
            try {
                const annotation = JSON.parse(accumulatedResponse);
                applyDecoration(textEditor, annotation.line, annotation.suggestion);
                accumulatedResponse = "";
            } catch {
                // Ignore incomplete JSON
            }
        }
    }
}

function applyDecoration(editor, line, suggestion) {
    const decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            contentText: ` ${suggestion.substring(0, 25) + "..."}`,
            color: "grey",
        },
    });
    const lineLength = editor.document.lineAt(line - 1).text.length;
    const range = new vscode.Range(new vscode.Position(line - 1, lineLength), new vscode.Position(line - 1, lineLength));
    const decoration = { range: range, hoverMessage: suggestion };
    editor.setDecorations(decorationType, [decoration]);
}

function deactivate() {
    if (outputChannel) {
        outputChannel.appendLine('EchoCodeTutor deactivated.');
        outputChannel.dispose();
    }
}

module.exports = {
    activate,
    deactivate
};