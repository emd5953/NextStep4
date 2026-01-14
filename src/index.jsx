import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { TokenProvider } from "./components/TokenContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Get Client ID from environment variable
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Debug log
console.log("Using Google Client ID:", clientId);

if (!clientId) {
  console.error("VITE_GOOGLE_CLIENT_ID is not set in .env file!");
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <GoogleOAuthProvider clientId={clientId}>
    <TokenProvider>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </TokenProvider>
  </GoogleOAuthProvider>
);