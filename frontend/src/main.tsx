/**
 * File: index.tsx
 * Author: Areeba Abdullah
 *
 * Purpose: Entry point of the BizBot React application.
 *          Renders the root <App /> component into the DOM
 *          and includes global styles.
 */

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
