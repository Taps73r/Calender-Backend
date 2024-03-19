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
  color: String,
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
  const { title, description, color, date } = req.body;

  try {
    const event = new Event({
      title: title,
      description: description,
      date: {
        year: date.year,
        month: date.month,
        day: date.day,
        dayOfWeek: date.dayOfWeek,
      },
      color: color,
    });

    await event.save();

    const eventData = {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      color: event.color,
    };

    // Повертаємо об'єкт з днем та подією
    const response = {
      day: date.day,
      month: date.month,
      year: date.year,
      dayOfWeek: date.dayOfWeek,
      event: eventData,
    };

    res.status(201).json(response);
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
    return res.status(400).send("Invalid month value");
  }

  try {
    // Отримуємо всі події для вказаного року та місяця
    const events = await Event.find({
      "date.year": parseInt(year),
      "date.month": month,
    });

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
      month:
        month === "January"
          ? validMonthNames[validMonthNames.length - 1]
          : validMonthNames[(validMonthNames.indexOf(month) - 1 + 12) % 12],
      year: month === "January" ? parseInt(year) - 1 : parseInt(year),
      dayOfWeek: dayNames[(firstDayIndex - daysFromPrevMonth + i + 7) % 7],
      events: [], // Пустий масив подій для кожного дня
    }));

    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayOfWeek = dayNames[(firstDayIndex + i) % 7];
      const eventsForDay = events.filter(
        (event) => event.date.day === day && event.date.month === month
      );
      return {
        day,
        month,
        year: parseInt(year),
        dayOfWeek,
        events: eventsForDay, // Події для кожного дня
      };
    });

    const response = {
      year: parseInt(year),
      month,
      days: [...prevMonthDays, ...currentMonthDays],
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
