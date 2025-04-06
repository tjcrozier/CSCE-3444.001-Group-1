# Echo Code — AI-Assisted Python Debugging for Visually Impaired Programmers

**Echo Code** is a Visual Studio Code extension that combines **AI-powered code tutoring** with **audible Python error reporting**. Designed to assist **visually impaired students**, this tool reads out Python errors detected by **Pylint** and provides annotation features to guide users in understanding their code.

---
## **Features**

- **Automatic Python Error Detection**  
  Detects errors in Python files automatically using Pylint upon saving.

- **Reads Python Errors Aloud**  
  Uses text-to-speech to read **critical Python errors**, such as syntax errors and undefined variables.

- **AI Code Tutoring Annotations**  
  Provides inline annotations explaining **common coding mistakes** and suggesting improvements.

- **Output Panel Logging**  
  Displays all detected errors in the VS Code Output Panel for visual reference.

- **Auto-Detection of Missing Tools**  
  Automatically prompts users to install **Pylint** if it’s not found.

- **Integration with GitHub Copilot**  
  Leverages GitHub Copilot for additional AI-powered coding assistance.

---
## **Keyboard Shortcuts**

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+Alt+A` | `code-tutor.Annotate` | Generates the annotations. |
| `Ctrl+Alt+S` | `code-tutor.speakNextAnnotation` | Reads the next annotation, including line number and suggestion. |
| `Ctrl+Alt+Q` | `code-tutor.readAllAnnotation` | Reads all the annotations in the queue. |

---
## **Installation & Requirements**

Before using Echo Code, ensure the following are installed:

1. **[Python](https://www.python.org/downloads/)** (version 3.6 or higher)
2. **Pylint** (automatically detected; will prompt for installation if missing):
   ```bash
   pip install pylint
   ```
3. **[Python Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)** (auto-installed if missing)

---
## **Extension Commands**

| Command | Description |
|---------|-------------|
| `echocode.readErrors` | Reads the most recent Python errors aloud. |
| `code-tutor.annotate` | Toggles tutor annotations for explanations and suggestions. |
| `echocode.readAllErrors` | Reads all detected Python errors aloud. |

---
## **Known Issues**

- Non-critical errors (e.g., missing docstrings) are logged but not read aloud.
- Currently, the extension only works on Windows OS machines.

---
## **Release Notes**

### **1.0.0**  
- Initial release of Echo Code.  
- Detects and reads Python errors aloud using Pylint.  
- Provides AI-powered tutoring annotations.  
- Supports keyboard shortcuts for accessibility.

### **1.1.0**  
- Added support for reading annotations aloud, including line numbers.  
- Improved text-to-speech clarity for errors and annotations.  
- Refactored code for better performance and maintainability.

---
## **Author & License**

Developed by Group 1 - Team Jacob  
