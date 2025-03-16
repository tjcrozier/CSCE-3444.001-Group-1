const vscode = require('vscode');
const { runPylint } = require('./pylintHandler');
const { speakMessage } = require('./speechHandler');
const { exec } = require('child_process');
// NEW
const axios = require('axios');

// Change ***this line*** to try a different language model from Hugging Face. URL is https://api-inference.huggingface.co/models/<model name>
const HF_API_URL = "https://api-inference.huggingface.co/models/openai-community/gpt2"

// END NEW

let outputChannel;

// NEW
/**
 * Retrieve the Hugging Face API key from VSCode settings.
 */
function getHuggingFaceApiKey() {
    return vscode.workspace.getConfiguration().get('docstringGenerator.huggingFaceApiKey');
}

/**
 * Generate a Python docstring using the Hugging Face API.
 * @param {string} functionCode - The Python function code.
 */
async function generateDocstring(functionCode) {
    const HF_API_KEY = getHuggingFaceApiKey(); // Fetch API key from settings
    if (!HF_API_KEY) {
        vscode.window.showErrorMessage("Missing Hugging Face API Key. Set it in VSCode settings.");
        return "Docstring generation failed.";
    }

    // const prompt = `Generate a concise Python docstring that describes the function and its parameters. Do not repeat back the origional prompt or the function. Here's the function code:\n\n${functionCode}\n\nExpected format:\n\n\"\"\"\n<docstring content here>\n\n:param <parameter_name>: <parameter_description>\n:return: <return_description>\n\"\"\"\n\n`;
    const prompt = `Say the words, 'I like butter', once. Say only those words and nothing else.`
    try {
        const response = await axios.post(HF_API_URL, 
            { inputs: prompt },
            { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
        );
        console.log("Hugging Face Response:", response.data); // Log the response data
        return response.data[0]?.generated_text?.trim() || "Docstring generation failed.";
    } catch (error) {
        console.error("Hugging Face API request failed:", error);
        return "Docstring generation failed.";
    }
}

// END NEW

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
    let disposable1 = vscode.commands.registerCommand('echocode.readErrors', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'python') {
            handlePythonErrors(editor.document.uri.fsPath);
        }
    });

    // NEW: Insert the generated docstring
    let disposable2 = vscode.commands.registerCommand('extension.generateDocstring', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'python') return;

        const text = editor.document.getText();
        const functionRegex = /def\s+(\w+)\(.*\):/g; // Match Python function definitions
        let match;

        while ((match = functionRegex.exec(text)) !== null) {
            const functionStart = editor.document.positionAt(match.index);
            const functionCode = match[0]; // Extract function definition

            // Ensure the function doesn't already have a docstring
            const lineText = editor.document.lineAt(functionStart.line + 1).text.trim();
            if (!lineText.startsWith('"""')) {
                const docstring = await generateDocstring(functionCode);

                // Insert the generated docstring
                editor.edit((editBuilder) => {
                    const insertPosition = new vscode.Position(functionStart.line + 1, 0);
                    editBuilder.insert(insertPosition, `    """${docstring}"""\n`);
                });
            }
        }
    });
    // End new code

    context.subscriptions.push(disposable1, disposable2);
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