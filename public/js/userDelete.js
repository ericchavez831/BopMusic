$(".deleteUser").on("click", confirmDeleteUser);
function confirmDeleteUser(){
  let userName = $(this).next().html();

  let deleteUser = confirm(`Delete user?`);
  if (deleteUser) {
      //we need to delete record
      let userId = $(this).attr("userId");
      window.location.href = `/user/delete?user_id=${userId}`;
      
  }
}