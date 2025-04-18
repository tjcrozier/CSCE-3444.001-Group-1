// Script for the chat view
(function () {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // Elements
    const messagesContainer = document.getElementById('messages-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const voiceButton = document.getElementById('voice-button');
    const listeningIndicator = document.getElementById('listening-indicator');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    let currentAssistantMessage = null;
    
    // Send a message
    function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        
        // Add user message to UI
        addMessageToUI('user', text);
        
        // Clear input
        userInput.value = '';
        
        // Send to extension
        vscode.postMessage({
            type: 'userInput',
            text: text
        });
        
        // Create placeholder for assistant response
        currentAssistantMessage = addMessageToUI('assistant', '');
    }
    
    // Add message to UI
    function addMessageToUI(role, text) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}-message`;
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.textContent = text;
        
        messageElement.appendChild(contentElement);
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return contentElement;
    }
    
    // Start voice recognition
    function startVoiceRecognition() {
        vscode.postMessage({
            type: 'startVoiceRecognition'
        });
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    voiceButton.addEventListener('click', startVoiceRecognition);
    
    // Handle messages from the extension
    window.addEventListener('message', (event) => {
        const message = event.data;
        
        switch (message.type) {
            case 'response':
                // For full responses
                if (currentAssistantMessage) {
                    currentAssistantMessage.textContent = message.text;
                    currentAssistantMessage = null;
                } else {
                    addMessageToUI('assistant', message.text);
                }
                break;
                
            case 'responseFragment':
                // For incremental responses
                if (currentAssistantMessage) {
                    currentAssistantMessage.textContent += message.text;
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                break;
                
            case 'responseComplete':
                // Finalize the response
                currentAssistantMessage = null;
                break;
                
            case 'responseLoading':
                // Show/hide loading indicator
                if (message.started) {
                    loadingIndicator.classList.remove('hidden');
                } else {
                    loadingIndicator.classList.add('hidden');
                }
                break;
                
            case 'responseError':
                // Handle errors in response
                if (currentAssistantMessage) {
                    currentAssistantMessage.textContent = message.error || 'Error getting response';
                    currentAssistantMessage.parentElement.classList.add('error');
                    currentAssistantMessage = null;
                }
                break;
                
            case 'voiceListeningStarted':
                // Visual indicator that voice input is active
                voiceButton.classList.add('active');
                listeningIndicator.classList.remove('hidden');
                userInput.placeholder = 'Listening...';
                break;
                
            case 'voiceListeningStopped':
                // Visual indicator that voice input has stopped
                voiceButton.classList.remove('active');
                listeningIndicator.classList.add('hidden');
                userInput.placeholder = 'Ask a question about your code...';
                break;
                
            case 'voiceRecognitionResult':
                // Add recognized text to input field
                userInput.value = message.text;
                userInput.focus();
                break;
                
            case 'voiceRecognitionError':
                // Handle voice recognition errors
                voiceButton.classList.remove('active');
                listeningIndicator.classList.add('hidden');
                userInput.placeholder = 'Ask a question about your code...';
                addMessageToUI('system', `Voice recognition error: ${message.error || 'Unknown error'}`);
                break;
                
            case 'startVoiceInput':
                // Trigger voice input from command
                startVoiceRecognition();
                break;
        }
        
        // Always scroll to the latest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
})();