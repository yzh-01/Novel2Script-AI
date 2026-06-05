import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 剧本编辑器专用：让用户感觉在"创作"而非"写代码"
        script: {
          paper: "#faf8f0",    // 仿纸质底色
          ink: "#2c2416",      // 深棕墨色
          accent: "#8b5e3c",   // 暖棕强调
        },
      },
    },
  },
  plugins: [],
};

export default config;
