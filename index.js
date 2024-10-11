const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, { dbName: "fcc-backend" });

// import Models
const { Exercise, User } = require("./schemas/schemas");

// middleware
app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// create mongoose Models

// list all users in an array
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// create new user
app.post("/api/users", async (req, res) => {
  const user = new User({ username: req.body.username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// MIDDLEWARE: Get user from queried ID
const fetchUser = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.locals.user = user;
  next();
};

// log exercise to user
app.post("/api/users/:id/exercises", fetchUser, async (req, res) => {
  let date = new Date();
  if (req.body.date != null) {
    date = new Date(req.body.date)
  }
  const exercise = new Exercise({
    userId: req.params.id,
    description: req.body.description,
    duration: Number(req.body.duration),
    date: date,
  });
  await exercise.save();
  res.json({
    username: res.locals.user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: new Date(exercise.date).toDateString(),
    _id: res.locals.user._id,
  });
});

// get all exercise logs that belong to a user
app.get("/api/users/:id/logs", fetchUser, async (req, res) => {
  const query = Exercise.find(
    { userId: res.locals.user._id },
    "-_id description duration date"
  );

  if (req.query.limit) {
    query.limit(parseInt(req.query.limit))
  }
  if (req.query.from) {
    query.where('date').gte(new Date(req.query.from))
  }
  if (req.query.to) {
    query.where('date').lte(new Date(req.query.to))
  }
  try {
    const logs = await query.exec();
    const newLogs = logs.map(log => {
      return {
        description: log.description,
        duration: log.duration,
        date: log.date.toDateString()
      }
    })
    const count = logs.length;
  
    res.json({
      username: res.locals.user.username,
      count: count,
      _id: res.locals.user._id,
      log: newLogs,
    });
  } catch (error) {
    console.error(error)
  }

});

// port setup
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
