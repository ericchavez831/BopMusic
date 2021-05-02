const express = require("express");
const mysql = require('mysql');
const app = express();
const pool = dbConnection();


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({extended:true})); // to decode parameters that was send through post method 


//routes
app.get("/", async function(req, res){
  res.render("welcome");
}); // root route

app.get("/login", async function(req, res){
  res.render("login");
}); // login

app.get("/signup", async function(req, res){
  res.render("signup");
}); // sign up

app.get("/home", async function(req, res){
  res.render("home");
}); // home

//functions
async function executeSQL(sql, params){
  return new Promise (function (resolve, reject) {
    pool.query(sql, params, function (err, rows, fields) {
      if (err) throw err;
        resolve(rows);
    });
  });
}//executeSQL

//values in red must be updated
function dbConnection(){
   const pool  = mysql.createPool({
      connectionLimit: 10,
      host: "",
      user: "",
      password: "",
      database: ""
   }); 
   return pool;
} //dbConnection


//start server
app.listen(3000, () => {
console.log("Expresss server running...")
} )