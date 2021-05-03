const express = require("express");
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');  
const app = express();
const pool = dbConnection();


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({extended:true})); // to decode parameters that was send through post method 
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'topsecret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

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

app.post("/signup", async function(req, res){
  // getting the values
  let name = req.body.name;
  let username = req.body.username;
  let password = req.body.password;
  let cd = await checkDuplicate(username);
  

  // CHECK IF WE CAN CREATE THE ACCOUNT
  if(cd){
    res.render("signup", {"error": "Username already taken"});
  }else{
    // ENCRYPT THE PASSWORD
    let hashedPwd = await bcrypt.hash(password, 10);
    let sql = "INSERT INTO q_users (name, username, password) VALUES (?, ?, ?)";
    let params = [name, username, hashedPwd];

    let rows = await executeSQL(sql, params);
    res.render("login");
  }

}); // user/new

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

app.get("/home", async function(req, res){
  res.render("home");
}); // home


app.post("/login", async function(req, res){
  let username = req.body.username;
  let password = req.body.password;
  let hashedPwd = '';

  let sql = 'SELECT * FROM q_users WHERE username = ?';
  let rows = await executeSQL(sql, [username]);

  if(rows.length > 0){
    hashedPwd = rows[0].password;
  }

  let pwdMatch = await bcrypt.compare(password, hashedPwd);
  
  if(pwdMatch){
    req.session.authenticated = true;
    res.render('home');
  }
  else{
    res.render('login', {'error':'wrong credentials'});
  }
});


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