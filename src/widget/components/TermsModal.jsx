import React from 'react';

const TermsModal = ({ onAccept, onDecline }) => {
  return (
    <div className="terms-modal-overlay">
      <div className="terms-modal">
        <h3>Terms and conditions</h3>
        <div className="terms-content">
          <p>
            By clicking "Agree," and each time I interact with this AI agent, I consent to the recording, storage, and sharing of my communications with third-party service providers, and as described in the Privacy Policy. If you do not wish to have your conversations recorded, please refrain from using this service.
          </p>
        </div>
        <div className="terms-actions">
          <button className="btn-cancel" onClick={onDecline}>Cancel</button>
          <button className="btn-accept" onClick={onAccept}>Accept</button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;

