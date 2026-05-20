import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initTheme } from "./theme";
import "./styles.css";
import "./courier-styles.css";
import "./edit-route.css";
import "./mobile-driver.css";
import "./map-fullscreen.css";
import "./edit-stop-sheet.css";
import "./swipe-stop.css";
import "./workflow-confirm.css";

initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
