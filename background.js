// Service worker for the Alinnea and main background script

import { googleDocsAPI } from './google-docs-api.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log("Alinnea extension installed");

  chrome.storage.sync.get(['apiKey', 'model', 'maxTokens', 'temperature'], (items) => {
    chrome.storage.sync.set({
      apiKey: items.apiKey || "", 
      model: items.model || "llama-3.1-8b-instant",
      maxTokens: items.maxTokens || undefined,
      temperature: items.temperature || undefined,
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);
  
  if (request.action === "openPopup") {
    chrome.action.openPopup();
    return true;
  }
  
  if (request.action === "callGroqAPI") {
    callGroqAPI(request.prompt, request.context)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === "getDocContent") {
    fetchDocContent(request.documentId)
      .then(content => sendResponse({
        success: true,
        documentContent: content.content
      }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === "updateDoc") {
    updateDocContent(request.documentId, request.updates)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function callGroqAPI(prompt, context) {
  try {
    const data = await chrome.storage.sync.get(['apiKey']);
    const API_KEY = data.apiKey;
    
    if (!API_KEY) {
      throw new Error("Groq API key not set. Please open settings and set it.");
    }
    
    if (context && context.documentId) {
      if (!googleDocsAPI.isInitialized) {
        console.log("Initializing Google Docs API for context access...");
        const initialized = await googleDocsAPI.initialize();
        if (!initialized) {
          console.warn("Failed to initialize Google Docs API, proceeding without document context");
        } else {
          console.log("Google Docs API initialized successfully");
        }
      }
    }
    
    const settings = await chrome.storage.sync.get(['model', 'maxTokens', 'temperature']);
    
    const docContent = context && context.documentContent ? context.documentContent : '';
        
    let userContent = prompt;
    if (docContent) {
      userContent = `Document: ${docContent}\n\nPrompt: ${prompt}`;
    }
    
    const payload = {
      model: settings.model || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a text editor. Only return the text that should be inserted at the end of the document. Do not include explanations, introductions, or meta-commentary. Respond with only the text to add with no formatting." },
        { role: "user", content: userContent }
      ]
    };
    
    if (settings.maxTokens !== undefined) {
      payload.max_tokens = settings.maxTokens;
    }

    if (settings.temperature !== undefined) {
      payload.temperature = settings.temperature;
    }
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || 'Unknown error'}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw error;
  }
}


async function fetchDocContent(documentId) {
  console.log("Fetching document content for:", documentId);
  
  try {
    if (!googleDocsAPI.isInitialized || !googleDocsAPI.isAuthorized) {
      const initialized = await googleDocsAPI.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Google Docs API');
      }
    }
    
    const document = await googleDocsAPI.getDocument(documentId);
    console.log('Document content fetched successfully');
    
    let documentText = '';
    const content = document.body.content;
    
    if (content) {
      documentText = extractTextFromContent(content);
    }
    
    return {
      document: document,
      content: documentText
    };
  } catch (error) {
    console.error('Error fetching document content:', error);
    throw error;
  }
}

function extractTextFromContent(content) {
  let text = '';
  
  for (const element of content) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      if (paragraph.elements) {
        for (const textElement of paragraph.elements) {
          if (textElement.textRun && textElement.textRun.content) {
            text += textElement.textRun.content;
          }
        }
      }
    } else if (element.table) {
      const table = element.table;
      for (const row of table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          if (cell.content) {
            text += extractTextFromContent(cell.content) + ' ';
          }
        }
        text += '\n';
      }
    } else if (element.sectionBreak) {
      text += '\n';
    }
  }
  
  return text;
}

async function updateDocContent(documentId, updates) {
  console.log("Inserting content at end of document for:", documentId);
  
  try {
    if (!googleDocsAPI.isInitialized) {
      const initialized = await googleDocsAPI.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Google Docs API');
      }
    }
    
    const document = await googleDocsAPI.getDocument(documentId);
    
    let endPosition;
    if (document && document.body && document.body.content) {
      const lastElement = document.body.content[document.body.content.length - 1];
      if (lastElement.paragraph && lastElement.paragraph.elements) {
        const lastTextElement = lastElement.paragraph.elements[lastElement.paragraph.elements.length - 1];
        if (lastTextElement.textRun) {

          endPosition = lastTextElement.endIndex - 1;

          if (endPosition < 1) {
            endPosition = 1;
          }
        }
      }
    }
    
    if (!endPosition) {
      console.log('Could not determine document end position, using position 1 as fallback');
      endPosition = 1;
    }
    
    console.log(`Inserting text at end position: ${endPosition}`);
    
    const result = await googleDocsAPI.insertText(documentId, updates.text, endPosition);
    
    return { success: true, result };
  } catch (error) {
    console.error('Error updating document:', error);
    return { success: false, error: error.message };
  }
}


