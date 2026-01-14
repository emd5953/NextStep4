// File: /src/TokenContext.js
import React, { createContext, useState, useEffect } from "react";

export const TokenContext = createContext();

export const TokenProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem("email", email);
    localStorage.setItem("name", name);
  }, [name, email]);

  const triggerProfileUpdate = () => {
    setProfileUpdateTrigger(prev => prev + 1);
  };

  return (
    <TokenContext.Provider
      value={{ 
        token, 
        setToken, 
        name,
        email,
        setName,
        setEmail,
        profileUpdateTrigger,
        triggerProfileUpdate 
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};
