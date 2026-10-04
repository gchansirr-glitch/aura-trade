import { useState, useEffect } from "react";
import Logo from "@/components/Logo";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="animate-scale-in">
        <Logo size="lg" />
      </div>
      <div className="mt-8 h-0.5 w-16 bg-foreground animate-fade-in" style={{ animationDelay: "0.5s" }} />
    </div>
  );
};

export default SplashScreen;
