const { spawn } = require('child_process');

/**
 * Runs Pylint on the given file and parses the output.
 * @param {string} filePath - The path of the Python file to analyze.
 * @returns {Promise<Array>} - A promise resolving to an array of errors.
 */
function runPylint(filePath) {
    return new Promise((resolve, reject) => {
        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        const command = [ "-m", "pylint", filePath, "--output-format=json" ];

        const pylint = spawn(pythonCmd, command);
        let stdoutData = "";
        let stderrData = "";

        // Collect output
        pylint.stdout.on("data", (data) => stdoutData += data.toString());
        pylint.stderr.on("data", (data) => stderrData += data.toString());

        // Handle completion
        pylint.on("close", (code) => {
            if (code !== 0 && !stdoutData) {
                reject(`Pylint error: ${stderrData.trim() || `Exited with code ${code}`}`);
                return;
            }

            try {
                const results = JSON.parse(stdoutData.trim() || "[]");
                const simplifiedErrors = results.map((error) => ({
                    line: error.line,
                    message: simplifyError(error.symbol, error.message),
                    type: error.type,
                    critical: isCriticalError(error.symbol),
                }));

                resolve(simplifiedErrors);
            } catch (parseError) {
                reject("Error parsing Pylint output.");
            }
        });

        // Timeout if Pylint takes too long (prevents infinite hanging)
        setTimeout(() => {
            reject("Pylint took too long. Check if it's installed correctly.");
            pylint.kill();
        }, 10000); // 10s timeout
    });
}

/**
 * Determines if an error is critical (should be read aloud immediately).
 * @param {string} symbol - The Pylint error symbol.
 * @returns {boolean} - True if the error is critical.
 */
function isCriticalError(symbol) {
    const criticalErrors = new Set([
        'undefined-variable',
        'syntax-error',
        'indentation-error',
        'attribute-defined-outside-init',
        'assignment-from-none'
    ]);
    return criticalErrors.has(symbol);
}

/**
 * Simplifies error messages to be more beginner-friendly.
 * @param {string} symbol - The Pylint error symbol.
 * @param {string} message - The original error message.
 * @returns {string} - A simplified version of the error message.
 */
function simplifyError(symbol, message) {
    const explanations = {
        'undefined-variable': "This variable is not defined. Did you forget to create it?",
        'syntax-error': "There's a syntax error. Check for missing colons, quotes, or brackets.",
        'unused-import': "This import is not used. You can remove it.",
        'indentation-error': "Your indentation is incorrect. Check your spacing.",
        'missing-docstring': "This function or class is missing a description. Consider adding one.",
    };
    return explanations[symbol] || message;
}

module.exports = { runPylint };
