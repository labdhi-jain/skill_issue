import './Landing.css';

export default function Landing({ onSignIn, onSignUp }) {
  return (
    <div className="landing-screen">
      <div className="landing-content">
        <h1 className="landing-logo-text">SKILL<br/>ISSUE</h1>
        <div className="landing-tagline">// A TYPING GAME WITH TRUST ISSUES</div>
        
        <div className="landing-actions">
          <button 
            id="landing-signin-btn" 
            className="btn-brutal" 
            onClick={onSignIn}
          >
            SIGN IN
          </button>
          
          <button 
            id="landing-signup-btn" 
            className="btn-brutal btn-brutal-primary" 
            onClick={onSignUp}
          >
            SIGN UP
          </button>
        </div>
      </div>
    </div>
  );
}
