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

app.get("/signup", async function(req, res){

  res.render("signup");
}); // sign up

app.post("/api/signup", async function(req, res){
  // getting the values
  let name = req.body.name;
  let username = req.body.username;
  let password = req.body.password;
  let duplicate = await checkDuplicate(username);
  let empty = isEmpty(name, username, password);
  
  console.log("duplicate" + duplicate);
  console.log("empty" + empty);

  // CHECK IF WE CAN CREATE THE ACCOUNT
  if(duplicate || empty){
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
    
  }

app.get("/logout", function(req, res) {
  global_userId = -1;
  console.log(global_userId);
  req.session.destroy();
  res.redirect("/")
})






}); // user/new

app.get("/home", isAuthenticated, async function(req, res){
  let sql = `SELECT * FROM q_activities WHERE user_id = ${global_userId}`;
  let rows = await executeSQL(sql);
  res.render("home", {"activities":rows});
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
  // we have the user global_userId so we have to natural join the tables and get the name, username, and password from db

  let sql = `SELECT * FROM q_users WHERE user_id = ${global_userId}`;
  let rows = await executeSQL(sql);

  // To display the current info in the profile ejs file
  res.render("profile", {'userInfo':rows});
}); // profile

app.post("/profile/edit", isAuthenticated, async function(req, res){

  let password = req.body.password;
  let name = req.body.name;
  let username = req.body.username;
  let duplicate = await checkDuplicate(username);
  let empty = isEmpty(name, username, password);
  let hashedPwd = password;
  let sql = `SELECT * FROM q_users WHERE user_id = ${global_userId}`;
  let rows1 = await executeSQL(sql);

  if(duplicate || empty){
    if(empty){
      res.render('profile', {'userInfo':rows1, 'error':'One or more empty fields'}); 
    }
    else{
      res.render('profile', {'userInfo':rows1, 'error':'Username already taken'}); 
    }
  }else{
    // ENCRYPT THE PASSWORD
    if(password.length < 20){
      hashedPwd = await bcrypt.hash(password, 10);
    }
    let sql = `UPDATE q_users SET name = ?, username = ?, password = ? WHERE user_id = ${global_userId}`;

    let params = [req.body.name, req.body.username, hashedPwd];
    let rows = await executeSQL(sql, params);

    res.render('profile', {'userInfo':rows1, 'error':'Succesfully updated profile'}); 
  }
  
}); // profile/edit



app.get("/admin", async function(req, res){
  res.render("admin");
}); // root route

app.get("/users", async function(req, res){
  res.render("users");
}); // root route

app.get("/activities", async function(req, res){
  res.render("activities");
}); // root route



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

function isEmpty(name, username, password){
  if(name == "" || username == "" || password == ""){
    return true;
  }
  else{
    return false;
  }
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