// content.js - Injects the UI into Google Docs
const session = {
  promptHistory: [],
  outputHistory: [],
  currentIndex: -1,
  isOpen: false
};

function isGoogleDocument() {
  return window.location.href.match(/\/document\/d\/[\w-]+\/edit/) !== null;
}

document.addEventListener('DOMContentLoaded', () => {
  if (isGoogleDocument()) {
    initUI();
  }
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  if (isGoogleDocument()) {
    initUI();
  }
}

function initUI() {
  const iconLink = document.createElement('link');
  iconLink.rel = 'stylesheet';
  iconLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
  document.head.appendChild(iconLink);

  const floatingButton = document.createElement('div');
  floatingButton.id = 'alinnea-floating-button';
  floatingButton.className = 'alinnea-floating-button';
  floatingButton.innerHTML = '<div class="alinnea-fab-icon"></div>';
  floatingButton.addEventListener('click', toggleChatUI);

  const chatContainer = document.createElement('div');
  chatContainer.id = 'alinnea-chat-container';
  chatContainer.classList.add('hidden', 'collapsed');

  chatContainer.innerHTML = `
    <div class="alinnea-header">
      <div class="alinnea-header-left">
        <button id="alinnea-undo" title="Undo"><span class="material-icons">undo</span></button>
        <button id="alinnea-redo" title="Redo"><span class="material-icons">redo</span></button>
      </div>
      <div class="alinnea-header-right">
        <button id="alinnea-settings"><span class="material-icons">settings</span></button>
      </div>
    </div>
    <div id="alinnea-response-area"></div>
    <button id="alinnea-new-chat" class="alinnea-new-chat">New Chat</button>
    <div class="alinnea-input-area">
      <button id="alinnea-collapse-toggle"><span class="material-icons">expand_less</span></button>
      <textarea id="alinnea-prompt" placeholder="Ask Alinnea anything..."></textarea>
      <button id="alinnea-submit"><span class="material-icons">send</span></button>
    </div>
  `;

  document.body.appendChild(floatingButton);
  document.body.appendChild(chatContainer);

  document.getElementById('alinnea-new-chat').addEventListener('click', resetChat);
  document.getElementById('alinnea-settings').addEventListener('click', openSettings);
  document.getElementById('alinnea-submit').addEventListener('click', () => {
    const collapseToggleBtn = document.getElementById('alinnea-collapse-toggle');
    if (chatContainer.classList.contains('collapsed')) {
      chatContainer.classList.remove('collapsed');
      collapseToggleBtn.querySelector('span').textContent = 'expand_more';
    }
    handleSubmit();
  });
  document.getElementById('alinnea-undo').addEventListener('click', handleUndo);
  document.getElementById('alinnea-redo').addEventListener('click', handleRedo);

  const collapseToggleBtn = document.getElementById('alinnea-collapse-toggle');
  collapseToggleBtn.addEventListener('click', () => {
    chatContainer.classList.toggle('collapsed');
    const icon = collapseToggleBtn.querySelector('span');
    icon.textContent = chatContainer.classList.contains('collapsed') ? 'expand_less' : 'expand_more';
  });

  const promptInput = document.getElementById('alinnea-prompt');
  promptInput.addEventListener('input', () => {
    if (!promptInput.value.trim()) {
      promptInput.style.height = '';
    } else {
      promptInput.style.height = 'auto';
      promptInput.style.height = promptInput.scrollHeight + 'px';
    }
  });

  document.getElementById('alinnea-prompt').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });
}

function toggleChatUI() {
  const chatContainer = document.getElementById('alinnea-chat-container');
  const floatingButton = document.getElementById('alinnea-floating-button');
  const fabIcon = floatingButton.querySelector('.alinnea-fab-icon');

  if (chatContainer.classList.contains('hidden')) {
    chatContainer.classList.remove('hidden');
    chatContainer.classList.add('visible');
    fabIcon.classList.add('open'); 
    session.isOpen = true;
  } else {
    chatContainer.classList.add('hidden');
    chatContainer.classList.remove('visible');
    fabIcon.classList.remove('open');
    session.isOpen = false;
  }
}

function resetChat() {
  session.promptHistory = [];
  session.outputHistory = [];
  session.currentIndex = -1;
  
  const responseArea = document.getElementById('alinnea-response-area');
  responseArea.innerHTML = '';
  document.getElementById('alinnea-prompt').value = '';
  
  const chatContainer = document.getElementById('alinnea-chat-container');
  chatContainer.classList.add('collapsed');
  
  const collapseToggleBtn = document.getElementById('alinnea-collapse-toggle');
  collapseToggleBtn.querySelector('span').textContent = 'expand_less';
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    
    const originalText = button.textContent;
    button.textContent = "Copied";
    
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
    
    showToast("Copied to clipboard!");
  } catch (err) {
    console.error('Failed to copy: ', err);
    showToast("Failed to copy to clipboard", true);
  }
}

async function handleSubmit() {
  const promptInput = document.getElementById('alinnea-prompt');
  const responseArea = document.getElementById('alinnea-response-area');
  const prompt = promptInput.value.trim();

  
  if (!prompt) return;
  
  const chatContainer = document.getElementById('alinnea-chat-container');
  if (chatContainer.classList.contains('collapsed')) {
    chatContainer.classList.remove('collapsed');
    const collapseToggleBtn = document.getElementById('alinnea-collapse-toggle');
    collapseToggleBtn.querySelector('span').textContent = 'expand_more';
  }
  
  responseArea.innerHTML = '<div class="alinnea-loading">Thinking...</div>';
  
  try {
    const documentId = getDocumentIdFromUrl();
    const docContext = await getDocContent();
    
    const context = {
      documentId: documentId,
      documentContent: docContext.documentContent
    };
    
    const response = await callLLM(prompt, context);
    
    const responseContent = response.data.choices[0].message.content;
    
    responseArea.innerHTML = `
      <div class="alinnea-response">
        <div class="alinnea-response-content">${responseContent}</div>
        <div class="alinnea-action-buttons">
          <button class="alinnea-copy-button">Copy</button>
          <button class="alinnea-insert-button">Insert at End</button>
        </div>
      </div>
    `;
    
    document.querySelector('.alinnea-insert-button').addEventListener('click', () => {
      insertIntoDoc(responseContent);
    });
    
    document.querySelector('.alinnea-copy-button').addEventListener('click', (event) => {
      copyToClipboard(responseContent, event.currentTarget);
    });
    session.promptHistory.push(prompt);
    session.outputHistory.push(response.data.choices[0].message.content);
    session.currentIndex = session.outputHistory.length - 1;
    promptInput.value = '';
    promptInput.style.height = '';
  } catch (error) {
    responseArea.innerHTML = `<div class="alinnea-error">Error: ${error.message}</div>`;
  }
}

function handleUndo() {
  if (session.currentIndex > 0) {
    session.currentIndex--;
    displayHistoryItem();
  }
}

function handleRedo() {
  if (session.currentIndex < session.outputHistory.length - 1) {
    session.currentIndex++;
    displayHistoryItem();
  }
}

function displayHistoryItem() {
  if (session.currentIndex >= 0 && session.currentIndex < session.outputHistory.length) {
    const responseArea = document.getElementById('alinnea-response-area');
    const content = session.outputHistory[session.currentIndex];
    
    responseArea.innerHTML = `
      <div class="alinnea-response">
        <div class="alinnea-response-content">${content}</div>
        <div class="alinnea-action-buttons">
          <button class="alinnea-copy-button">Copy</button>
          <button class="alinnea-insert-button">Insert at End</button>
        </div>
      </div>
    `;
    
    document.querySelector('.alinnea-insert-button').addEventListener('click', () => {
      insertIntoDoc(content);
    });
    
    document.querySelector('.alinnea-copy-button').addEventListener('click', (event) => {
      copyToClipboard(content, event.currentTarget);
    });
  }
}

async function getDocContent() {
  try {
    const documentId = getDocumentIdFromUrl();
    if (!documentId) {
      console.error('Could not determine document ID');
      return { documentContent: null };
    }
    
    console.log('Requesting document content');
    const response = await chrome.runtime.sendMessage({
      action: "getDocContent",
      documentId
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Unknown error getting document content');
    }
    
    const result = {
      documentContent: response.documentContent || null
    };
    
    if (!result.documentContent) {
      showToast("Please ensure document access permissions", true);
    }
    
    return result;
  } catch (error) {
    console.error('Error getting document content:', error);
    if (error.message.includes("Extension context invalidated")) {
      showToast("Extension was reloaded. Please refresh the page and try again.", true);
    } else {
      showToast(`Error getting document content: ${error.message}`, true);
    }
    return { documentContent: null };
  }
}

async function insertIntoDoc(text) {
  try {
    const documentId = getDocumentIdFromUrl();
    
    const response = await chrome.runtime.sendMessage({
      action: "updateDoc",
      documentId,
      updates: {
        text
      }
    });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    showToast("Text inserted at the end of the document!");
    
  } catch (error) {
    console.error("Error inserting text:", error);
    showToast("Error inserting text: " + error.message, true);
  }
}

function openSettings() {
  chrome.runtime.sendMessage({ action: "openPopup" });
}

async function callLLM(prompt, context) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "callGroqAPI", prompt, context },
      response => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || "Unknown error"));
        }
      }
    );
  });
}

function getDocumentIdFromUrl() {
  const match = window.location.href.match(/document\/d\/([^/]+)/);
  return match ? match[1] : null;
}


function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `alinnea-toast ${isError ? 'alinnea-error-toast' : ''}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
