const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const validToken = require("./security/validToken");

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

const User = mongoose.model("User", {
  email: String,
  password: String,
});

const Event = mongoose.model("Event", {
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

const app = express();
app.use(express.json());
app.use(cors());

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, "your_secret_key", {
      expiresIn: "1h",
    });

    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, "your_secret_key", {
      expiresIn: "1h",
    });

    res.json({ token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/events", validToken, async (req, res) => {
  const { title, description, color, date } = req.body;
  const userId = req.userId;

  try {
    const existingEvent = await Event.findOne({
      userId: userId,
      "date.year": date.year,
      "date.month": date.month,
      "date.day": date.day,
    });

    if (existingEvent) {
      return res
        .status(400)
        .json({ message: "Event already exists for this date" });
    }

    const event = new Event({
      userId: userId,
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

app.get("/events/:year/:month", validToken, async (req, res) => {
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
      event: null,
    }));

    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayOfWeek = dayNames[(firstDayIndex + i) % 7];
      return {
        day,
        month,
        year: parseInt(year),
        dayOfWeek,
        event: null,
      };
    });

    events.forEach((event) => {
      currentMonthDays.forEach((day) => {
        if (
          day.year === event.date.year &&
          day.month === event.date.month &&
          day.day === event.date.day &&
          !day.event
        ) {
          day.event = {
            id: event._id,
            title: event.title,
            description: event.description,
            color: event.color,
          };
        }
      });
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

app.delete("/events/:eventId", validToken, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.userId;

  try {
    const event = await Event.findOneAndDelete({
      _id: eventId,
      userId: userId,
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.put("/events/:eventId", validToken, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.userId;
  const { title, description, color, date } = req.body;

  try {
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        userId: userId,
      },
      {
        title: title,
        description: description,
        color: color,
        date: {
          year: date.year,
          month: date.month,
          day: date.day,
        },
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const eventData = {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      color: event.color,
    };

    const response = {
      day: date.day,
      month: date.month,
      year: date.year,
      dayOfWeek: date.dayOfWeek,
      event: eventData,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
