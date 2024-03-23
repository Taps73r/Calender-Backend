const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  description: String,
  date: {
    year: Number,
    month: String,
    day: Number,
  },
  color: String,
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
