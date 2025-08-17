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
import multer from "multer";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
var backslash = "\\";
const __dirname = dirname(fileURLToPath(import.meta.url));
// const uploadpath = `${dirname}${backslash}public${backslash}uploads`;
const deletepath = `${__dirname}${backslash}public${backslash}uploads${backslash}`;

const app = express();
const port = 5000;
const saltRounds = 10;
env.config();
// Serve uploaded files from public/uploads
app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

//config

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const uniquesuffux = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniquesuffux + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

//functions

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

//users

async function addNewUser(username, password) {
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const result = await db.query(
    "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
    [username, hashedPassword]
  );
  return result;
}

//posts func
async function addPost(title, content, imgurl, userid) {
  const result = await db.query(
    `insert into posts (title,content,img_url,user_id) values ('${title}','${content}','${imgurl}',${userid}) RETURNING *;`
  );
  if (result.rows.length > 0) return result.rows[0].id;
  else return 0;
}

async function deletePost(id) {
  const result = await db.query(`delete from posts where id=${id}`);
  return 1;
}

async function editPost(id, newimgurl, newtitle, newcontent) {
  const result = await db.query(
    `update posts set img_url='${newimgurl}' ,title='${newtitle}' ,content='${newcontent}'where id=${id}  RETURNING *`
  );
  if (result.rows.length > 0) return 1;
  else return 0;
}

async function getUserPosts(id) {
  const result = await db.query(
    `select img_url,title,content,id from posts where user_id=${id} order by id Asc`
  );
  console.log("from func" + JSON.stringify(result.rows));
  if (result.rowCount > 0) {
    return result.rows;
  } else {
    return 0;
  }
}

async function getUrlByID(id) {
  const reult = await db.query(`select img_url from posts where id=${id}`);
  console.log("img url is" + reult.rows[0]);
  return reult.rows[0].img_url;
}
async function addUserInfo(
  name,
  phone,
  email,
  age,
  profPicUrl,
  coverPicUrl,
  userId
) {
  const result = await db.query(
    `insert into info (name,age,phone,email,profilepic_url,coverpic_url,user_id) values('${name}',${age},'${phone}','${email}','${profPicUrl}','${coverPicUrl}',${userId})  RETURNING *`
  );
  console.log("in add info func" + result.rows[0]);
  if (result.rows.length > 0) {
    return result.rows[0];
  } else return -1;
}

async function getUserIInfo(userId) {
  const result = await db.query(
    `select name,age,phone,email,profilepic_url,coverpic_url from info where user_id=${userId}`
  );
  if (result.rows.length > 0) {
    return result.rows[0];
  } else {
    return -1;
  }
}

async function editUserInfo(phone,email,age,userId) {
  try{
  const result=await db.query(`update info set age=${age} , phone='${phone}', email='${email}' where user_id=${userId} RETURNING *`);
  if(result.rows.length>0)
  {
    return 1;
  }
  else{
    return 0;
  }
  }catch(err)
  {
    console.log("Error updating info "+err);
    return -1;
  }
  
}

async function editUserProfilePic(userId,profileUrl) {
  try{
  const result =await db.query(`update info set profilepic_url='${profileUrl}' where user_id=${userId} RETURNING *`);
   if(result.rows.length>0)
  {
    return 1;
  }
  else{
    return 0;
  }
  }catch(err){
    console.log("Error happened "+err);
    return -1;
  }
}

async function editUserCoverPic(userId,coverUrl) {
  try{
  const result =await db.query(`update info set coverpic_url='${coverUrl}' where user_id=${userId} RETURNING *`);
   if(result.rows.length>0)
  {
    return 1;
  }
  else{
    return 0;
  }
  }catch(err){
    console.log("Error happened "+err);
    return -1;
  }
}

async function getUserInfoPicById(userId) {
  try{
  const result= await db.query(`select coverpic_url,profilepic_url from info where user_id =${userId}`);
  if(result.rows.length>0){
    return {coverPicUrl :result.rows[0].coverpic_url,profilePicUrl:result.rows[0].profilepic_url}
  }
  else{
    console.log("No users Found");
    return "No users Found"
  }
  }catch(err){
    console.log("Error Hapeened "+err);
  }
}

async function getAllPosts() {
  const result=await db.query(`SELECT p.id,name,profilepic_url,img_url,title,content FROM info as i left join posts as p on i.user_id=p.user_id order by id asc`);
  return result.rows;
}



























//routes

app.get("/auth/check", (req, res) => {
  if (req.isAuthenticated()) {
    // getUserPosts(req.user.id);
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

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

app.post("/signup", async (req, res, next) => {
  const username = req.body.user_name;
  const password = req.body.pass_word;
  console.log(username, password);
  try {
    const userexist = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    console.log("userexist" + userexist.rows);

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

app.post("/users/addPost", upload.single("file"), async (req, res) => {
  const title = req.body.title;
  const content = req.body.content;
  const imgurl = `/uploads/${req.file.filename}`;
  const userid = req.body.userId;
  console.log(title, content, imgurl);
  try {
    const result = await addPost(title, content, imgurl, userid);

    if (result != 0) {
      return res.json({
        status: "Added Succesfully",
        img: imgurl,
        id: result,
      });
    } else {
      res.json("Failed Adding");
    }
  } catch (err) {
    console.log(err);
    return res.json("Error");
  }
  return 1;
});

app.get("/users/getUserPosts/:id", async (req, res) => {
  const id = req.params.id;
  const arr = await getUserPosts(id);
  console.log(JSON.stringify(arr));
  console.log("id is" + id);
  if (arr.length > 0) {
    res.json(arr);
  } else {
    res.json("No Posts");
  }
});

app.get("/users/deletePost/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const url = await getUrlByID(id);
    const filename = url.slice(9);
    const deleteUrl = deletepath + filename;
    console.log("delete url is" + deleteUrl);
    //delete img file
    try {
      fs.unlinkSync(deleteUrl);
      console.log("File deleted successfully");
    } catch (err) {
      console.error("Error deleting file:", err);
    }
    const result = await deletePost(id);
    console.log("deleted id is" + id);
    res.json("Successfully Deleted");
  } catch (err) {
    console.log("Error Happened" + err);
    res.json("Failed Deleting ");
  }
});

app.post("/users/editPost", upload.single("file"), async (req, res) => {
  const postId = req.body.postId;
  const newTitle = req.body.title;
  const newContent = req.body.content;
  const newFileUrl = req.file && `/uploads/${req.file.filename}`;
  if (req.file) {
    try {
      const url = await getUrlByID(postId);
      const filename = url.slice(9);
      const deleteUrl = deletepath + filename;
      console.log("delete url is" + deleteUrl);
      try {
        fs.unlinkSync(deleteUrl);
        console.log("File deleted successfully");
      } catch (err) {
        console.error("Error deleting file:", err);
      }

      const result = await editPost(postId, newFileUrl, newTitle, newContent);
      if (result == 1)
        res.json({ status: "Edited Succesfully", url: newFileUrl });
      else res.json("Failed Editing ");
    } catch (err) {
      console.log("Errror Happened :" + err);
      res.json("Caught Error");
    }
  } else {
    const oldUrl = await getUrlByID(postId);
    try {
      const result = await editPost(postId, oldUrl, newTitle, newContent);
      if (result == 1) res.json({ status: "Edited Succesfully", url: oldUrl });
      else res.json("Failed Editing ");
    } catch (err) {
      console.log("Errror Happened :" + err);
      res.json("Caught Error");
    }
  }
});

app.post(
  "/users/addInfo",
  upload.fields([
    { name: "profileImg", maxCount: 1 },
    { name: "coverImg", maxCount: 1 },
  ]),
  async (req, res) => {
    console.log("in req");
    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const age = req.body.age;
    const userId = req.body.userId;

    const profileImg = req.files.profileImg
      ? `/uploads/${req.files.profileImg[0].filename}`
      : null;

    const coverImg = req.files.coverImg
      ? `/uploads/${req.files.coverImg[0].filename}`
      : null;
    //to delete
    const profileImgFile = req.files.profileImg
      ? req.files.profileImg[0]
      : null;
    const coverImgFile = req.files.coverImg ? req.files.coverImg[0] : null;

    const deleteFiles = () => {
      if (profileImgFile) {
        fs.unlinkSync(path.join("public", "uploads", profileImgFile.filename));
      }
      if (coverImgFile) {
        fs.unlinkSync(path.join("public", "uploads", coverImgFile.filename));
      }
    };

    try {
      const result = await addUserInfo(
        name,
        phone,
        email,
        age,
        profileImg,
        coverImg,
        userId
      );
      console.log(JSON.stringify(result));
      if (result != -1) res.json("Info Added Succesfully");
      else {
        deleteFiles();
        res.json("Error Adding");
      }
    } catch (err) {
      deleteFiles();
      console.log("Error Happened" + err);
      res.json("Error Adding " + err);
    }
  }
);

app.get("/users/getInfo/:id", async (req, res) => {
  console.log("in get info");
  const userId = req.params.id;
  try {
    const result = await getUserIInfo(userId);
    if (result != -1) res.json({ datarr: result, code: 1 });
    else res.json({ status: "Fail to Fetch", code: -1 });
  } catch (err) {
    console.log("Error Hapeened" + err);
    res.json({ status: "Error happened" + err, code: -2 });
  }
});

app.post("/users/updateUserInfo/:id",upload.none(),async (req,res)=>{
  const userId=req.params.id;
   const { phone, email, age } = req.body;

  try{
    const result= await editUserInfo(phone,email,age,userId);
    if(result==1)
      { res.json("Updated Successfully");
        console.log("updated Succesfully New Info");
      }
    else if(result==0) res.json("Failed to Updated");
  }
  catch(err){
    console.log("Error happened"+err);
  }

});


// app.post("/users/updateUserProfilePic/:id",upload.single("profilePic"),async(req,res)=>{
//   const userId=req.params.id;
//   const ProfilePicUrl=`/uploads/${req.file.filename}`;
//   console.log("id"+userId);
//   let oldProfilePicUrl=await getUserInfoPicById(userId);
//   oldProfilePicUrl= oldProfilePicUrl.profilePicUrl;
//   // console.log("old url is "+oldProfilePicUrl);
//     try{
//       const result=await editUserProfilePic(userId,ProfilePicUrl);
//       if(result==1){
//         //delete old pic
//         const filename = oldProfilePicUrl.slice(9);
//         const deleteUrl = deletepath + filename;
//         console.log("delete url is"+deleteUrl);
//         try {
//         fs.unlinkSync(deleteUrl);
//         console.log("File deleted successfully");
//         } catch (err) {
//         console.error("Error deleting file:", err);
//         }
//         res.json({status:1 ,newUrl:ProfilePicUrl});
//       }
//       else{
//         console.log("Error Editing Profile Pic");
//         res.json({status:0,data:"Error happened User May Not Found"});
//       }
//     }
//     catch(err){
//       console.log("Error happened"+err);
//       res.json({status:-1,data:"Error happened"})
//     }
// });

app.post("/users/updateUserProfilePic/:id", upload.single("profilePic"), async (req, res) => {
  const userId = req.params.id;
  const profilePicUrl = `/uploads/${req.file.filename}`;
  console.log("id " + userId);

  try {
    // Get old profile pic if exists
    const oldUserData = await getUserInfoPicById(userId);
    const oldProfilePicUrl = oldUserData?.profilePicUrl || null;

    // Update in DB
    const result = await editUserProfilePic(userId, profilePicUrl);

    if (result !== 1) {
      console.log("Error Editing Profile Pic");
      return res.json({ status: 0, data: "Error happened. User may not be found" });
    }

    // If user had an old profile pic, try deleting it
    if (oldProfilePicUrl) {
      const filename = oldProfilePicUrl.slice(9); // remove "/uploads/"
      const deleteUrl = path.join(deletepath, filename);
      console.log("delete url is " + deleteUrl);
      try {
        fs.unlinkSync(deleteUrl);
        console.log("Old profile pic deleted successfully");
      } catch (err) {
        console.error("Error deleting old profile pic:", err);
      }
    } else {
      console.log("No previous profile pic found");
    }

    // Send success after all operations
    return res.json({ status: 1, newUrl: profilePicUrl });

  } catch (err) {
    console.error("Error happened", err);
    return res.json({ status: -1, data: "Error happened" });
  }
});

app.post("/users/updateUserCoverPic/:id", upload.single("coverPic"), async (req, res) => {
  const userId = req.params.id;
  const coverPicUrl = `/uploads/${req.file.filename}`;
  console.log("id " + userId);

  try {
    const oldUserData = await getUserInfoPicById(userId);
    const oldCoverPicUrl = oldUserData?.coverPicUrl || null;

    const result = await editUserCoverPic(userId, coverPicUrl);

    if (result !== 1) {
      console.log("Error Editing Cover Pic");
      return res.json({ status: 0, data: "Error happened. User may not be found" });
    }

    // If user had an old cover pic, try deleting it
    if (oldCoverPicUrl) {
      const filename = oldCoverPicUrl.slice(9); // remove "/uploads/"
      const deleteUrl = path.join(deletepath, filename);
      console.log("delete url is " + deleteUrl);
      try {
        fs.unlinkSync(deleteUrl);
        console.log("Old cover pic deleted successfully");
      } catch (err) {
        console.error("Error deleting old cover pic:", err);
      }
    } else {
      console.log("No previous cover pic found");
    }

    // Send success after all operations
    return res.json({ status: 1, newUrl: coverPicUrl });

  } catch (err) {
    console.error("Error happened", err);
    return res.json({ status: -1, data: "Error happened" });
  }
});
app.get("/users/getAllPosts",async(req,res)=>{
  try{
  const result=await getAllPosts();
  res.json({code:1,posts:result})
  }
  catch(err)
  {
    console.log("Error Happened "+err);
    res.json({code:-1,data:"Error Happened"});
  }
});


















//passport sessions

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

passport.serializeUser((user, done) => {
  done(null, user.id); // or user.username if id is not available
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
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
