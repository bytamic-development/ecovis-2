import React, { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import StartButton from './components/StartButton';
import TermsModal from './components/TermsModal';
import ChatInterface from './components/ChatInterface';

const AGENT_ID = 'agent_8201kagj7ez0f3zv5t16gmj6g5rv'; // Extracted from index.html

const App = () => {
  const [view, setView] = useState('start'); // start, terms, chat
  const [messages, setMessages] = useState([]);
  const [conversationMode, setConversationMode] = useState(null); // 'text-only' or 'voice-text'
  
  // Initialize conversation hook with textOnly: true
  // This ensures text chat works without microphone requests
  // For voice mode, we'll need to handle it differently (SDK limitation)
  const conversation = useConversation({
    textOnly: true, // Enable text-only mode - no microphone will be requested
    onMessage: (message) => {
      console.log('onMessage callback:', message);
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

  // Debug: Log conversation object properties
  useEffect(() => {
    if (conversation) {
      console.log('Conversation object:', conversation);
      console.log('Available properties:', Object.keys(conversation));
    }
  }, [conversation]);

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
        />
      )}
    </div>
  );
};

export default App;

