import { Recycle } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-woc-dark flex flex-col items-center justify-center text-woc-tosca">
      <Recycle className="w-12 h-12 animate-spin mb-4" />
      <p className="text-white text-sm font-medium animate-pulse">Memuat Waste of Change...</p>
    </div>
  );
}