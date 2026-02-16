import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useEffect, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";

function Root() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LoadingScreen />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(<Root />);
