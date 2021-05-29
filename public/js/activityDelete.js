$(".deleteActivity").on("click", confirmDeleteActivity);
console.log('here')
function confirmDeleteActivity(){
  console.log("inside");
  let activityName = $(this).next().html();

  let deleteActivity = confirm(`Delete activity?`);
  if (deleteActivity) {
      //we need to delete record
      let activityId = $(this).attr("activityId");
      window.location.href = `/activity/delete?activity_id=${activityId}`;
      
  }
}