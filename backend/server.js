import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGO_URI;

app.use(express.json());

mongoose
  .connect(MONGO)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));


const UserSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const User = mongoose.model("User", UserSchema);

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/*app.post("/users", async (req, res) => {
  try {
    const { name } = req.body;
    const user = new User({ name });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: "Error creating user" });
  }
});*/


app.listen(PORT, () => {
  console.log(`Server is running on  http://localhost:${PORT}`);
});