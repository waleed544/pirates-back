import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import cors from "cors";
import bcrypt, { compareSync } from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 5000;
const saltRounds = 10;
env.config();

app.use(
  cors({
    origin: "http://localhost:3000", // React dev server URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

async function addNewUser(username, password) {
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const result = await db.query(
    "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
    [username, hashedPassword]
  );
  return result;
}

app.get("/auth/check", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.get("/", (req, res) => {
  res.json({
    name: "walid",
  });
});

// Start Google OAuth login
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

// Google OAuth callback URL
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login", // redirect on failure
    successRedirect: "http://localhost:3000/", // redirect frontend on success
  })
);

// app.post('/login',
//   passport.authenticate('local', {
//     successRedirect: 'http://localhost:3000/SignUp',         // Or your React frontend URL
//     failureRedirect: '/login',    // Or send JSON error response
//     failureFlash: false           // If you want flash messages
//   })
// );

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user)
      return res.status(401).json({ message: info.message || "Login failed" });

    req.login(user, (err) => {
      if (err) return next(err);
      return res.json({ message: "Login successful", user });
    });
  })(req, res, next);
});

// app.get('/login', (req, res) => {
//   res.status(401).json({ message: 'Login failed. Please try again.' });
// });

app.post("/signup", async (req, res,next) => {
  const username = req.body.user_name;
  const password = req.body.pass_word;
  console.log(username, password);
  try {
    const userexist = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    console.log("userexist"+userexist.rows);

    if (userexist.rows.length > 0) {
      return res.json("duplicate user");
       console.log("rows >=0");
    } else {
      console.log("rows <=0");
      const result = await addNewUser(username, password);
      // console.log(result.rows);
           const newUser = result.rows[0];

            req.login(newUser, (err) => {
            if (err) {
            console.error("Login error after signup:", err);
           return next(err);
          }
        // Now session is authenticated, send success response
        return res.json("successful");
      });
    
    }
  } catch (err) {
    console.log(err);
   return res.json("Success");
  }
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      console.log("in local");
      const result = await db.query("SELECT * FROM users WHERE username = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          }
          if (valid) {
            // User authenticated, cache session here by calling cb(null, user)
            console.log("valid");
            return cb(null, user);
          } else {
            // Password invalid
            console.log(" not validvalid");
            return cb(null, false, { message: "Incorrect password." });
          }
        });
      } else {
        // User not found
        console.log("not valid valid");
        return cb(null, false, { message: "User not found." });
      }
    } catch (err) {
      console.error(err);
      console.log("not valid valid");
      return cb(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rowCount == 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
// passport.serializeUser((user, cb) => {
//   cb(null, user);
// });

// passport.deserializeUser((user, cb) => {
//   cb(null, user);
// });

passport.serializeUser((user, done) => {
  done(null, user.id); // or user.username if id is not available
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(null, false);
    }
  } catch (err) {
    done(err);
  }
});

app.listen(port, (req, res) => {
  console.log(`server started at port ${port}`);
});
