import connectDB from "./db/index.js";
import dotenv from "dotenv";
import express from "express";
const app = express();

dotenv.config({
  path: "./.env",
});

connectDB();
