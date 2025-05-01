// popup.js - Handles settings functionality for the Alinnea extension

document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  const apiKeyInput = document.getElementById('apiKey');
  const toggleApiKeyButton = document.getElementById('toggleApiKey');
  const modelSelect = document.getElementById('model');
  const maxTokensInput = document.getElementById('maxTokens');
  const maxTokensValue = document.getElementById('maxTokensValue');
  const temperatureInput = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperatureValue');
  const saveButton = document.getElementById('saveButton');
  const statusElement = document.getElementById('status');
  
  // Load saved settings
  loadSettings();
  
  // Set up event listeners
  toggleApiKeyButton.addEventListener('click', toggleApiKeyVisibility);
  maxTokensInput.addEventListener('input', updateMaxTokensDisplay);
  temperatureInput.addEventListener('input', updateTemperatureDisplay);
  saveButton.addEventListener('click', saveSettings);
  
  // Toggle API key visibility
  function toggleApiKeyVisibility() {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleApiKeyButton.textContent = 'Hide';
    } else {
      apiKeyInput.type = 'password';
      toggleApiKeyButton.textContent = 'Show';
    }
  }
  
  // Update max tokens display
  function updateMaxTokensDisplay() {
    maxTokensValue.textContent = `${maxTokensInput.value} tokens`;
  }
  
  // Update temperature display
  function updateTemperatureDisplay() {
    temperatureValue.textContent = temperatureInput.value;
  }
  
  // Load saved settings from chrome.storage
  function loadSettings() {
    console.log('Loading settings from storage...');
    chrome.storage.sync.get(
      {
        apiKey: '',
        model: 'llama-3.1-8b-instant',
        maxTokens: 2048,
        temperature: 0.7
      },
      (items) => {
        console.log('Retrieved settings:', { 
          apiKey: items.apiKey ? '(API key exists)' : '(empty)', 
          model: items.model,
          maxTokens: items.maxTokens,
          temperature: items.temperature 
        });
        
        apiKeyInput.value = items.apiKey;
        modelSelect.value = items.model;
        maxTokensInput.value = items.maxTokens;
        temperatureInput.value = items.temperature;
        
        // Update displays
        updateMaxTokensDisplay();
        updateTemperatureDisplay();
      }
    );
  }
  
  // Save settings to chrome.storage
  function saveSettings() {
    const settings = {
      apiKey: apiKeyInput.value,
      model: modelSelect.value,
      maxTokens: parseInt(maxTokensInput.value),
      temperature: parseFloat(temperatureInput.value)
    };
    
    console.log('Saving settings to storage:', { 
      apiKey: settings.apiKey ? '(API key provided)' : '(empty)', 
      model: settings.model,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature 
    });
    
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
        statusElement.textContent = 'Error saving settings!';
        statusElement.className = 'error';
      } else {
        console.log('Settings saved successfully!');
        // Show success message
        statusElement.textContent = 'Settings saved!';
        statusElement.className = 'success';
        
        // Verify immediately that the API key was saved
        chrome.storage.sync.get(['apiKey'], (items) => {
          console.log('Verification - API key in storage:', items.apiKey ? '(exists)' : '(empty)');
        });
        
        // Clear status message after 2 seconds
        setTimeout(() => {
          statusElement.textContent = '';
        }, 2000);
      }
    });
  }
});
