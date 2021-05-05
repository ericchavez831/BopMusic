document.querySelector("button").addEventListener("click", login);

  async function login(){
    let username = document.querySelector('#username').value;
    let password = document.querySelector('#password').value;

    let url = `/api/login`;
    let response = await fetch(url, {
      method:'post',  
      body: JSON.stringify({
          "username": username, 
            "password": password
      }),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json" 
      }
    });
    let data = await response.json();
    console.log(data.authentication);

    if(data.authentication == "success"){
      window.location.href = "/home";
    }
    else{
      document.querySelector('#errorMessage').innerHTML = "Wrong Credentials";
    }
  }