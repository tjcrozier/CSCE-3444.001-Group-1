const { exec } = require('child_process');

function runPylint(filePath) {
    return new Promise((resolve, reject) => {
        const command = `python -m pylint "${filePath}" --output-format=json`;

        exec(command, (error, stdout, stderr) => {
            if (error && !stdout) {
                reject(stderr || error.message);
                return;
            }

            try {
                const results = JSON.parse(stdout);
                const simplifiedErrors = results.map((error) => ({
                    line: error.line,
                    message: simplifyError(error.symbol, error.message),
                    type: error.type,
                    critical: isCriticalError(error.symbol),
                }));
                resolve(simplifiedErrors);
            } catch (parseError) {
                reject('Error parsing Pylint output.');
            }
        });
    });
}

function isCriticalError(symbol) {
    const criticalErrors = [
        'undefined-variable',
        'syntax-error',
        'indentation-error',
        'attribute-defined-outside-init',
        'assignment-from-none'
    ];
    return criticalErrors.includes(symbol);
}

function simplifyError(symbol, message) {
    const explanations = {
        'undefined-variable': "Undefined variable. Define it before use.",
        'syntax-error': "Syntax error detected.",
        'unused-import': "Unused import detected.",
        'indentation-error': "Incorrect indentation.",
        'missing-docstring': "Missing function or class description.",
    };
    return explanations[symbol] || message;
}

module.exports = { runPylint };