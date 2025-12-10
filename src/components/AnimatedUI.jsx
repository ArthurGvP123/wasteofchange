import { motion } from "framer-motion";

export const PageTransition = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

export const Button = ({ children, onClick, disabled, variant = "primary", className, type="button" }) => {
  const baseStyle = "w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 relative overflow-hidden";
  const variants = {
    primary: "bg-woc-tosca text-woc-darker hover:bg-woc-toscaHover hover:shadow-[0_0_15px_rgba(20,184,166,0.5)]",
    outline: "bg-transparent border border-slate-700 text-woc-text hover:bg-slate-800",
    danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </motion.button>
  );
};