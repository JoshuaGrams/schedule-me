const colors = {
	"red":    "#fcc",
	"orange": "#fca",
	"yellow": "#fd6",
	"green":  "#bdb",
	"blue":   "#bde",
	"purple": "#edf"
}

const unit = 0.25  // quarter-hour increments.

// Default schedule.
const defaultHours = [
	6.00, // Sunday
	6.00, // Monday
	6.00, // Tuesday
	6.00, // Wednesday
	6.00, // Thursday
	6.00, // Friday
	6.00  // Saturday
]

// Modifiers MUST be in the order win-ctrl-alt-shift.
//
// If the key outputs a character, use that. If it doesn't,
// look up the name at:
// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
const keyBindings = {
	"j": "left",   "ArrowLeft": "left",
	"l": "right",  "ArrowRight": "right",
	"shift-j": "start earlier", "shift-ArrowLeft": "start earlier",
	"shift-l": "start later",  "shift-ArrowRight": "start later",
	"b": "new job",  // Before the current job.
	"a": "new job after", // After the current job.
	"e": "edit job",
	"w": "working hours",
	"x": "delete",  "Delete": "delete",  "ctrl-x": "delete",
	"Backspace": "backspace",
	"p": "paste",  "ctrl-v": "paste",
	"ctrl-z": "undo",
	"ctrl-y": "redo",  "ctrl-shift-z": "redo",
	"r": "previous clip",   // Rotate previous clip up to top.
	"shift-r": "next clip"  // Rotate latest clip down to bottom.
}
