-- Reset every user's current daily question to start from question id 19.
update daily_task
set question_id = 19,
    completed = false,
    date = current_date;
