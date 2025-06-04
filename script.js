let currentDate = new Date();
let tasks=JSON.parse(localStorage.getItem('tasks'))||{};

const calendarE1=document.getElementById('calendar');
const currentMonthE1=document.getElementById('current-month');
const prevtMonthBtn=document.getElementById('prev-month');
const nexttMonthBtn=document.getElementById('next-month');

prevtMonthBtn.addEventListener('click',()=>{
    currentDate.setMonth(currentDate.getMonth()-1);
    renderCalendar();
});

nexttMonthBtn.addEventListener('click',()=>{
    currentDate.setMonth(currentDate.getMonth()+1);
    renderCalendar();
});

