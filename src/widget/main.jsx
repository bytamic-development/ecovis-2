import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Prevent old ElevenLabs widget from loading if our custom widget is present
if (document.getElementById('elevenlabs-widget-root')) {
  // Remove any old widget elements
  const oldWidgets = document.querySelectorAll('elevenlabs-convai');
  oldWidgets.forEach(widget => widget.remove());
  
  // Remove old widget scripts
  const oldScripts = document.querySelectorAll('script[src*="convai-widget-embed"]');
  oldScripts.forEach(script => script.remove());
  
  console.log('✅ Custom ECOVIS widget initializing...');
  
  const rootElement = document.getElementById('elevenlabs-widget-root');
  if (rootElement) {
    try {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log('✅ Custom ECOVIS widget loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load custom widget:', error);
    }
  } else {
    console.error('❌ Widget root element not found');
  }
} else {
  console.warn('⚠️ Widget root element (#elevenlabs-widget-root) not found on this page');
}

