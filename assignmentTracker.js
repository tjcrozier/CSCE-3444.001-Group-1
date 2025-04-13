const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { speakMessage } = require('./speechHandler');

let taskList = [];
let currentTaskIndex = 0;
let completedTasks = new Set();

function resetTasks() {
    taskList = [];
    currentTaskIndex = 0;
    completedTasks.clear();
}

async function loadAssignmentFile() {
    const fileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
            'Text files': ['txt'],
            'All files': ['*']
        },
        openLabel: 'Open Assignment File'
    });

    if (!fileUri || fileUri.length === 0) {
        speakMessage('No file selected.');
        return;
    }

    const filePath = fileUri[0].fsPath;
    const text = fs.readFileSync(filePath, 'utf8');
    parseTasksFromText(text);
}

function parseTasksFromText(text) {
    resetTasks();

    const lines = text
        .split(/\r?\n/)
        .flatMap(line => line.split(/[\-\*\d+\.]/))
        .map(line => line.trim())
        .filter(line => line.length > 3);

    taskList = lines;

    speakMessage(`Loaded ${taskList.length} tasks from the assignment.`);
    vscode.window.showInformationMessage(`Assignment loaded with ${taskList.length} tasks.`);
}

function readNextTask() {
    while (currentTaskIndex < taskList.length && completedTasks.has(currentTaskIndex)) {
        currentTaskIndex++;
    }

    if (currentTaskIndex >= taskList.length) {
        speakMessage('All tasks completed.');
        return;
    }

    const task = taskList[currentTaskIndex];
    speakMessage(`Task ${currentTaskIndex + 1}: ${task}`);
}

function markTaskComplete() {
    if (currentTaskIndex < taskList.length) {
        completedTasks.add(currentTaskIndex);
        speakMessage(`Marked task ${currentTaskIndex + 1} as complete.`);
        currentTaskIndex++;
    } else {
        speakMessage('No current task to mark as complete.');
    }
}

module.exports = {
    loadAssignmentFile,
    readNextTask,
    markTaskComplete
};
