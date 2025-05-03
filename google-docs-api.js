// google-docs-api.js - Handles Google Docs API integration

/**
 * Google Docs API wrapper for the Alinnea extension
 * Handles authentication and document operations
 */
class GoogleDocsAPI {
    constructor() {
      this.isInitialized = false;
      this.isAuthorized = false;
    }
    
    async initialize() {
      if (this.isInitialized) return true;
      
      try {
        const authResult = await this.authorize();
        this.isAuthorized = authResult;
        this.isInitialized = true;
        return true;
      } catch (error) {
        console.error('Error initializing Google Docs API:', error);
        return false;
      }
    }
    
    async authorize() {
      return new Promise((resolve, reject) => {
        try {
          chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
              console.error('Authorization error:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
              return;
            }
            
            if (token) {
              this.authToken = token;
              resolve(true);
            } else {
              resolve(false);
            }
          });
        } catch (error) {
          console.error('Authorization failed:', error);
          reject(error);
        }
      });
    }
    
    async getDocument(documentId) {
      if (!this.isInitialized) await this.initialize();
      
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Docs API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      return await response.json();
    }
  
    async insertText(documentId, text, index = 1) {
      if (!this.isInitialized) await this.initialize();
      
      const request = {
        requests: [
          {
            insertText: {
              text: text,
              location: {
                index: index 
              }
            }
          }
        ]
      };
      
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Docs API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      return await response.json();
    }
    
  }
  
  const googleDocsAPI = new GoogleDocsAPI();
  export { googleDocsAPI };
  