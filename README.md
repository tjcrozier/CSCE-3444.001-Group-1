<<<<<<< HEAD
Here's the README file
=======
# 🔊 EchoCode — Python Error Reader for Visually Impaired Programmers

**EchoCode** is a Visual Studio Code extension designed to help **visually impaired beginner Python programmers** by reading out critical Python errors aloud using Pylint. It helps users debug their code with clear, concise, and actionable feedback.

---

## ✨ **Features**

- ✅ **Automatic Python Error Detection**  
  Automatically detects errors using [Pylint](https://pylint.pycqa.org/) when a Python file is saved.

- 🔊 **Reads Critical Errors Aloud**  
  Uses speech synthesis to read only essential errors (e.g., syntax errors, undefined variables).

- 📋 **Output Panel Logging**  
  Logs all detected errors in the VS Code Output Panel for visual reference.

- 🎯 **Simplified Error Messages**  
  Provides clear, concise explanations without overwhelming beginners.

- ⚡ **Auto-Detection of Missing Tools**  
  Automatically prompts users to install **Pylint** if it’s not found.

---

## 📋 **Requirements**

Before using EchoCode, ensure the following are installed:

1. **[Python](https://www.python.org/downloads/)** (version 3.6 or higher)
2. **Pylint** (automatically detected; will prompt for installation if missing):
   ```bash
   pip install pylint
   ```
3. **[Python Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)** (auto-installed if missing)

---

## ⚙️ **Extension Settings**

No additional settings are required. However, future versions will allow customization of:

- 🔊 **Speech speed**  
- 🔈 **Voice selection**  
- 🎙️ **Verbosity level (brief/detailed explanations)**  

---

## 🐞 **Known Issues**

- Non-critical errors (e.g., missing docstrings) are logged but not read aloud.
- Currently supports **Python** only.

---

## 🚀 **Release Notes**

### **1.0.0**  
- Initial release of EchoCode  
- Detects and reads Python errors aloud  
- Simplified error messages with clear explanations  
- Automatically prompts for missing dependencies  

---

## 📷 **Screenshots**

> (Add screenshots or GIFs here to showcase the extension in action)  


---

## 💡 **Contributing**

If you'd like to contribute to the extension:

1. Fork this repository.
2. Create a new feature branch:
   ```bash
   git checkout -b feature/YourFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add new feature'
   ```
4. Push the branch:
   ```bash
   git push origin feature/YourFeature
   ```
5. Submit a pull request.

---

## 📖 **Resources & Documentation**

- [VS Code Extension Documentation](https://code.visualstudio.com/api)
- [Pylint Documentation](https://pylint.pycqa.org/)
- [Node.js Documentation](https://nodejs.org/en/docs/)

---

## 👩‍💻 **Author & License**

Developed by Group 1 - Team Jacob  
>>>>>>> 8e90d0f (First commit of working EchoCode)
