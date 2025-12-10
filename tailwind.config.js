/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palet warna khusus Waste of Change
        woc: {
          dark: '#0f172a',      // Latar belakang utama (Dark Blue/Black)
          darker: '#020617',    // Latar belakang komponen card/sidebar
          tosca: '#80EF80',     // Warna utama (Teal/Tosca)
          toscaHover: '#58c758ff',// Warna tosca saat di-hover
          text: '#f1f5f9',      // Warna teks utama (hampir putih)
          muted: '#94a3b8'      // Warna teks sekunder (abu-abu)
        }
      }
    },
  },
  plugins: [],
}

// #00FFFF
// #14b8a6