// File: /src/pages/Home.js
import React, {useContext, useEffect} from 'react';
import { useNavigate } from "react-router-dom";
import Swipe from '../components/Swipe';
import '../styles/Home.css';
import { TokenContext } from "../components/TokenContext";
import jwt_decode from 'jwt-decode';
import useScrollAnimation from '../utils/useScrollAnimation';


const Home = () => {
  const { token } = useContext(TokenContext);
  const navigate = useNavigate();

  // Scroll animation refs (only used for non-logged-in users)
  const [featuresRef, featuresVisible] = useScrollAnimation({ threshold: 0.2 });
  const [statsRef, statsVisible] = useScrollAnimation({ threshold: 0.2 });
  const [ctaRef, ctaVisible] = useScrollAnimation({ threshold: 0.2 });


  const handleSignInClick = () => {
    navigate("/login");
  };

  const handleBrowseClick = () => {
    navigate("/jobs");
  };

  // Logged-in users get a clean swipe-only experience
  if (token) {
    return (
      <div className="home-container home-container--logged-in">
        <section className="home-swipe-section home-swipe-section--full">
          <Swipe />
        </section>
      </div>
    );
  }
  
  // Non-logged-in users see the marketing landing page
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero__content">
          <h1 className="home-hero__title">NextStep</h1>
          <p className="home-hero__subtitle">Your next career move, simplified.</p>
          <div className="home-hero__actions">
            <button className="home-hero__btn home-hero__btn--primary" onClick={handleSignInClick}>
              Get Started
            </button>
            <button className="home-hero__btn home-hero__btn--secondary" onClick={handleBrowseClick}>
              Browse Jobs
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        ref={featuresRef} 
        className={`home-features ${featuresVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <div className="home-features__grid">
          <div className="home-feature">
            <span className="home-feature__number">01</span>
            <h3 className="home-feature__title">Swipe to Apply</h3>
            <p className="home-feature__text">Browse jobs effortlessly. Swipe right to apply, left to pass. It's that simple.</p>
          </div>
          <div className="home-feature">
            <span className="home-feature__number">02</span>
            <h3 className="home-feature__title">Track Progress</h3>
            <p className="home-feature__text">Keep all your applications organized in one place. Never lose track of an opportunity.</p>
          </div>
          <div className="home-feature">
            <span className="home-feature__number">03</span>
            <h3 className="home-feature__title">AI-Powered</h3>
            <p className="home-feature__text">Smart recommendations based on your skills and preferences. Find the perfect match.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        ref={statsRef} 
        className={`home-stats ${statsVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <div className="home-stats__grid">
          <div className="home-stat">
            <span className="home-stat__number">500+</span>
            <span className="home-stat__label">Active Jobs</span>
          </div>
          <div className="home-stat">
            <span className="home-stat__number">200+</span>
            <span className="home-stat__label">Companies</span>
          </div>
          <div className="home-stat">
            <span className="home-stat__number">10k+</span>
            <span className="home-stat__label">Applications</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaRef} 
        className={`home-cta ${ctaVisible ? 'animate-in' : 'animate-hidden'}`}
      >
        <h2 className="home-cta__title">Ready to take the next step?</h2>
        <p className="home-cta__text">Join thousands of professionals finding their dream jobs.</p>
        <button className="home-cta__btn" onClick={handleSignInClick}>
          Start Now — It's Free
        </button>
      </section>
    </div>
  );
};

export default Home;
