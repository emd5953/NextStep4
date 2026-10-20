import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { TokenProvider } from "./components/TokenContext";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(

    <TokenProvider>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </TokenProvider>

);