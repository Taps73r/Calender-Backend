const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const eventRoutes = require("./routes/Event.route");
const userRoutes = require("./routes/User.route");

mongoose
  .connect(
    "mongodb+srv://povroznykmisha:21tlVdh2i9nRrSnV@cluster0.lybxshq.mongodb.net/?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

const app = express();
app.use(express.json());
app.use(cors());

app.use("", userRoutes);
app.use("", eventRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
