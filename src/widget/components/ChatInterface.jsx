import React, { useEffect, useState, useRef } from 'react';
import StartButton from './StartButton';

const ChatInterface = ({ conversation, agentId, messages, setMessages, conversationMode, setConversationMode, clientTools }) => {
  const { status, startSession, endSession, isSpeaking } = conversation;
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [wasConnected, setWasConnected] = useState(false); // Track if there was a previous call
  const [hasAutoReconnected, setHasAutoReconnected] = useState(false); // Track if we've auto-reconnected
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  
  // Auto-reconnect if we have restored messages
  useEffect(() => {
    if (messages.length > 0 && !hasAutoReconnected && status !== 'connected' && conversationMode) {
      console.log('🔄 Auto-reconnecting to conversation with', messages.length, 'messages');
      console.log('Current status:', status, 'Mode:', conversationMode);
      setHasAutoReconnected(true);
      
      // Auto-start session based on the restored conversation mode
      const reconnect = async () => {
        try {
          console.log('Starting reconnection session...');
          
          if (conversationMode === 'voice-text') {
            // For voice mode, user needs to manually reconnect
            console.log('Voice mode - user must manually reconnect');
            setWasConnected(true);
          } else {
            // For text mode, auto-reconnect
            console.log('Text mode - auto-reconnecting...');
            const sessionId = await startSession({ 
              agentId,
              connectionType: 'websocket',
              ...(clientTools && { clientTools })
            });
            console.log('Session started with ID:', sessionId);
            
            // Wait a moment for connection to establish
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('Status after wait:', status);
            console.log('✅ Auto-reconnection initiated');
          }
        } catch (error) {
          console.error('❌ Failed to auto-reconnect:', error);
          setWasConnected(true); // Show "New call" button
        }
      };
      
      reconnect();
    }
  }, [messages.length, hasAutoReconnected, status, conversationMode, agentId, startSession, clientTools]);
  
  // Monitor connection status changes
  useEffect(() => {
    console.log('Connection status changed:', status);
    if (status === 'connected' && messages.length > 0) {
      console.log('✅ Connection established with', messages.length, 'restored messages');
    }
  }, [status, messages.length]);

  // The onMessage callback in App.jsx handles transcriptions
  // This effect is no longer needed as callbacks handle it

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleConnectCall = async () => {
    try {
      // Request microphone permission for voice mode
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // Set mode to voice-text
      setConversationMode('voice-text');
      // Start session with WebRTC for voice support
      await startSession({ 
        agentId,
        connectionType: 'webrtc',
        ...(clientTools && { clientTools })
      });
      setWasConnected(false); // Reset flag when starting new call
    } catch (error) {
      console.error('Failed to start voice session:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Microphone access is required for voice calls. Please allow microphone access and try again.');
      } else {
        alert('Failed to start voice call: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleEndCall = async () => {
    await endSession();
    setMessages([]); // Clear messages on disconnect
    setConversationMode(null); // Reset mode
    setWasConnected(true); // Mark that there was a previous call
  };

  const handleNewCall = async () => {
    setWasConnected(false); // Reset flag
    await handleConnectCall();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) {
      return;
    }

    const messageToSend = inputText.trim();
    
    // Clear input and add message to display immediately
    setInputText('');
    const userMessage = {
      id: Date.now(),
      text: messageToSend,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);
    
    // If not connected, start session in text-only mode
    if (status !== 'connected') {
      try {
        // Set mode to text-only (no microphone needed)
        setConversationMode('text-only');
        console.log('🔌 Starting text-only session...');
        
        // Start session - hook is initialized with textOnly: true, so no mic will be requested
        const sessionId = await startSession({ 
          agentId,
          connectionType: 'websocket', // Use websocket for text-only (lighter, no mic required)
          ...(clientTools && { clientTools })
        });
        console.log('✅ Session started with ID:', sessionId);
        
        // Wait for sendUserMessage to become available (more reliable than waiting for status)
        let attempts = 0;
        while (!conversation.sendUserMessage && attempts < 25) {
          console.log(`⏳ Waiting for sendUserMessage... Attempt ${attempts + 1}/25`);
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        
        if (!conversation.sendUserMessage) {
          console.error('❌ Timeout: sendUserMessage not available after 5 seconds');
          setIsSending(false);
          alert('Connection timeout. Please try again.');
          return;
        }
        
        console.log('✅ sendUserMessage is now available');
      } catch (error) {
        console.error('❌ Failed to start text session:', error);
        setIsSending(false);
        alert('Failed to start text chat: ' + (error.message || error.toString() || 'Unknown error'));
        return;
      }
    }

    // Send message to agent using sendUserMessage
    try {
      // Access sendUserMessage directly from conversation object
      if (conversation && typeof conversation.sendUserMessage === 'function') {
        console.log('📤 Sending message:', messageToSend);
        conversation.sendUserMessage(messageToSend);
        console.log('✅ Message sent successfully');
        setIsSending(false);
      } else {
        console.error('❌ sendUserMessage is not available:', {
          conversation,
          hasSendUserMessage: conversation?.sendUserMessage,
          type: typeof conversation?.sendUserMessage,
          conversationKeys: conversation ? Object.keys(conversation) : 'no conversation',
          status: status
        });
        setIsSending(false);
        alert('Unable to send message. Connection not ready. Please try again.');
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setIsSending(false);
      alert('Failed to send message: ' + (error.message || error.toString()));
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  if (isMinimized) {
    return (
      <div className="chat-interface minimized">
        <StartButton onClick={handleExpand} />
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="logo-container">
          <img 
            src="https://www.ecovis.com/austria/en/wp-content/themes/ecovis-officetemplate/images/logo-ecovis-header.jpg" 
            alt="ECOVIS" 
            className="ecovis-logo"
          />
          <span className="ecovis-ai-text">AI</span>
        </div>
        <button className="minimize-button" onClick={handleMinimize} title="Minimize chat">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      
      <div className="chat-body" ref={chatBodyRef}>
        {messages.length === 0 && status !== 'connected' ? (
          <div className="chat-body-empty">
            {wasConnected ? (
              <div className="new-call-container">
                <button className="new-call-button" onClick={handleNewCall}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 16.92v3.02a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3.02a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  New call
                </button>
              </div>
            ) : (
              <div className="connect-button-container">
                <button className="connect-phone-button" onClick={handleConnectCall} title="Connect to agent">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 16.92v3.02a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3.02a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ) : messages.length === 0 && status === 'connected' ? (
          <div className="status-display">
            {conversationMode === 'text-only' ? (
              'Chat mode - Type your message'
            ) : (
              isSpeaking ? 'Agent is speaking...' : 'Listening...'
            )}
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  {message.text.split('\n').map((line, idx) => (
                    <React.Fragment key={idx}>
                      {line}
                      {idx < message.text.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {status === 'connected' && conversationMode === 'voice-text' && isSpeaking && messages.length > 0 && (
              <div className="message agent typing">
                <div className="message-content">
                  <span className="typing-indicator">Agent is speaking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="chat-controls">
        <form onSubmit={handleSendMessage} className="chat-form" style={{ flex: 1 }}>
          <input 
            type="text" 
            placeholder={status === 'connected' ? "Send a message" : "Send a message"} 
            className="chat-input" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
        </form>
        {status === 'connected' && conversationMode === 'voice-text' && (
          <button 
            className="phone-button end-call-button"
            onClick={handleEndCall}
            title="End call"
            style={{ backgroundColor: '#ff4444' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'white' }}>
              <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;

