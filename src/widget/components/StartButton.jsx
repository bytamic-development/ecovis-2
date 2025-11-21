import React from 'react';

const StartButton = ({ onClick }) => {
  return (
    <div className="start-button-container">
      <div className="start-button-content">
        <div className="avatar-circle">
          {/* Placeholder for avatar/icon */}
          <div className="avatar-inner"></div>
        </div>
        <div className="text-content">
          <span className="need-help">Need help?</span>
          <button className="start-call-btn" onClick={onClick}>
            <span className="phone-icon">📞</span> Start a call
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartButton;

