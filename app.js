const express = require("express");
const mysql = require('mysql');
const app = express();
const pool = dbConnection();


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({extended:true})); // to decode parameters that was send through post method 


//routes
app.get("/", async function(req, res){
  res.render("partials/header");
});
