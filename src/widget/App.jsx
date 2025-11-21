import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import StartButton from './components/StartButton';
import TermsModal from './components/TermsModal';
import ChatInterface from './components/ChatInterface';

const AGENT_ID = 'agent_8201kagj7ez0f3zv5t16gmj6g5rv'; // Extracted from index.html

const App = () => {
  // Restore conversation state from sessionStorage on mount
  const restoreConversationState = () => {
    try {
      const savedState = sessionStorage.getItem('ecovis_conversation_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        console.log('📦 Restoring conversation state:', state);
        
        // Convert timestamp strings back to Date objects
        const restoredMessages = (state.messages || []).map(msg => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        }));
        
        return {
          messages: restoredMessages,
          conversationMode: state.conversationMode || null,
          conversationId: state.conversationId || null,
          view: restoredMessages.length > 0 ? 'chat' : 'start'
        };
      }
    } catch (error) {
      console.error('Failed to restore conversation state:', error);
      // Clear corrupted state
      sessionStorage.removeItem('ecovis_conversation_state');
    }
    return {
      messages: [],
      conversationMode: null,
      conversationId: null,
      view: 'start'
    };
  };

  const initialState = restoreConversationState();
  const [view, setView] = useState(initialState.view);
  const [messages, setMessages] = useState(initialState.messages);
  const [conversationMode, setConversationMode] = useState(initialState.conversationMode);
  const [savedConversationId, setSavedConversationId] = useState(initialState.conversationId);
  
  // Store recent messages to capture tool call parameters
  const recentMessagesRef = useRef([]);
  
  // Save conversation state to sessionStorage
  const saveConversationState = (conversationId = null) => {
    try {
      const state = {
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        conversationMode,
        conversationId: conversationId || savedConversationId,
        timestamp: Date.now()
      };
      sessionStorage.setItem('ecovis_conversation_state', JSON.stringify(state));
      console.log('💾 Saved conversation state:', state);
    } catch (error) {
      console.error('Failed to save conversation state:', error);
    }
  };

  // Save state whenever messages or conversationMode changes
  useEffect(() => {
    if (messages.length > 0 || conversationMode) {
      saveConversationState();
    }
  }, [messages, conversationMode]);

  // Create a ref to store conversation for redirect handler
  const conversationRef = useRef(null);
  
  // Handle redirect tool - use useRef to keep it stable
  const handleRedirectRef = useRef((url) => {
    if (url && typeof url === 'string') {
      // Ensure URL starts with / if it's a relative path
      let redirectUrl = url.startsWith('/') ? url : `/${url}`;
      
      // If it doesn't end with .html, add it
      if (!redirectUrl.includes('.html') && !redirectUrl.endsWith('/')) {
        redirectUrl = redirectUrl + '.html';
      }
      
      console.log('🔄 [REDIRECT] Requested URL:', url);
      console.log('🔄 [REDIRECT] Normalized URL:', redirectUrl);
      
      // Validate that it's a relative path (security check)
      if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
        console.warn('❌ [REDIRECT] Invalid redirect URL (must be relative):', url);
        return 'Invalid URL. Please use relative paths only.';
      }
      
      // Use history API for SPA-style navigation without page reload
      console.log('🔄 [REDIRECT] Fetching content to keep chat connected...');
      console.log('🎤 [REDIRECT] Current conversation status:', conversation?.status);
      
      // Fetch the new page content WITHOUT reloading
      fetch(redirectUrl)
        .then(response => {
          console.log('📥 [REDIRECT] Fetch response:', response.status, response.statusText);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(html => {
          console.log('📄 [REDIRECT] HTML received, length:', html.length);
          
          // Parse the HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          // Find the main content container
          const newMainContent = doc.querySelector('main#content') || doc.querySelector('main');
          const currentMainContent = document.querySelector('main#content') || document.querySelector('main');
          
          console.log('🔍 [REDIRECT] Current main element:', currentMainContent ? 'found' : 'NOT FOUND');
          console.log('🔍 [REDIRECT] New main element:', newMainContent ? 'found' : 'NOT FOUND');
          
          if (currentMainContent && newMainContent) {
            console.log('✅ [REDIRECT] Replacing content without page reload...');
            
            // Replace main content without reloading page
            currentMainContent.innerHTML = newMainContent.innerHTML;
            
            // Update page title
            if (doc.title) {
              document.title = doc.title;
              console.log('📝 [REDIRECT] Title updated to:', doc.title);
            }
            
            // Update navigation active states
            const currentActiveLink = document.querySelector('nav a.active');
            if (currentActiveLink) {
              currentActiveLink.classList.remove('active');
            }
            
            // Add active class to the corresponding nav link
            const newActiveLink = document.querySelector(`nav a[href="${redirectUrl}"]`);
            if (newActiveLink) {
              newActiveLink.classList.add('active');
            }
            
            // Scroll to top of the page
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Update browser history
            if (window.history && window.history.pushState) {
              window.history.pushState({ path: redirectUrl }, '', redirectUrl);
              console.log('🔗 [REDIRECT] Browser URL updated to:', redirectUrl);
            }
            
            console.log('✅✅✅ [REDIRECT] Content loaded successfully - CHAT STAYS CONNECTED!');
            console.log('🎤 [REDIRECT] Conversation status after navigation:', conversation?.status);
          } else {
            console.error('❌ [REDIRECT] Could not find main content containers!');
            console.error('❌ [REDIRECT] THIS SHOULD NOT HAPPEN - Check your HTML structure');
            console.error('Available elements:', {
              'main#content': !!document.querySelector('main#content'),
              'main': !!document.querySelector('main'),
              'body': !!document.querySelector('body')
            });
          }
        })
        .catch(error => {
          console.error('❌ [REDIRECT] Fetch failed:', error);
          console.error('❌ [REDIRECT] Error details:', {
            message: error.message,
            stack: error.stack,
            url: redirectUrl
          });
        });
      
      // Return immediately - the fetch happens asynchronously
      return 'Navigating to ' + url + '... Stay on the line!';
    }
    return 'Invalid URL parameter.';
  });

  // Define clientTools handler using useMemo to keep it stable
  const clientToolsHandler = useMemo(() => {
    console.log('🔧 Creating clientTools handler');
    return {
      redirectToExternalURL: (params) => {
        console.log('🔧 clientTools.redirectToExternalURL CALLED!');
        console.log('Params:', params);
        console.log('Params type:', typeof params);
        console.log('Params keys:', params && typeof params === 'object' ? Object.keys(params) : 'N/A');
        console.log('Full params:', JSON.stringify(params, null, 2));
        
        // Handle different parameter formats
        let url = null;
        if (typeof params === 'string') {
          url = params;
        } else if (params && typeof params === 'object') {
          url = params.url || params.URL || params.path || params.pathname;
        } else if (Array.isArray(params) && params.length > 0) {
          url = params[0];
        }
        
        console.log('Extracted URL from clientTools:', url);
        if (url) {
          return handleRedirectRef.current(url);
        } else {
          console.error('❌ Could not extract URL from params:', params);
          return 'Error: Could not extract URL from parameters.';
        }
      }
    };
  }, []); // Empty deps - create once and keep stable

  const conversation = useConversation({
    textOnly: true, // Enable text-only mode - no microphone will be requested
    // Try to restore conversation ID if available (may not be supported by SDK)
    ...(savedConversationId && { conversationId: savedConversationId }),
    clientTools: clientToolsHandler,
    // Try onToolCall callback if available
    onToolCall: (toolCall) => {
      console.log('🔧 onToolCall callback triggered:', toolCall);
      console.log('Tool call structure:', JSON.stringify(toolCall, null, 2));
      
      if (toolCall && toolCall.name === 'redirectToExternalURL') {
        const url = toolCall.parameters?.url || toolCall.args?.url || toolCall.url;
        console.log('Extracted URL from onToolCall:', url);
        if (url) {
          handleRedirect(url);
        }
      }
    },
    // Handle errors - intercept tool call errors and handle them manually
    onError: (error) => {
      console.error('❌ Conversation error:', error);
      
      // Try to serialize the error completely to see all properties
      try {
        const errorObj = {};
        for (const key in error) {
          try {
            errorObj[key] = error[key];
          } catch (e) {
            errorObj[key] = 'Unable to serialize';
          }
        }
        console.error('Error properties:', errorObj);
        console.error('Error JSON:', JSON.stringify(errorObj, null, 2));
      } catch (e) {
        console.error('Could not fully serialize error');
      }
      
      // Check if it's a tool-related error - AGGRESSIVELY extract URL
      if (error && (error.message?.includes('tool') || error.message?.includes('redirectToExternalURL') || error.clientToolName === 'redirectToExternalURL')) {
        console.error('🔧 TOOL-RELATED ERROR - INTERCEPTING!');
        
        // FIRST: Check recent messages for tool call parameters (most likely to have the URL)
        console.log('🔍 Scanning recent messages:', recentMessagesRef.current.length, 'messages');
        for (let i = recentMessagesRef.current.length - 1; i >= Math.max(0, recentMessagesRef.current.length - 10); i--) {
          const msg = recentMessagesRef.current[i];
          if (msg && typeof msg === 'object') {
            console.log(`📨 Message ${i}:`, msg);
            
            // Try EVERY possible way to extract URL from message
            const possibleUrl = msg.parameters?.url || 
                              msg.url || 
                              msg.args?.url ||
                              msg.arguments?.url ||
                              msg.parameter?.url ||
                              (msg.data && msg.data.url) ||
                              (msg.data && msg.data.parameters && msg.data.parameters.url) ||
                              (msg.metadata && msg.metadata.url) ||
                              (msg.payload && msg.payload.url) ||
                              (msg.payload && msg.payload.parameters && msg.payload.parameters.url);
            
            // Check if this message is related to redirectToExternalURL
            const isRedirectTool = msg.tool === 'redirectToExternalURL' || 
                                  msg.name === 'redirectToExternalURL' || 
                                  msg.tool_name === 'redirectToExternalURL' ||
                                  msg.toolName === 'redirectToExternalURL' ||
                                  msg.clientToolName === 'redirectToExternalURL' ||
                                  (msg.data && msg.data.tool === 'redirectToExternalURL') ||
                                  (msg.type === 'tool_call' && msg.name === 'redirectToExternalURL');
            
            if (possibleUrl && isRedirectTool) {
              console.log('✅✅✅ FOUND URL IN RECENT MESSAGE! Redirecting to:', possibleUrl);
              handleRedirectRef.current(possibleUrl);
              return; // Stop error propagation
            }
            
            // Even if not explicitly marked as redirect tool, if message mentions it
            if (possibleUrl && JSON.stringify(msg).includes('redirectToExternalURL')) {
              console.log('✅✅✅ FOUND URL IN MESSAGE MENTIONING REDIRECT! Redirecting to:', possibleUrl);
              handleRedirectRef.current(possibleUrl);
              return;
            }
          }
        }
        
        // SECOND: Extract from error object itself
        console.log('🔍 Scanning error object for URL');
        
        // Try EVERY possible way to extract URL from error
        const possibleUrls = [
          error.url,
          error.parameter?.url,
          error.parameters?.url,
          error.args?.url,
          error.arguments?.url,
          error.data?.url,
          error.data?.parameter?.url,
          error.data?.parameters?.url,
          error.payload?.url,
          error.payload?.parameters?.url,
          error.toolCall?.parameters?.url,
          error.tool_call?.parameters?.url,
          error.toolCall?.url,
          error.tool_call?.url
        ];
        
        for (const url of possibleUrls) {
          if (url && typeof url === 'string') {
            console.log('✅✅✅ FOUND URL IN ERROR OBJECT! Redirecting to:', url);
            handleRedirectRef.current(url);
            return; // Stop error propagation
          }
        }
        
        console.error('❌ Could not extract URL from error or recent messages');
        console.error('Recent messages:', recentMessagesRef.current);
      }
    },
    onMessage: (message) => {
      // Store recent messages for tool call parameter extraction
      if (message) {
        recentMessagesRef.current.push(message);
        // Keep only last 10 messages
        if (recentMessagesRef.current.length > 10) {
          recentMessagesRef.current.shift();
        }
      }
      
      // PRIORITY: Check if this message contains tool call information BEFORE the error
      if (message && typeof message === 'object') {
        // Look for tool call data in various formats - check this FIRST
        const toolCallData = message.toolCall || message.tool_call || message.data?.toolCall || message.data?.tool_call;
        if (toolCallData && (toolCallData.name === 'redirectToExternalURL' || toolCallData.tool === 'redirectToExternalURL')) {
          const url = toolCallData.parameters?.url || toolCallData.url || toolCallData.args?.url;
          if (url) {
            console.log('✅ Found tool call in message BEFORE error, redirecting to:', url);
            handleRedirectRef.current(url);
            return; // Exit early to prevent error
          }
        }
        
        // Also check if message itself is a tool call
        if (message.name === 'redirectToExternalURL' || message.tool === 'redirectToExternalURL' || message.tool_name === 'redirectToExternalURL') {
          const url = message.parameters?.url || message.url || message.args?.url || message.arguments?.url;
          if (url) {
            console.log('✅ Found tool call directly in message, redirecting to:', url);
            handleRedirectRef.current(url);
            return; // Exit early to prevent error
          }
        }
      }
      
      // Only log non-tool messages to reduce noise
      if (!(message && typeof message === 'object' && (message.toolCall || message.tool_call || message.tool || message.tool_name))) {
      console.log('onMessage callback:', message);
      }
      
      // Check if this is a tool call message (fallback handling)
      if (message && typeof message === 'object') {
        // Check for various possible tool call formats
        const isToolCall = 
          message.type === 'tool_call' || 
          message.type === 'tool' ||
          message.tool_name === 'redirectToExternalURL' || 
          message.tool === 'redirectToExternalURL' ||
          message.toolName === 'redirectToExternalURL' ||
          message.name === 'redirectToExternalURL' ||
          (message.metadata && message.metadata.tool === 'redirectToExternalURL') ||
          (message.data && message.data.tool === 'redirectToExternalURL');
        
        if (isToolCall) {
          console.log('🔧 TOOL CALL DETECTED:', message);
          const url = message.parameters?.url || 
                     message.url || 
                     message.args?.url ||
                     message.arguments?.url ||
                     (message.data && message.data.url) ||
                     (message.metadata && message.metadata.url);
          
          console.log('Extracted URL:', url);
          
          if (url && typeof url === 'string') {
            try {
              const redirectUrl = url.startsWith('/') ? url : `/${url}`;
              // Validate that it's a relative path (security check)
              if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
                console.log('✅ Redirecting via onMessage fallback to:', redirectUrl);
                setTimeout(() => {
                  window.location.href = redirectUrl;
                }, 100); // Small delay to ensure message is logged
                return; // Don't add tool call to messages
              } else {
                console.warn('❌ Invalid redirect URL (must be relative):', url);
              }
            } catch (error) {
              console.error('❌ Error during redirect (onMessage fallback):', error);
            }
          } else {
            console.warn('❌ No valid URL found in tool call:', message);
          }
          return; // Don't process tool calls as regular messages
        }
        
        // Also check if message contains tool call information in text
        if (message.text || message.message || message.content) {
          const text = (message.text || message.message || message.content).toString();
          // Check for JSON structure that might contain tool calls
          if (text.includes('redirectToExternalURL') || text.includes('tool_call')) {
            console.log('🔍 Possible tool call in text:', text);
            try {
              // Try to parse if it looks like JSON
              if (text.trim().startsWith('{')) {
                const parsed = JSON.parse(text);
                if (parsed.tool === 'redirectToExternalURL' || parsed.name === 'redirectToExternalURL') {
                  const url = parsed.url || parsed.parameters?.url || parsed.args?.url;
                  if (url) {
                    console.log('✅ Found URL in parsed JSON:', url);
                    const redirectUrl = url.startsWith('/') ? url : `/${url}`;
                    if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
                      setTimeout(() => {
                        window.location.href = redirectUrl;
                      }, 100);
                      return;
                    }
                  }
                }
              }
            } catch (e) {
              // Not JSON, continue
            }
          }
        }
      }
      
      // Also check string messages for tool calls
      if (typeof message === 'string') {
        if (message.includes('redirectToExternalURL') || message.includes('tool_call')) {
          console.log('🔍 Possible tool call in string message:', message);
          try {
            const parsed = JSON.parse(message);
            if (parsed.tool === 'redirectToExternalURL' || parsed.name === 'redirectToExternalURL') {
              const url = parsed.url || parsed.parameters?.url || parsed.args?.url;
              if (url) {
                console.log('✅ Found URL in string JSON:', url);
                const redirectUrl = url.startsWith('/') ? url : `/${url}`;
                if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
                  setTimeout(() => {
                    window.location.href = redirectUrl;
                  }, 100);
                  return;
                }
              }
            }
          } catch (e) {
            // Not JSON, continue
          }
        }
      }
      
      // onMessage receives: tentative/final transcriptions of user voice, replies from LLM, or debug messages
      // Need to extract just the text content, not JSON structure
      
      let messageText = '';
      let sender = 'agent';
      
      if (typeof message === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(message);
          messageText = parsed.message || parsed.text || parsed.content || message;
          sender = parsed.source === 'user' || parsed.role === 'user' ? 'user' : 'agent';
        } catch {
          // Not JSON, use as-is
          messageText = message;
          sender = 'agent';
        }
      } else if (message) {
        // Extract text from message object
        messageText = message.message || message.text || message.content || message.transcript || '';
        
        // Determine sender based on message properties
        if (message.source === 'user' || message.role === 'user' || message.sender === 'user' || message.isUser) {
          sender = 'user';
        } else if (message.source === 'ai' || message.source === 'assistant' || message.role === 'assistant' || message.role === 'agent' || message.sender === 'agent' || message.sender === 'assistant') {
          sender = 'agent';
        } else {
          // Default: if it looks like a transcription (has transcript property), it's user
          // Otherwise assume agent
          sender = message.transcript ? 'user' : 'agent';
        }
      }
      
      // Clean up the message text - remove any JSON formatting, newlines should be preserved
      if (messageText && typeof messageText === 'string') {
        messageText = messageText.trim();
        // Remove any JSON-like structure if accidentally included
        if (messageText.startsWith('{') && messageText.includes('"message"')) {
          try {
            const parsed = JSON.parse(messageText);
            messageText = parsed.message || parsed.text || messageText;
          } catch {
            // If parsing fails, try to extract message field manually
            const match = messageText.match(/"message"\s*:\s*"([^"]+)"/);
            if (match) {
              messageText = match[1].replace(/\\n/g, '\n');
            }
          }
        }
      }
      
      if (messageText && messageText.trim() && messageText !== 'undefined' && !messageText.includes('debug') && !messageText.startsWith('{')) {
        setMessages(prev => {
          // Avoid duplicates - check if last message is the same
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.text === messageText && lastMessage.sender === sender) {
            return prev;
          }
          return [...prev, {
            id: Date.now() + Math.random(),
            text: messageText,
            sender: sender,
            timestamp: new Date()
          }];
        });
      }
    }
  });

  // Debug: Log conversation object properties and check for tool-related callbacks
  useEffect(() => {
    if (conversation) {
      // Store conversation in ref for redirect handler
      conversationRef.current = conversation;
      
      console.log('Conversation object:', conversation);
      console.log('Available properties:', Object.keys(conversation));
      
      // Save conversation ID when available
      const conversationId = conversation.conversationId || conversation.sessionId || null;
      if (conversationId && conversationId !== savedConversationId) {
        setSavedConversationId(conversationId);
        saveConversationState(conversationId);
      }
      
      // Check if there are tool-related methods or callbacks
      const conversationKeys = Object.keys(conversation);
      conversationKeys.forEach(key => {
        if (key.toLowerCase().includes('tool') || key.toLowerCase().includes('callback')) {
          console.log(`Found tool-related property: ${key}`, conversation[key]);
        }
      });
    }
  }, [conversation]);

  // Auto-restore conversation on mount if we have saved messages
  useEffect(() => {
    if (initialState.messages.length > 0 && view === 'start') {
      console.log('🔄 Auto-restoring conversation with', initialState.messages.length, 'messages');
      setView('chat');
    }
  }, []);

  const handleStartClick = () => {
    setView('terms');
  };

  const handleAcceptTerms = () => {
    setView('chat');
  };

  const handleDeclineTerms = () => {
    setView('start');
  };

  return (
    <div className="elevenlabs-widget-container">
      {view === 'start' && <StartButton onClick={handleStartClick} />}
      {view === 'terms' && (
        <TermsModal onAccept={handleAcceptTerms} onDecline={handleDeclineTerms} />
      )}
      {view === 'chat' && (
        <ChatInterface 
          conversation={conversation} 
          agentId={AGENT_ID}
          messages={messages}
          setMessages={setMessages}
          conversationMode={conversationMode}
          setConversationMode={setConversationMode}
          clientTools={clientToolsHandler}
        />
      )}
    </div>
  );
};

export default App;

