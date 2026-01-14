// Minimalist Monochrome About Page
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/About.css';
import useScrollAnimation from '../utils/useScrollAnimation';

const About = () => {
  const navigate = useNavigate();
  
  // Scroll animation refs
  const [missionRef, missionVisible] = useScrollAnimation({ threshold: 0.2 });
  const [featuresRef, featuresVisible] = useScrollAnimation({ threshold: 0.2 });
  const [howItWorksRef, howItWorksVisible] = useScrollAnimation({ threshold: 0.2 });
  const [securityRef, securityVisible] = useScrollAnimation({ threshold: 0.2 });
  const [teamRef, teamVisible] = useScrollAnimation({ threshold: 0.2 });
  const [ctaRef, ctaVisible] = useScrollAnimation({ threshold: 0.2 });

  return (
    <div className="about-container">
      {/* Hero Header */}
      <header className="about-header">
        <span className="about-header__label">About Us</span>
        <h1 className="about-header__title">NextStep</h1>
        <p className="about-header__subtitle">Reimagining how professionals find their next opportunity</p>
      </header>

      {/* Mission Section */}
      <section 
        ref={missionRef}
        className={`about-section about-section--inverted ${missionVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <div className="about-section__content">
          <span className="about-section__number">01</span>
          <h2 className="about-section__title">Our Mission</h2>
          <p className="about-section__text about-section__text--large">
            We believe job hunting shouldn't feel like a job. NextStep transforms the search into a 
            <strong> seamless, intuitive experience</strong> that respects your time and matches you 
            with opportunities that actually fit.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section 
        ref={featuresRef}
        className={`about-features ${featuresVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <h2 className="about-features__title">What Sets Us Apart</h2>
        <div className="about-features__grid">
          <div className="about-feature-card">
            <span className="about-feature-card__icon">→</span>
            <h3 className="about-feature-card__title">Swipe Interface</h3>
            <p className="about-feature-card__text">Browse jobs naturally. Right to apply, left to pass. No more endless scrolling.</p>
          </div>
          <div className="about-feature-card">
            <span className="about-feature-card__icon">◎</span>
            <h3 className="about-feature-card__title">Smart Matching</h3>
            <p className="about-feature-card__text">AI-powered recommendations that learn your preferences and surface relevant roles.</p>
          </div>
          <div className="about-feature-card">
            <span className="about-feature-card__icon">●</span>
            <h3 className="about-feature-card__title">One-Click Apply</h3>
            <p className="about-feature-card__text">Your profile does the work. Apply instantly without repetitive form filling.</p>
          </div>
          <div className="about-feature-card">
            <span className="about-feature-card__icon">◈</span>
            <h3 className="about-feature-card__title">Track Everything</h3>
            <p className="about-feature-card__text">Monitor applications, responses, and progress all in one organized dashboard.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section 
        ref={howItWorksRef}
        className={`about-how-it-works ${howItWorksVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <h2 className="about-how-it-works__title">How It Works</h2>
        <div className="about-steps">
          <div className="about-step">
            <span className="about-step__number">1</span>
            <h3 className="about-step__title">Create Your Profile</h3>
            <p className="about-step__text">Build your professional profile once. We'll use it to match you with the right opportunities.</p>
          </div>
          <div className="about-step__connector"></div>
          <div className="about-step">
            <span className="about-step__number">2</span>
            <h3 className="about-step__title">Swipe Through Jobs</h3>
            <p className="about-step__text">Browse curated job listings tailored to your skills. Swipe right on roles that interest you.</p>
          </div>
          <div className="about-step__connector"></div>
          <div className="about-step">
            <span className="about-step__number">3</span>
            <h3 className="about-step__title">Apply Instantly</h3>
            <p className="about-step__text">One swipe sends your application. No cover letters, no lengthy forms.</p>
          </div>
          <div className="about-step__connector"></div>
          <div className="about-step">
            <span className="about-step__number">4</span>
            <h3 className="about-step__title">Track Your Progress</h3>
            <p className="about-step__text">Monitor all your applications in one place. Stay organized and follow up at the right time.</p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section 
        ref={securityRef}
        className={`about-section about-section--inverted ${securityVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <div className="about-section__content">
          <span className="about-section__number">02</span>
          <h2 className="about-section__title">Your Data, Protected</h2>
          <p className="about-section__text">
            Privacy isn't an afterthought—it's foundational. Your personal information and career data are 
            <strong> encrypted end-to-end</strong> using industry-leading security protocols. We never sell 
            your data or share it without explicit consent.
          </p>
          <div className="about-security-badges">
            <span className="about-security-badge">256-bit Encryption</span>
            <span className="about-security-badge">GDPR Compliant</span>
            <span className="about-security-badge">No Data Selling</span>
          </div>
        </div>
      </section>

      {/* Team/Values Section */}
      <section 
        ref={teamRef}
        className={`about-values ${teamVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <h2 className="about-values__title">Our Values</h2>
        <div className="about-values__grid">
          <div className="about-value">
            <h3 className="about-value__title">Simplicity</h3>
            <p className="about-value__text">Complex problems deserve elegant solutions. We strip away the unnecessary.</p>
          </div>
          <div className="about-value">
            <h3 className="about-value__title">Respect</h3>
            <p className="about-value__text">Your time matters. Every feature is designed to save it, not waste it.</p>
          </div>
          <div className="about-value">
            <h3 className="about-value__title">Transparency</h3>
            <p className="about-value__text">No hidden fees, no data tricks. What you see is what you get.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaRef}
        className={`about-cta ${ctaVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <h2 className="about-cta__title">Ready to find your next step?</h2>
        <p className="about-cta__text">Join thousands of professionals who've simplified their job search.</p>
        <div className="about-cta__actions">
          <button className="about-cta__btn about-cta__btn--primary" onClick={() => navigate('/login')}>
            Get Started Free
          </button>
          <button className="about-cta__btn about-cta__btn--secondary" onClick={() => navigate('/jobs')}>
            Browse Jobs
          </button>
        </div>
      </section>
    </div>
  );
};

export default About;
