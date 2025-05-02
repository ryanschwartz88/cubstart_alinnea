document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleApiKeyButton = document.getElementById('toggleApiKey');
  const modelSelect = document.getElementById('model');
  const enableMaxTokens = document.getElementById('enableMaxTokens');
  const maxTokensInput = document.getElementById('maxTokens');
  const maxTokensValue = document.getElementById('maxTokensValue');
  const maxTokensContainer = document.getElementById('maxTokensContainer');
  const enableTemperature = document.getElementById('enableTemperature');
  const temperatureInput = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperatureValue');
  const temperatureContainer = document.getElementById('temperatureContainer');
  const saveButton = document.getElementById('saveButton');
  const statusElement = document.getElementById('status');
  
  loadSettings();
  
  toggleApiKeyButton.addEventListener('click', toggleApiKeyVisibility);
  maxTokensInput.addEventListener('input', updateMaxTokensDisplay);
  temperatureInput.addEventListener('input', updateTemperatureDisplay);
  enableMaxTokens.addEventListener('change', toggleMaxTokens);
  enableTemperature.addEventListener('change', toggleTemperature);
  saveButton.addEventListener('click', saveSettings);
  
  toggleMaxTokens();
  toggleTemperature();
  
  function toggleApiKeyVisibility() {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleApiKeyButton.textContent = 'Hide';
    } else {
      apiKeyInput.type = 'password';
      toggleApiKeyButton.textContent = 'Show';
    }
  }

  function updateMaxTokensDisplay() {
    maxTokensValue.textContent = `${maxTokensInput.value} tokens`;
  }
  
  function updateTemperatureDisplay() {
    temperatureValue.textContent = temperatureInput.value;
  }
  
  function toggleMaxTokens() {
    const isEnabled = enableMaxTokens.checked;
    maxTokensInput.disabled = !isEnabled;
    maxTokensContainer.classList.toggle('disabled', !isEnabled);
  }
  
  function toggleTemperature() {
    const isEnabled = enableTemperature.checked;
    temperatureInput.disabled = !isEnabled;
    temperatureContainer.classList.toggle('disabled', !isEnabled);
  }
  
  function loadSettings() {
    console.log('Loading settings from storage...');
    chrome.storage.sync.get(
      {
        apiKey: '',
        model: 'llama-3.1-8b-instant'
      },
      (items) => {
        console.log('Retrieved settings:', { 
          apiKey: items.apiKey ? '(API key exists)' : '(empty)', 
          model: items.model,
          maxTokens: items.maxTokens !== undefined ? items.maxTokens : 'not set',
          temperature: items.temperature !== undefined ? items.temperature : 'not set'
        });
        
        apiKeyInput.value = items.apiKey;
        modelSelect.value = items.model;
        
        // Handle optional maxTokens
        if (items.maxTokens !== undefined) {
          enableMaxTokens.checked = true;
          maxTokensInput.value = items.maxTokens;
        } else {
          enableMaxTokens.checked = false;
          maxTokensInput.value = 2048; // Default value
        }
        
        // Handle optional temperature
        if (items.temperature !== undefined) {
          enableTemperature.checked = true;
          temperatureInput.value = items.temperature;
        } else {
          enableTemperature.checked = false;
          temperatureInput.value = 0.7; // Default value
        }
        
        updateMaxTokensDisplay();
        updateTemperatureDisplay();
        toggleMaxTokens();
        toggleTemperature();
      }
    );
  }
  
  function saveSettings() {
    // Start with required settings
    const settings = {
      apiKey: apiKeyInput.value,
      model: modelSelect.value
    };
    
    // Only add maxTokens if enabled
    if (enableMaxTokens.checked) {
      settings.maxTokens = parseInt(maxTokensInput.value);
    } else {
      // Remove maxTokens from storage if it exists
      chrome.storage.sync.remove('maxTokens');
    }
    
    // Only add temperature if enabled
    if (enableTemperature.checked) {
      settings.temperature = parseFloat(temperatureInput.value);
    } else {
      // Remove temperature from storage if it exists
      chrome.storage.sync.remove('temperature');
    }
    
    console.log('Saving settings to storage:', { 
      apiKey: settings.apiKey ? '(API key provided)' : '(empty)', 
      model: settings.model,
      maxTokens: enableMaxTokens.checked ? settings.maxTokens : 'not set',
      temperature: enableTemperature.checked ? settings.temperature : 'not set'
    });
    
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
        statusElement.textContent = 'Error saving settings!';
        statusElement.className = 'error';
      } else {
        console.log('Settings saved successfully!');
        statusElement.textContent = 'Settings saved!';
        statusElement.className = 'success';
        
        chrome.storage.sync.get(['apiKey'], (items) => {
          console.log('Verification - API key in storage:', items.apiKey ? '(exists)' : '(empty)');
        });
        
        setTimeout(() => {
          statusElement.textContent = '';
        }, 3000);
      }
    });
  }
});
