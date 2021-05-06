document.querySelector("#signup").addEventListener("click", signup);

async function signup(){
    let username = document.querySelector('#username').value;
    let password = document.querySelector('#password').value;
    let name = document.querySelector('#name').value;
  
    let url = `/api/signup`;
    let response = await fetch(url, {
      method:'post',  
      body: JSON.stringify({
          "username": username, 
          "password": password,
          "name":name
      }),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json" 
      }
    });
    let data = await response.json();
    console.log(data.authentication);
  
    if(data.authentication == "success"){
      window.location.href = "/login";
    }
    else{
      document.querySelector('#errorMessage').innerHTML = "Wrong Credentials";
    }
  }