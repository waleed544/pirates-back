import express from "express"
import bodyParser from "body-parser"
import pg from "pg"



const app=express();
const port=5000;

app.use(bodyParser.urlencoded({ extended: true }));

const db=new pg.Client({
  user :"postgres",
  host :"localhost",
  database :"FaceBook",
  password :"waleed544" ,
  port :"5432"
});
db.connect();

app.get("/",(req,res)=>{
    res.json({
        "name":"walid"
    });
})


app.listen(port,(req,res)=>{
console.log(`server started at port ${port}`);
});