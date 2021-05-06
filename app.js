const express = require("express");
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');  
const app = express();
const pool = dbConnection();


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({extended:true})); // to decode parameters that was send through post method 
app.use(express.json());

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'topsecret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

// global userId
var global_userId;

//routes ********************************************
app.get("/", async function(req, res){
  res.render("welcome");
}); // root route

app.get("/login", async function(req, res){
  res.render("login");
}); // login

app.get("/signup", async function(req, res){

  res.render("signup");
}); // sign up

app.post("/api/signup", async function(req, res){
  // getting the values
  let name = req.body.name;
  let username = req.body.username;
  let password = req.body.password;
  let cd = await checkDuplicate(username);
  let empty = isEmpty(name, username, password);
  

  // CHECK IF WE CAN CREATE THE ACCOUNT
  if(cd || empty){
    //res.render("signup", {"error": "Username already taken"});
    res.send({"authentication":"fail"}); 
  }else{
    // ENCRYPT THE PASSWORD
    let hashedPwd = await bcrypt.hash(password, 10);
    let sql = "INSERT INTO q_users (name, username, password) VALUES (?, ?, ?)";
    let params = [name, username, hashedPwd];
    let rows = await executeSQL(sql, params);
    
    req.session.authenticated = true;
    console.log(req.session.authenticated);
    res.send({"authentication":"success"});
    
    
    //res.render("login");
  }

}); // user/new

app.get("/home", isAuthenticated, async function(req, res){
  res.render("home");
}); // home

app.get("/create", isAuthenticated, async function(req, res){
  res.render("create");
}); // create

app.post("/create", isAuthenticated, async function(req, res){
  let activity_name = req.body.activity_name;
  let description = req.body.description;
  let city = req.body.city;
  let state = req.body.state;
  let date = req.body.date;
  let duration = req.body.duration;
  let type = req.body.type;
  
  let sql = "INSERT INTO q_activities (user_id, activity_name, description, city, state, date, duration, type) VALUES(?, ?, ?, ?, ?, ?, ?, ?)";
  let params =[global_userId, activity_name, description, city, state, date, duration, type];
  let rows = await executeSQL(sql, params);
  
  res.render("create", {"message": "Activity Created!"});
}); // create

app.get("/explore", isAuthenticated, async function(req, res){
  res.render("explore");
}); // explore

app.get("/profile", isAuthenticated, async function(req, res){
  res.render("profile");
}); // profile

app.post("/api/login", async function(req, res){
  let username = req.body.username;
  let password = req.body.password;
  let hashedPwd = '';

  let sql = 'SELECT * FROM q_users WHERE username = ?';
  let rows = await executeSQL(sql, [username]);

  if(rows.length > 0){
    hashedPwd = rows[0].password;
  }

  let pwdMatch = await bcrypt.compare(password, hashedPwd);
  
  if (pwdMatch) {
    req.session.authenticated = true;
    console.log(req.session.authenticated);
    global_userId = rows[0].user_id;
    console.log(global_userId);
    res.send({"authentication":"success"}); 
 } else {
   res.send({"authentication":"fail"}); 
 }
});

app.get("/logout", function(req, res) {
  global_userId = -1;
  console.log(global_userId);
  req.session.destroy();
  res.redirect("/")
})

//functions ********************************************
async function checkDuplicate(username){
  let sql = 'SELECT * FROM q_users WHERE username = ?';
  let rows = await executeSQL(sql, [username]);
  console.log(rows);
  // if the length is greater than 0, it means that the user was found
  if(rows.length > 0){
    console.log("Returned True");
    return true;
  }else{
    console.log("Returned False");
    return false;
  }
}

async function isEmpty(name, username, password){
  if(name == "" && username == "" && password == ""){
    return true;
  }
  return false;
}

function isAuthenticated(req, res, next){
  console.log(req.session.authenticated);
  if(!req.session.authenticated){
    res.redirect('/');
    // user is not authenticated
  }
  else{
    next();
  }
}

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
      host: "lyn7gfxo996yjjco.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
      user: "qrhabbkfstzzmjd2",
      password: "unm4yoq46336t3ns",
      database: "c760jxzrsdwt47uo"
   }); 
   return pool;
} //dbConnection


//start server
app.listen(3000, () => {
console.log("Expresss server running...")
} )