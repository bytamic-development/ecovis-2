import React, { useEffect, useState, useRef } from 'react';

const ChatInterface = ({ conversation, agentId, messages, setMessages, conversationMode, setConversationMode }) => {
  const { status, startSession, endSession, isSpeaking } = conversation;
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);

  // The onMessage callback in App.jsx handles transcriptions
  // This effect is no longer needed as callbacks handle it

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleToggleCall = async () => {
    if (status === 'connected') {
      await endSession();
      setMessages([]); // Clear messages on disconnect
      setConversationMode(null); // Reset mode
    } else {
      // Note: Since hook is initialized with textOnly: true, voice mode won't work
      // We'll start a text session and inform the user
      try {
        // Request microphone permission (even though it won't be used in textOnly mode)
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (micError) {
          // Mic permission denied is OK - we'll use text-only
          console.log('Microphone not available, using text-only mode');
        }
        // Set mode to voice-text (though it will be text-only due to hook config)
        setConversationMode('voice-text');
        // Start session - will be text-only due to hook initialization
        await startSession({ 
          agentId,
          connectionType: 'webrtc'
        });
        // Inform user that voice requires page refresh
        alert('Voice mode requires page refresh. Currently running in text-only mode. You can still chat via text.');
      } catch (error) {
        console.error('Failed to start session:', error);
        alert('Failed to start session: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) {
      return;
    }

    const messageToSend = inputText.trim();
    
    // If not connected, start session in text-only mode
    if (status !== 'connected') {
      try {
        setIsSending(true);
        // Set mode to text-only (no microphone needed)
        setConversationMode('text-only');
        console.log('Starting text-only session...');
        // Start session - hook is initialized with textOnly: true, so no mic will be requested
        const sessionId = await startSession({ 
          agentId,
          connectionType: 'websocket' // Use websocket for text-only (lighter, no mic required)
        });
        console.log('Session started:', sessionId);
        // Wait for connection to establish - check status
        let attempts = 0;
        while (status !== 'connected' && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
        if (status !== 'connected') {
          console.warn('Session started but status not connected yet');
        }
        setIsSending(false);
      } catch (error) {
        console.error('Failed to start text session:', error);
        setIsSending(false);
        alert('Failed to start text chat: ' + (error.message || error.toString() || 'Unknown error'));
        return;
      }
    }

    // Add user message to display immediately
    const userMessage = {
      id: Date.now(),
      text: messageToSend,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input immediately
    setInputText('');
    setIsSending(true);

    // Send message to agent using sendUserMessage
    try {
      // Wait a moment to ensure session is ready
      if (status !== 'connected') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Access sendUserMessage directly from conversation object
      if (conversation && typeof conversation.sendUserMessage === 'function') {
        console.log('Sending message:', messageToSend, 'Status:', status);
        conversation.sendUserMessage(messageToSend);
        setIsSending(false);
      } else {
        console.error('sendUserMessage is not available:', {
          conversation,
          hasSendUserMessage: conversation?.sendUserMessage,
          type: typeof conversation?.sendUserMessage,
          conversationKeys: conversation ? Object.keys(conversation) : 'no conversation'
        });
        setIsSending(false);
        // Keep the message visible even if sending failed
        alert('Unable to send message. sendUserMessage function not available.');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsSending(false);
      // Keep the message visible even if sending failed
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
        <button className="expand-button" onClick={handleExpand} title="Expand chat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 14L5 16L7 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 10L19 8L17 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 8L11 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 16L13 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
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
        {messages.length === 0 ? (
          <div className="status-display">
            {status === 'connected' ? (
              conversationMode === 'text-only' ? (
                'Chat mode - Type your message'
              ) : (
                isSpeaking ? 'Agent is speaking...' : 'Listening...'
              )
            ) : (
              'Ready to connect'
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
        <button 
          className={`phone-button ${status === 'connected' ? 'active' : ''}`}
          onClick={handleToggleCall}
          title={status === 'connected' ? 'End call' : 'Start call'}
          style={{ backgroundColor: status === 'connected' ? '#ff4444' : '#000000' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'white' }}>
            {status === 'connected' ? (
              <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            ) : (
              <path d="M22 16.92v3.02a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3.02a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;

