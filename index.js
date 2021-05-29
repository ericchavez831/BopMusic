const express = require("express");
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');  
const fetch = require('node-fetch');
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
var admin_authenticated;

//user log routes *****************************************************
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
  let duplicate = await checkDuplicate(username, -1);
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
}); // /api/signup

app.get("/logout", function(req, res) {
  global_userId = -1;
  console.log(global_userId);
  req.session.destroy();
  res.redirect("/")
}); // logout



/* ADMIN START  ************************************************************** */

app.get("/admin/login", function(req, res) {
  res.render('adminLogin');
}); // admin login

app.get("/admin/logout", function(req, res) {
  admin_authenticated = false;
  res.render('welcome');
}); // admin login

app.get("/admin", isAdmin, async function(req, res){
  res.render("admin");
}); // admin route

app.post("/api/admin/login", async function(req, res){
  let username = req.body.username;
  let password = req.body.password;
  let hashedPwd = '';

  let sql = 'SELECT * FROM q_admin WHERE username = ?';
  let rows = await executeSQL(sql, [username]);

  if(rows.length > 0){
    hashedPwd = rows[0].password;
  }

  let pwdMatch = await bcrypt.compare(password, hashedPwd);
  
  if (pwdMatch) {
    admin_authenticated = true;
    res.send({"authentication":"success"}); 
  } else {
   res.send({"authentication":"fail"}); 
  }
}); // admin post login

app.get("/users", isAdmin, async function(req, res){
  let sql = `SELECT user_id, name, username, password FROM q_users ORDER BY name`;
  let rows = await executeSQL(sql);
  res.render('users', {'users': rows});
}); // get all users route

app.get("/user/edit", isAdmin, async function(req, res){
  let userId = req.query.user_id;
  let sql = `SELECT user_id, name, username, password FROM q_users WHERE user_id = ${userId}`;
  let rows = await executeSQL(sql);
  res.render('userInfo', {'userInfo': rows});
}); // user/edit (GET)

app.post("/user/edit", isAdmin, async function(req, res){
  let user_id = req.body.user_id;
  let name = req.body.name;
  let username = req.body.username;
  let password = req.body.password;
  let duplicate = await checkDuplicate(username, user_id);
  let empty = isEmpty(name, username, password);

  if(duplicate || empty){
    let sql1 = `SELECT * FROM q_users WHERE user_id = ${user_id}`;
    let rows1 = await executeSQL(sql1);
    if(empty){
      res.render('userInfo', {'userInfo':rows1, 'error':'One or more empty fields'}); 
    }
    else{
      res.render('userInfo', {'userInfo':rows1, 'error':'Username already taken'});
    }
  }
  else{
    // Ecrypt the password the user typed
    let hashedPwd = req.body.password;
    hashedPwd = await bcrypt.hash(password, 10);

    let sql = `UPDATE q_users SET name = ?, username = ?, password = ? WHERE user_id = ${user_id}`;
    let params = [req.body.name, req.body.username, hashedPwd];
    let rows = await executeSQL(sql, params);

    let sql1 = `SELECT * FROM q_users WHERE user_id = ${user_id}`;
    let rows1 = await executeSQL(sql1);
    res.render("userInfo", {'userInfo': rows1, 'error': 'Succesfully updated profile'});
  }

}); // user/edit (POST)

app.get("/user/delete", isAdmin, async function(req, res){
  let userId = req.query.user_id;
  let sql = `DELETE FROM q_users WHERE user_id = ${userId}`;
  let rows = await executeSQL(sql);
  res.redirect("/users");
}); // user/delete

app.get("/activities", isAdmin, async function(req, res){
  let sql = `SELECT activity_id, activity_name, description, city, state, DATE_FORMAT(date, '%m-%d-%Y') dateISO, duration, type FROM q_activities ORDER BY activity_name`;
  let rows = await executeSQL(sql);
  res.render('activities', {'activities': rows});
}); // get all activities route

app.get("/activity/edit", isAdmin, async function(req, res){
  let activityId = req.query.activity_id;
  let sql = `SELECT *, DATE_FORMAT(date, '%Y-%m-%d') dateISO FROM q_activities WHERE activity_id = ${activityId}`;
  let rows = await executeSQL(sql);
  console.log(rows);
  res.render('activityInfo', {'activityInfo': rows});
}); // activity/edit (GET)

app.post("/activity/edit", isAdmin, async function(req, res){
  let activity_name = req.body.activity_name;
  let description = req.body.description;
  let city = req.body.city;
  let state = req.body.state;
  let date = req.body.date;
  let duration = req.body.duration;
  let type = req.body.type;
  let activity_id = req.body.activity_id;
  let empty = isEmptyActivity(activity_name, description, city, state, date, duration, type);
  console.log(activity_name);
  console.log("empty: " + empty);

  if(!empty){
    let sql = `UPDATE q_activities SET activity_name = ?, description = ?, city = ?, state = ?, date = ?, duration = ?, type = ? WHERE activity_id = ${activity_id}`;
    let params = [activity_name, description, city, state, date, duration, type];
    let rows = await executeSQL(sql, params);

    let sql1 = `SELECT *, DATE_FORMAT(date, '%Y-%m-%d') dateISO FROM q_activities WHERE activity_id = ${activity_id}`;
    let rows1 = await executeSQL(sql1);

    res.render("activityInfo", {'activityInfo': rows1, 'error': 'Succesfully updated activity'});
  }else{
    let sql2 = `SELECT *, DATE_FORMAT(date, '%Y-%m-%d') dateISO FROM q_activities WHERE activity_id = ${activity_id}`;
    let rows2 = await executeSQL(sql2);
    res.render("activityInfo", {'activityInfo': rows2, 'error': 'Fields are empty'});
  }

  
}); // activity/edit (POST)

app.get("/activity/delete", isAdmin, async function(req, res){
  let activityId = req.query.activity_id;
  let sql = `DELETE FROM q_activities WHERE activity_id = ${activityId}`;
  let rows = await executeSQL(sql);
  res.redirect("/activities");
}); // activity/delete

/* Admin END ************************************************************ */


/* Users Starts ************************************************************ */
app.get("/home", isAuthenticated, async function(req, res){
  let sql = `SELECT *, DATE_FORMAT(date, '%m-%d-%Y') dateISO FROM q_activities WHERE user_id = ${global_userId}`;
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

  let empty = isEmptyActivity(activity_name, description, city, state, date, duration, type);
  
  if(!empty) {
    let sql = "INSERT INTO q_activities (user_id, activity_name, description, city, state, date, duration, type) VALUES(?, ?, ?, ?, ?, ?, ?, ?)";
    let params =[global_userId, activity_name, description, city, state, date, duration, type];
    let rows = await executeSQL(sql, params);
    
    res.render("create", {"message": "Activity Created!"});
  } else{
    res.render("create", {"message": "Looks like you left a field empty!"});
  }
  
}); // create

app.get("/explore", isAuthenticated, async function(req, res){
  let settings = { method: "Get" };

  let data = await fetch("https://www.boredapi.com/api/activity", settings)
      .then(res => res.json())
      .then((json) => {
        return json;
      });
  console.log(data);
  res.render("explore", {"activity": data});
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
  let duplicate = await checkDuplicate(username, global_userId);
  let empty = isEmpty(name, username, password);
  let hashedPwd = password;

  let sql = `SELECT * FROM q_users WHERE user_id = ${global_userId}`;
  let rows = await executeSQL(sql);

  if(duplicate || empty){
    if(empty){
      res.render('profile', {'userInfo':rows, 'error':'One or more empty fields'}); 
    }
    else{
      res.render('profile', {'userInfo':rows, 'error':'Username already taken'}); 
    }
  }else{
    // ENCRYPT THE PASSWORD
    if(password.length < 20){
      hashedPwd = await bcrypt.hash(password, 10);
    }
    //updating user
    let sql1 = `UPDATE q_users SET name = ?, username = ?, password = ? WHERE user_id = ${global_userId}`;
    let params = [req.body.name, req.body.username, hashedPwd];
    let rows1 = await executeSQL(sql1, params);
    //getting update user info
    let sql2 = `SELECT * FROM q_users WHERE user_id = ${global_userId}`;
    let rows2 = await executeSQL(sql2);

    res.render('profile', {'userInfo':rows2, 'error':'Succesfully updated profile'}); 
  }
  
}); // profile/edit

/* Users Ends ************************************************************ */



//functions ********************************************
async function checkDuplicate(username, user_id){
  let sql = 'SELECT * FROM q_users WHERE username = ?';
  let rows = await executeSQL(sql, username);
  if(rows.length > 0 && rows[0].user_id != user_id){
    return true;
  }
  else{
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

function isEmptyActivity(name, city, state, date, duration, description, type){
  if(name == "" || city == "" || state == "" || date == "" || duration == "" || description == "" || type == ""){
    return true;
  }
  else{
    return false;
  }
}

async function isAdmin(req, res, next){
  if(!admin_authenticated){
    res.redirect('/');
    // user is not authenticated
  }
  else{
    next();
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

async function getData(url){
  let response = await fetch(url);
  let data = await response.json();
  return data;
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