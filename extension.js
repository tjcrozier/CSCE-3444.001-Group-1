const vscode = require('vscode');
const { runPylint } = require('./pylintHandler');
const { speakMessage } = require('./speechHandler');
const { exec } = require('child_process')
const { insertDocstring } = require('./docstringHandler.js');

let outputChannel;

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
    outputChannel = vscode.window.createOutputChannel('EchoCode');
    outputChannel.appendLine('EchoCode activated.');

    await ensurePylintInstalled();

    // Trigger on file save
    vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === 'python') {
            handlePythonErrors(document.uri.fsPath);
        }
    });

    // Command to manually trigger error reading
    let disposable = vscode.commands.registerCommand('echocode.readErrors', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'python') {
            handlePythonErrors(editor.document.uri.fsPath);
        }
    });

    // Command to insert a docstring in the current function
    let docstringGen = vscode.commands.registerCommand(
        'echocode.generateDocstring', insertDocstring
    );

    context.subscriptions.push(disposable, docstringGen);
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
    }
}

function deactivate() {
    console.log('EchoCode deactivated.');
}

module.exports = {
    activate,
    deactivate
};