// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const errorMessagesPath = path.join(__dirname, 'errorMessages.json');
const errorMessages = JSON.parse(fs.readFileSync(errorMessagesPath, 'utf8'));

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "echocode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('echocode.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from EchoCode!');
		
		// Display a welcome page
		var panel = vscode.window.createWebviewPanel(
			'echoCode', // type of webview
			'EchoCode Extension', // Panel title
			vscode.ViewColumn.One,
			{enableScripts:true}
		);
		panel.webview.html = getWebViewContent();

		// Print all the possible error messages and their descriptions
		printAllErrorMessages();
	});

	context.subscriptions.push(disposable);
}

function printAllErrorMessages() {
	for (let errorKey in errorMessages) {
		console.log(errorKey + ": " + errorMessages[errorKey]['description']);
	}
}

function getWebViewContent() {
	return `<!DOCTYPE html>
	<html lang="en">
		<head>
			<title></title>
			<script>
				const vscode = acquireVsCodeApi();
				document.addEventListener('DOMContentLoaded', function() {
					const p1 = document.getElementById('p1');
					p1.style.color = 'red';
				});
				window.alert("Hello!");
			</script>
		</head>
		<body>
			<h1>Welcome to EchoCode!</h1>
			<p id='p1'>Stuff stuff stuff</p>
		</body>
	</html>`
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
