const express = require("express");
const Event = require("../schema/Event.schema");
const validToken = require("../security/validToken");
const axios = require("axios");
const { dayNames, validMonthNames } = require("../static/filterData");

const router = express.Router();

router.post("/events", validToken, async (req, res) => {
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

    const countryCode = "UA";
    const holidaysResponse = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${date.year}/${countryCode}`
    );
    const holidays = holidaysResponse.data;
    let holiday = null;
    for (const holidayData of holidays) {
      const holidayDate = new Date(holidayData.date);
      if (
        holidayDate.getFullYear() === date.year &&
        holidayDate.getMonth() === validMonthNames.indexOf(date.month) &&
        holidayDate.getDate() === date.day
      ) {
        holiday = {
          id: holidayData.name,
          title: holidayData.localName,
          description: holidayData.name,
          color: "#ffb3c1",
          date: {
            year: holidayDate.getFullYear(),
            month: validMonthNames[holidayDate.getMonth()],
            day: holidayDate.getDate(),
          },
        };
        break;
      }
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
      holiday: holiday,
    };

    res.status(201).json(response);
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/events/:year/:month", validToken, async (req, res) => {
  const { year, month } = req.params;
  const userId = req.userId;

  if (!validMonthNames.includes(month)) {
    return res.status(400).send("Invalid month value");
  }

  try {
    const events = await Event.find({
      userId: userId,
      "date.year": parseInt(year),
      "date.month": month,
    });

    const countryCode = "UA";
    const holidaysResponse = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`
    );
    const holidays = holidaysResponse.data;
    const daysInMonth = new Date(
      year,
      validMonthNames.indexOf(month) + 1,
      0
    ).getDate();

    const firstDayIndex = new Date(
      year,
      validMonthNames.indexOf(month),
      1
    ).getDay();

    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayOfWeek = dayNames[(firstDayIndex + i) % 7];
      return {
        day,
        month,
        year: parseInt(year),
        dayOfWeek,
        event: null,
        holiday: null,
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
            date: event.date,
          };
        }
      });
    });
    holidays.forEach((holiday) => {
      const holidayDate = new Date(holiday.date);
      currentMonthDays.forEach((day) => {
        const dayDate = new Date(
          day.year,
          validMonthNames.indexOf(day.month),
          day.day
        );
        if (holidayDate.toDateString() === dayDate.toDateString()) {
          day.holiday = {
            id: holiday.name,
            title: holiday.localName,
            description: holiday.name,
            color: "#ffb3c1",
            date: {
              year: holidayDate.getFullYear(),
              month: validMonthNames[holidayDate.getMonth()],
              day: holidayDate.getDate(),
            },
          };
        }
      });
    });

    const response = {
      year: parseInt(year),
      month,
      days: [...currentMonthDays],
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.delete("/events/:eventId", validToken, async (req, res) => {
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

router.put("/events/:eventId", validToken, async (req, res) => {
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

    const eventDate = new Date(
      date.year,
      dayNames.indexOf(date.month),
      date.day
    );
    const dayOfWeek = dayNames[eventDate.getDay()];

    const countryCode = "UA";
    const holidaysResponse = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${date.year}/${countryCode}`
    );
    const holidays = holidaysResponse.data;

    let holiday = null;
    for (const holidayData of holidays) {
      const holidayDate = new Date(holidayData.date);
      if (
        holidayDate.getFullYear() === date.year &&
        holidayDate.getMonth() === validMonthNames.indexOf(date.month) &&
        holidayDate.getDate() === date.day
      ) {
        holiday = {
          id: holidayData.name,
          title: holidayData.localName,
          description: holidayData.name,
          color: "#ffb3c1",
          date: {
            year: holidayDate.getFullYear(),
            month: validMonthNames[holidayDate.getMonth()],
            day: holidayDate.getDate(),
          },
        };
        break;
      }
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
      dayOfWeek: dayOfWeek,
      event: eventData,
      holiday: holiday,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/events/:title", validToken, async (req, res) => {
  const { title } = req.params;
  const userId = req.userId;

  try {
    const event = await Event.findOne({ title, userId });
    if (!event) {
      return res.status(404).send("Event not found");
    }

    const { year, month } = event.date;

    const events = await Event.find({
      userId: userId,
      "date.year": parseInt(year),
      "date.month": month,
    });

    const daysInMonth = new Date(
      year,
      validMonthNames.indexOf(month) + 1,
      0
    ).getDate();

    const firstDayIndex = new Date(
      year,
      validMonthNames.indexOf(month),
      1
    ).getDay();

    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayOfWeek = dayNames[(firstDayIndex + i) % 7];
      return {
        day,
        month,
        year: parseInt(year),
        dayOfWeek,
        event: null,
        holiday: null,
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
            date: event.date,
          };
        }
      });
    });

    const countryCode = "UA";
    const holidaysResponse = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`
    );
    const holidays = holidaysResponse.data;

    holidays.forEach((holiday) => {
      const holidayDate = new Date(holiday.date);
      currentMonthDays.forEach((day) => {
        const dayDate = new Date(
          day.year,
          validMonthNames.indexOf(day.month),
          day.day
        );
        if (holidayDate.toDateString() === dayDate.toDateString()) {
          day.holiday = {
            id: holiday.name,
            title: holiday.localName,
            description: holiday.name,
            color: "#ffb3c1",
            date: {
              year: holidayDate.getFullYear(),
              month: validMonthNames[holidayDate.getMonth()],
              day: holidayDate.getDate(),
            },
          };
        }
      });
    });

    const response = {
      year: parseInt(year),
      month,
      days: [...currentMonthDays],
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching events by title:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.put("/events/update-date/:eventId", validToken, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.userId;
  const { newDate } = req.body;
  try {
    const existingEvent = await Event.findOne({
      userId: userId,
      "date.year": newDate.year,
      "date.month": newDate.month,
      "date.day": newDate.day,
      _id: { $ne: eventId },
    });

    if (existingEvent) {
      return res
        .status(400)
        .json({ message: "User already has an event for this date" });
    }
    const countryCode = "UA";
    const holidaysResponse = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${newDate.year}/${countryCode}`
    );
    const holidays = holidaysResponse.data;
    let holiday = null;
    for (const holidayData of holidays) {
      const holidayDate = new Date(holidayData.date);
      if (
        holidayDate.getFullYear() === newDate.year &&
        holidayDate.getMonth() === validMonthNames.indexOf(newDate.month) &&
        holidayDate.getDate() === newDate.day
      ) {
        holiday = {
          id: holidayData.name,
          title: holidayData.localName,
          description: holidayData.name,
          color: "#ffb3c1",
          date: {
            year: holidayDate.getFullYear(),
            month: validMonthNames[holidayDate.getMonth()],
            day: holidayDate.getDate(),
          },
        };
        break;
      }
    }

    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        userId: userId,
      },
      {
        date: newDate,
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const eventDate = new Date(
      newDate.year,
      dayNames.indexOf(newDate.month),
      newDate.day
    );
    const dayOfWeek = dayNames[eventDate.getDay()];

    const eventData = {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      color: event.color,
    };

    const response = {
      day: newDate.day,
      month: newDate.month,
      year: newDate.year,
      dayOfWeek: dayOfWeek,
      event: eventData,
      holiday: holiday,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error updating event date:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
