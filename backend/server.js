import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGO)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));


const UserSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const User = mongoose.model("User", UserSchema);



app.get('/', (req, res) => {
  res.send('Server Home');
});



app.listen(PORT, () => {
  console.log(`Server is running on  http://localhost:${PORT}`);
});