import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import cors from "cors";
import bcrypt, { compareSync } from "bcrypt";
import env from "dotenv";
import multer from "multer";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import pkg from "pg";
const { Pool } = pkg;

var backslash = "\\";
const __dirname = dirname(fileURLToPath(import.meta.url));
const deletepath = `${__dirname}${backslash}public${backslash}uploads${backslash}`;

const app = express();
const port = process.env.PORT || 5000;
const saltRounds = 10;
env.config();
// Serve uploaded files from public/uploads
app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

//config

var idsstored=[];

console.log("DB Config:", {
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

const db = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
  ssl: { rejectUnauthorized: false }
});

//http://localhost:3000/

app.use(
  cors({
    origin: "https://pirates-back-production.up.railway.app",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

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

async function addNewUser(username, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (username, password)
      VALUES ($1, $2)
      RETURNING *;
    `;

    const result = await db.query(query, [username, hashedPassword]);

    return result;
  } catch (err) {
    console.error("Error inserting new user:", err);
    throw err; // keep behavior consistent
  }
}

 async function addPost(title, content, imgurl, userid) {
  const query = `
    INSERT INTO posts (title, content, img_url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const result = await db.query(query, [title, content, imgurl, userid]);
  if (result.rows.length > 0) return result.rows[0].id;
  else return 0;
}

 async function deletePost(id) {
  const query = `DELETE FROM posts WHERE id = $1`;
  const result = await db.query(query, [id]);
  return 1;  // keep same as your code
}

 async function editPost(id, newimgurl, newtitle, newcontent) {
  const query = `
    UPDATE posts
    SET img_url = $1, title = $2, content = $3
    WHERE id = $4
    RETURNING *;
  `;
  const result = await db.query(query, [newimgurl, newtitle, newcontent, id]);
  if (result.rows.length > 0) return 1;
  else return 0;
}

 async function getUserPosts(id) {
  const query = `
    SELECT img_url, title, content, id
    FROM posts
    WHERE user_id = $1
    ORDER BY id ASC;
  `;
  const result = await db.query(query, [id]);
  console.log("from func" + JSON.stringify(result.rows));
  if (result.rowCount > 0) {
    return result.rows;
  } else {
    return 0;
  }
}

 async function getUrlByID(id) {
  const query = `SELECT img_url FROM posts WHERE id = $1`;
  const reult = await db.query(query, [id]);
  console.log("img url is" + reult.rows[0]);
  return reult.rows[0].img_url;  // unchanged (still crashes if no row, same as your code)
}

// -------------------- USER INFO --------------------

 async function addUserInfo(
  name,
  phone,
  email,
  age,
  profPicUrl,
  coverPicUrl,
  userId
) {
  const query = `
    INSERT INTO info (name, age, phone, email, profilepic_url, coverpic_url, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const result = await db.query(query, [name, age, phone, email, profPicUrl, coverPicUrl, userId]);
  console.log("in add info func" + result.rows[0]);
  if (result.rows.length > 0) {
    return result.rows[0];
  } else return -1;
}

 async function getUserIInfo(userId) {
  const query = `
    SELECT name, age, phone, email, profilepic_url, coverpic_url
    FROM info
    WHERE user_id = $1;
  `;
  const result = await db.query(query, [userId]);
  if (result.rows.length > 0) {
    return result.rows[0];
  } else {
    return -1;
  }
}

 async function editUserInfo(phone, email, age, userId) {
  try {
    const query = `
      UPDATE info
      SET age = $1, phone = $2, email = $3
      WHERE user_id = $4
      RETURNING *;
    `;
    const result = await db.query(query, [age, phone, email, userId]);
    if (result.rows.length > 0) {
      return 1;
    } else {
      return 0;
    }
  } catch (err) {
    console.log("Error updating info " + err);
    return -1;
  }
}

 async function editUserProfilePic(userId, profileUrl) {
  try {
    const query = `
      UPDATE info
      SET profilepic_url = $1
      WHERE user_id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [profileUrl, userId]);
    if (result.rows.length > 0) {
      return 1;
    } else {
      return 0;
    }
  } catch (err) {
    console.log("Error happened " + err);
    return -1;
  }
}

 async function editUserCoverPic(userId, coverUrl) {
  try {
    const query = `
      UPDATE info
      SET coverpic_url = $1
      WHERE user_id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [coverUrl, userId]);
    if (result.rows.length > 0) {
      return 1;
    } else {
      return 0;
    }
  } catch (err) {
    console.log("Error happened " + err);
    return -1;
  }
}

 async function getUserInfoPicById(userId) {
  try {
    const query = `
      SELECT coverpic_url, profilepic_url
      FROM info
      WHERE user_id = $1;
    `;
    const result = await db.query(query, [userId]);
    if (result.rows.length > 0) {
      return {
        coverPicUrl: result.rows[0].coverpic_url,
        profilePicUrl: result.rows[0].profilepic_url
      };
    } else {
      console.log("No users Found");
      return "No users Found";
    }
  } catch (err) {
    console.log("Error Hapeened " + err);
  }
}

// -------------------- POSTS + USER JOIN --------------------

 async function getAllPosts() {
  const query = `
    SELECT p.id, name, profilepic_url, img_url, title, content
    FROM info AS i
    INNER JOIN posts AS p ON i.user_id = p.user_id
    ORDER BY id ASC;
  `;
  const result = await db.query(query);
  return result.rows;
}

















//routes


app.get("/", (req, res) => {
  res.json({
    name: "walid",
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // find user in DB
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.json({ message: "User not found" });
    }

    const user = result.rows[0];

    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(404).json({ message: "Incorrect password" });
    }
    res.status(200).json({ message: "Login successful", user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
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
      return res.json({message:"duplicate user",id:null});
      console.log("rows >=0");
    } else {
      console.log("rows <=0");
      const result = await addNewUser(username, password);
      const newUser = result.rows[0];

      return res.json({message:"successful",id:newUser.id});
    }
  } catch (err) {
    console.log(err);
    return res.json({message:"Success",id:null});
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
  console.log("get user posts is is "+id);
  console.log("done");
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





app.listen(port, (req, res) => {
  console.log(`server started at port ${port}`);
});