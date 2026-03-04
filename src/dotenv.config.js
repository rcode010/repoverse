import { config } from "dotenv";

config({path:".env"})

export const {VITE_GITHUB_TOKEN} = process.env