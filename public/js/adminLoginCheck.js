document.querySelector("#adminLogin").addEventListener("click", adminLogin);

async function adminLogin(){
  let username = document.querySelector('#username').value;
  let password = document.querySelector('#password').value;

  let url = `/api/admin/login`;
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
    window.location.href = "/admin";
  }
  else{
    document.querySelector('#errorMessage').innerHTML = "Wrong Credentials";
  }
}

