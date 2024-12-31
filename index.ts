import "dotenv/config";
const express = require("express");
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { usersTable } from "./src/db/schema/users";
import { blogsTable } from "./src/db/schema/blogs";
const session = require("express-session");
import cookieParser from "cookie-parser";
const passport = require("passport");
const cors = require("cors");

var LocalStrategy = require("passport-local");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const jwt = require("jsonwebtoken");

const SECRET = process.env.SECRET;

const app = express();
app.use(cors());

const db = drizzle(process.env.DATABASE_URL!);

app.use(express.json());
app.use(cookieParser("lol"));
app.use(
  session({
    secret: "lolol",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60000 * 60,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await db.select().from(usersTable).where(eq(usersTable.id, jwt_payload.id));
      if (user.length) {
        return done(null, user[0]);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);

// passport.use(
//   new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
//     console.log(`${email}`);
//     console.log(`${password}`);
//     try {
//       db.select()
//         .from(usersTable)
//         .where(eq(usersTable.email, email))
//         .then(function (user) {
//           console.log(user);
//           if (user.length == 0) return done(null, false);
//           if (user[0].password !== password) return done(null, false);
//           return done(null, { id: user[0].id });
//         });
//     } catch (error) {
//       return done(error, null);
//     }
//   })
// );

// passport.serializeUser(function (user, done) {
//   process.nextTick(function () {
//     done(null, { id: user.id });
//   });
// });

// passport.deserializeUser(function (user, done) {
//   process.nextTick(function () {
//     return done(null, user);
//   });
// });

app.get("/blogs", async (req, res) => {
  try {
    const blogs = await db.select().from(blogsTable);
    console.log(blogs);
    res.json({
      blogs: blogs,
    });
  } catch (error) {
    console.error(error.message);
    res.json({
      msg: "Couldn't get blogs\n",
    });
  }
});

app.post("/signup", async (req, res) => {
  const user: typeof usersTable.$inferInsert = {
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
  };
  try {
    await db.insert(usersTable).values(user);
    res.json({
      msg: "You are now a user. Welcum!",
    });
  } catch (error) {
    res.json({
      msg: "Couldn't signup",
    });
  }
});

app.post("/api/auth", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (user.length === 0 || user[0].password !== password) {
      return res.status(401).json({ msg: "Invalid credentials", success: false });
    }
    const token = jwt.sign({ id: user[0].id }, SECRET, { expiresIn: '1h' });
    res.json({ token: token, success: true, id: user[0].id });
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

app.get("/failed", (req, res) => {
  res.json({
    success: false,
  });
});

app.get("/success", (req, res) => {
  res.json({
    success: true
  });
});

function checkAuthenticated(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err || !user) {
      return res.status(401).json({ msg: "You are not authenticated", success: false });
    }
    req.user = user;
    next();
  })(req, res, next);
}

app.use(checkAuthenticated);

app.get("/api/status", async (req, res) => {
  res.json({
    success: true,
  });
});

app.post("/blog", async (req, res) => {
  try {
    const blog: typeof blogsTable.$inferInsert = {
      title: req.body.title,
      content: req.body.content,
      owner_id: req.user.id,
    };

    await db.insert(blogsTable).values(blog);
    res.json({
      msg: "Successfully added",
    });
  } catch (error) {
    console.error(error.message);
    res.json({
      msg: "Couldn't add blog\n",
    });
  }
});

app.put("/blog/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const title = req.body.title;
    const content = req.body.content;
    await db
      .update(blogsTable)
      .set({
        title: title,
        content: content,
      })
      .where(eq(blogsTable.id, id));
    res.json({
      msg: "Blog updated",
    });
  } catch (error) {
    console.error(error.message);
    res.json({
      msg: "Couldn't update blog\n",
    });
  }
});

app.delete("/blog/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.delete(blogsTable).where(eq(blogsTable.id, id));
    res.json({
      msg: "Blog deleted",
    });
  } catch (error) {
    console.error(error.message);
    res.json({
      msg: "Couldn't delete blog\n",
    });
  }
});

app.delete("/logout", (req, res, next) => {
   req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
   });
});

const PORT = process.env.PORT || 3000;

app.listen(3000, () => {
  console.log(`Server is running on port ${PORT}`);
});
