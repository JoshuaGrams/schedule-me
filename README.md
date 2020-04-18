Use Space or 'n' or 'a' to add a new job: this will take you to
the form fields at the top. Enter a name and then a length
(hours), optionally change the color, and submit.

Escape backs out of the form fields.

Use left/right or j/l to move through the jobs.

Shift-left/right or J/L move all the jobs at once (change the
starting date).

I've used a delete-and-paste system here: delete jobs forward with
delete/x/ctrl-x, or backward with backspace. Then move to where
you want to put them and paste with 'p' or ctrl-v. If you delete
several sets of jobs, it will remember all of them. The most
recent one will be pasted first. If you need to choose a different
one, 'r' and 'R' rotate the clip stack.

"e" edits the job (again, update the form and submit).

"w" changes how many hours you want to work on a given day: put
the date in the first field and the number of hours for that day
in the second, then hit enter. Must be mm/dd, mm/dd/yyyy or
yyyy-mm-dd format.

Undo and redo with ctrl-z and ctrl-y (or ctrl-shift-z).

The data is automatically saved in your browser's local storage,
but you'll want to use the save button to keep a copy in a file
for safety.

If you want to change the key bindings or add more/different
colors, all the settings are in `config.js`. I've used the
abbreviated `#rgb` format for the colors, but any of the CSS color
formats should work:

	https://www.rapidtables.com/web/css/css-color.html
