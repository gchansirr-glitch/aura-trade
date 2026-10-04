import logoImg from "@/assets/logo.png";

const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-12",
    md: "h-20",
    lg: "h-32",
  };

  return (
    <img 
      src={logoImg} 
      alt="AURA TRADE" 
      className={`${sizeClasses[size]} w-auto`}
    />
  );
};

export default Logo;
