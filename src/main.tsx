import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

type TelegramWebApp = { ready: () => void; expand: () => void };

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const telegram = window.Telegram?.WebApp;
telegram?.ready();
telegram?.expand();

document.documentElement.style.setProperty("--telegram-safe-top", "env(safe-area-inset-top)");
document.documentElement.style.setProperty("--telegram-safe-bottom", "env(safe-area-inset-bottom)");

createRoot(document.getElementById("root")!).render(<App />);
