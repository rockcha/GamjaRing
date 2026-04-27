-- Reset every user's current daily question to the first question.
update daily_task
set question_id = 1,
    completed = false,
    date = current_date;
