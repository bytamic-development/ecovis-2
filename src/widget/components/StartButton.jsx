import React from 'react';

const StartButton = ({ onClick }) => {
  return (
    <div className="start-button-container">
      <div className="start-button-top">
        <div className="avatar-circle">
          <img src="/AI-Sphere.gif" alt="AI Assistant" className="ai-sphere-gif" />
        </div>
        <span className="need-help">Need help?</span>
      </div>
      <button className="start-call-btn" onClick={onClick}>
        <svg className="phone-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 16.92v3.02a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3.02a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        Start a call
      </button>
    </div>
  );
};

export default StartButton;

