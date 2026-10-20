import React, { useState, useEffect, useContext } from "react";
import "../styles/Login.css";
import { useNavigate } from "react-router-dom";
import { TokenContext } from "../components/TokenContext";
import { getSupabase, getAuthConfig } from "../services/supabase";
import NotificationBanner from "../components/NotificationBanner";

const Login = () => {
  // ======================
  // Error state
  // ======================
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  useEffect(() => { getAuthConfig().then(config => setGoogleEnabled(config.googleEnabled)).catch(() => {}); }, []);

  // ======================
  // Login form state
  // ======================
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // ======================
  // Sign up form state
  // ======================
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // ======================
  // Context & Navigation
  // ======================
  const navigate = useNavigate();
  const { token } =
    useContext(TokenContext);

  // If a token already exists, redirect to home
  useEffect(() => {
    if (token) {
      navigate("/");
    }
  }, [token, navigate]);

  // ======================
  // Login Submit
  // ======================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const loginData = { email: loginEmail, password: loginPassword };

      const { error } = await (await getSupabase()).auth.signInWithPassword(loginData);
      if (error) throw error;
      navigate("/");
    } catch (err) {
      setError(err.message || "An error occurred during login");
    }
  };

  // ======================
  // Sign Up Submit
  // ======================
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const signupData = {
      full_name: signupName,
      phone: signupPhone,
      email: signupEmail,
      password: signupPassword,
    };

    try {
      const { error } = await (await getSupabase()).auth.signUp({ email: signupData.email, password: signupData.password, options: { emailRedirectTo: window.location.origin + "/login", data: { full_name: signupData.full_name, phone: signupData.phone } } });
      if (error) throw error;
      setMessage("Account created. Please check your email for verification instructions.");
      // Clear form
      setSignupName("");
      setSignupPhone("");
      setSignupEmail("");
      setSignupPassword("");
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setError(error.response.data.error);
      } else {
        setError(error.message || 'Could not create your account.');
      }
    }
  };

  // ======================
  // Google OAuth (Login/Signup)
  // ======================
  const handleGoogleSuccess = async () => {
    try {
      const { error } = await (await getSupabase()).auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: window.location.origin + '/login' }
      });
      if (error) throw error;
    } catch (err) { setError(err.message || 'Google sign-in is not configured yet. Use email to sign in.'); }
  };
  const handlePasswordReset = async e => {
    e.preventDefault();
    if (!loginEmail) return setError('Enter your email above first.');
    try {
      const { error } = await (await getSupabase()).auth.resetPasswordForEmail(loginEmail, { redirectTo: window.location.origin + '/reset-password' });
      if (error) throw error;
      setMessage('Check your email for a password reset link.');
    } catch (err) { setError(err.message); }
  };

  // ======================
  // JSX Return
  // ======================
  return (
    <div className="login-page">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      <div className="login-section">
        <div className="container-fluid">
          <div className="row no-gutters full-height justify-content-center">
            <div className="col-12 text-center align-self-center">
              <div className="login-section pb-5 pt-5 pt-sm-2 text-center">
                {/* Toggle Title */}
                <h6 className="mb-0 pb-3">
                  <span>Log In </span>
                  <span>Sign Up</span>
                </h6>

                {/* This single checkbox toggles the 3D card (front/back) */}
                <input
                  className="login-checkbox"
                  type="checkbox"
                  id="reg-log"
                  name="reg-log"
                />
                <label htmlFor="reg-log"></label>

                {/* 3D Card Container */}
                <div className="login-card-3d-wrap mx-auto">
                  <div className="login-card-3d-wrapper">
                    {/* =================== */}
                    {/* Card Front – Login */}
                    {/* =================== */}
                    <div className="login-card-front">
                      <div className="login-center-wrap">
                        <div className="login-section-content text-center">
                          <h4 className="login-form-title">Welcome Back</h4>

                          {/* Google Login Button */}
                          {googleEnabled && <div className="social-login">
                            <button type="button" className="login-btn" onClick={handleGoogleSuccess}>Continue with Google</button>
                          </div>}

                          {googleEnabled && <div className="divider">or continue with email</div>}

                          {/* Login Form */}
                          <form onSubmit={handleLoginSubmit}>
                            <div className="login-form-group">
                              <input
                                type="email"
                                className="login-form-input"
                                placeholder="Email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-at"></i>
                            </div>
                            <div className="login-form-group">
                              <input
                                type="password"
                                className="login-form-input"
                                placeholder="Password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-lock-alt"></i>
                            </div>

                            {/* Login Button */}
                            <button type="submit" className="login-btn">
                              Sign In
                            </button>
                          </form>

                          {/* Forgot Password Link */}
                          <p className="helper-text">
                            <a href="#reset" className="link" onClick={handlePasswordReset}>
                              Forgot your password?
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* End Card Front */}

                    {/* =================== */}
                    {/* Card Back – Sign Up */}
                    {/* =================== */}
                    <div className="login-card-back">
                      <div className="login-center-wrap">
                        <div className="login-section-content text-center">
                          <h4 className="login-form-title">Create Account</h4>

                          {/* Google Sign Up Button */}
                          {googleEnabled && <div className="social-login">
                            <button type="button" className="login-btn" onClick={handleGoogleSuccess}>Continue with Google</button>
                          </div>}

                          {googleEnabled && <div className="divider">or sign up with email</div>}

                          {/* Sign Up Form */}
                          <form onSubmit={handleSignupSubmit}>
                            <div className="login-form-group">
                              <input
                                type="text"
                                className="login-form-input"
                                placeholder="Full Name"
                                value={signupName}
                                onChange={(e) => setSignupName(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-user"></i>
                            </div>

                            <div className="login-form-group">
                              <input
                                type="tel"
                                className="login-form-input"
                                placeholder="Phone Number"
                                value={signupPhone}
                                onChange={(e) => setSignupPhone(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-phone"></i>
                            </div>

                            <div className="login-form-group">
                              <input
                                type="email"
                                className="login-form-input"
                                placeholder="Email"
                                value={signupEmail}
                                onChange={(e) => setSignupEmail(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-at"></i>
                            </div>

                            <div className="login-form-group">
                              <input
                                type="password"
                                className="login-form-input"
                                placeholder="Password"
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-lock-alt"></i>
                            </div>

                            <button type="submit" className="login-btn">
                              Create Account
                            </button>
                          </form>

                          <p className="helper-text">
                            By signing up, you agree to our{" "}
                            <a href="#!" className="link">Terms</a> and{" "}
                            <a href="#!" className="link">Privacy Policy</a>
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* End Card Back */}
                  </div>
                </div>
                {/* End 3D Card Container */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;