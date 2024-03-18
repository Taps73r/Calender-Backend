const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

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

const Event = mongoose.model("Event", {
  title: String,
  description: String,
  date: {
    year: Number,
    month: String,
    day: Number,
  },
});

const app = express();
app.use(express.json());

app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/events", async (req, res) => {
  const eventData = req.body;

  try {
    const event = new Event({
      title: eventData.title,
      description: eventData.description,
      date: {
        year: eventData.year,
        month: eventData.month,
        day: eventData.day,
      },
    });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/events/:year/:month", async (req, res) => {
  const { year, month } = req.params;

  const validMonthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (!validMonthNames.includes(month)) {
    return res.status(400).send("Некоректне значення місяця");
  }

  const daysInMonth = new Date(
    year,
    validMonthNames.indexOf(month) + 1,
    0
  ).getDate();

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const firstDayIndex = new Date(
    year,
    validMonthNames.indexOf(month),
    1
  ).getDay();
  let startDayIndex = (firstDayIndex + 6) % 7;

  const prevMonthLastDay = new Date(
    year,
    validMonthNames.indexOf(month),
    0
  ).getDate();
  const daysFromPrevMonth = startDayIndex;

  const prevMonthDays = Array.from({ length: daysFromPrevMonth }, (_, i) => ({
    day: prevMonthLastDay - (daysFromPrevMonth - i - 1),
    dayOfWeek: dayNames[(firstDayIndex - daysFromPrevMonth + i + 7) % 7],
  }));

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    dayOfWeek: dayNames[(firstDayIndex + i) % 7],
  }));

  const response = {
    year: parseInt(year),
    month: month,
    days: [...prevMonthDays, ...currentMonthDays],
  };

  res.json(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
