/*
 * Schedule Me - A simple single-user schedule sheet.
 * Copyright 2020 Joshua Grams <josh@qualdan.com>
 */

const min = Math.min, max = Math.max
const floor = Math.floor, ceil = Math.ceil, round = Math.round
const random = Math.random
function randomElement(a) { return a[floor(a.length * random())] }

// ---------------------------------------------------------------------
// Command history - undo/redo.

// `commands` is `{name: [perform, undo]}`.
function CommandHistory(commands) {
	this.commands = commands
	this.clear()
}

CommandHistory.prototype.clear = function() {
	this.past = []
	this.future = []
}

CommandHistory.prototype.perform = function(name, ...args) {
	if(this.commands[name] == null) throw new Error("CommandHistory.perform - There is no command named \"" + name + "\".")
	this.future = []
	const perform = this.commands[name][0]
	const undoArgs = perform(...args)
	this.past.push([name, args, undoArgs])
}

CommandHistory.prototype.update = function(...args) {
	const top = this.past[this.past.length-1]
	if(top != null) top[1] = args
}

CommandHistory.prototype.undo = function() {
	const command = this.past.pop()
	if(command != null) {
		const name = command[0], undoArgs = command[2]
		const undo = this.commands[name][1]
		undo(...undoArgs)
		this.future.push(command)
	}
}

CommandHistory.prototype.redo = function() {
	const command = this.future.pop()
	if(command != null) {
		const name = command[0], args = command[1]
		const perform = this.commands[name][0]
		perform(...args)
		this.past.push(command)
	}
}

// ---------------------------------------------------------------------
// Wait for form input before processing a command.

let pending

function pendingCommand(name, ...args) {
	pending = {name: name, args: args}
}

function commitCommand(history) {
	if(pending == null) return
	// Convert input fields to their values. Won't work for
	// checkboxes or radio buttons, but we don't have any.
	for(let i=0; i<pending.args.length; ++i) {
		const arg = pending.args[i]
		if(typeof arg === 'object') {
			if(arg.nodeName === 'INPUT') {
				pending.args[i] = arg.value
			} else if(arg.nodeName === 'SELECT') {
				pending.args[i] = arg.options[arg.selectedIndex].text
			}
		}
	}
	history.perform(pending.name, ...pending.args)
	return pending.name
}

// ---------------------------------------------------------------------
// Utility functions.

function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException
			&& (e.code === 22   // everything except Firefox
            || e.code === 1014 // Firefox
            // test name field too, because code might not be present
            // everything except Firefox
            || e.name === 'QuotaExceededError'
            || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')  // Firefox
            // acknowledge QuotaExceededError only if there's something already stored
			&& (storage && storage.length !== 0);
    }
}

// Add attributes, properties, and children to a DOM node
// (possibly creating it first).
// args:
//     target: an Element or a tag name (e.g. "div")
//     then optional in any order (type determines function)
//         Element: child
//         string: text node child
//         array: values are treated as args
//         null/undefined: ignored
//         object: set attributes and properties of `target`.
//             string: set attribute
//             array: set property to array[0]
//             object: set property properties. example: N('span', {style: {color: 'red'}})
//             function: add event listener.

function N(target, ...args) {
	const el = typeof target === 'string' ?
		document.createElement(target) : target;
	for(const arg of args) {
		if(arg instanceof Element || arg instanceof Text) {
			el.appendChild(arg);
		} else if(Array.isArray(arg)) {
			N(el, ...arg);
		} else if(typeof arg === 'string') {
			el.appendChild(document.createTextNode(arg));
		} else if(arg instanceof Object) {
			for(const k in arg) {
				const v = arg[k];
				if(Array.isArray(v)) {
					el[k] = v[0];
				} else if(v instanceof Object) {
					for(const vk in v) el[k][vk] = v[vk];
				} else if(v instanceof Function) {
					el.addEventListener(k, v)
				} else {
					el.setAttribute(k, v);
				}
			}
		}
	}
	return el;
}

// ---------------------------------------------------------------------
// Date helpers

function parseDate(string) {
	let ymd
	if(/\//.test(string)) {  // mm/dd[/yyyy]
		ymd = string.split('/')
		if(ymd.length === 3) {
			ymd.unshift(ymd.pop())
		} else {
			const today = new Date()
			ymd.unshift(today.getFullYear())
		}
	} else if(/-/.test(string)) {  // yyyy-mm-dd
		ymd = string.split('-')
	}
	return new Date(+ymd[0], ymd[1]-1, +ymd[2])
}

function formatDate(date) {
	let y = date.getFullYear()
	let m = 1 + date.getMonth(); if(m<10) m = '0' + m
	let d = date.getDate(); if(d<10) d = '0' + d
	return y + '-' + m + '-' + d
}

function formatShortDate(date) {
	let m = 1 + date.getMonth(), d = date.getDate()
	return m + '/' + d
}

function nextDay(date) {
	date = new Date(date.getTime())
	date.setDate(1 + date.getDate())
	return date
}

function getHours(date, hours, defaultHours) {
	const key = formatDate(date)
	if(hours[key] != null) return hours[key]
	else return defaultHours[date.getDay()]
}

// ---------------------------------------------------------------------
// Draw `jobs` in `table` according to `hours` and `defaultHours`.

// Remove all but the first row (the header that gives the weekdays).
function clearTable(table, startDate) {
	while(table.rows.length > 1) table.deleteRow(-1)
	const weekday = startDate.getDay()
	let date = new Date(startDate.getTime())
	date.setDate(date.getDate() - weekday)
	for(let i=0; i<weekday; ++i) {
		addCell(table, formatShortDate(date))
		date = nextDay(date)
	}
}

// Add a new cell.
function addCell(table, label) {
	const width = table.rows[0].cells.length
	const last = table.rows.length-1
	const full = table.rows[last].cells.length >= width
	const header = full? table.insertRow() : table.rows[last-1]
	const data = full? table.insertRow() : table.rows[last]
	N(header, N('th', label))
	data.insertCell()
}

function adjustLength(string, length) {
	if(string.length > length) {
		string = string.substring(0, length)
	} else if(string.length < length) {
		for(let i=string.length; i<length; ++i) {
			string += ' '
		}
	}
	return string
}

// Add a piece of a job to a cell.
function addPiece(table, job, length, colors, offset, wordOffset, selected) {
	const row = table.rows[table.rows.length-1]
	const attribs = {
		style: {"background-color": colors[job.color]}
	}
	const classes = []
	if(selected) classes.push('selected')
	if(offset === 0) classes.push('start')
	if(offset + length === round(job.hours/unit)) classes.push('end')
	attribs.class = classes.join(' ')
	const words = job.name.split(/(\s+)/)
	let text = '', i
	for(i=max(0,2*wordOffset-1); i<words.length; ++i) {
		if(text.length + words[i].length > length) break;
		text += words[i]
	}
	wordOffset = ceil(i/2)
	N(row.cells[row.cells.length-1], N('span', attribs,
		adjustLength(text, length),
	))
	return wordOffset
}

function draw(table, jobs, hours, defaultHours, unit, colors) {
	clearTable(table, jobs.start)
	let date
	let j = 0, hoursPlaced = 0, hoursToday = 0, wordOffset = 0
	while(j < jobs.list.length) {
		const job = jobs.list[j]
		if(hoursToday === 0) {
			if(date == null) date = jobs.start
			else date = nextDay(date)
			hoursToday = getHours(date, hours, defaultHours)
			addCell(table, formatShortDate(date))
		}
		const used = min(job.hours - hoursPlaced, hoursToday)
		const length = round(used/unit)
		const offset = round(hoursPlaced/unit)
		const selected = (j === jobs.cursor)
		wordOffset = addPiece(table, job, length, colors, offset, wordOffset, selected)
		hoursToday -= used
		hoursPlaced += used
		if(hoursPlaced === job.hours) {
			++j;  hoursPlaced = 0; wordOffset = 0
		}
	}
}

function drawClips(output, clips) {
	while(output.firstChild != null) {
		output.removeChild(output.firstChild)
	}
	for(let i=clips.length-1; i>=0; --i) {
		const item = N('li'), jobs = clips[i]
		for(let j=0; j<jobs.length; ++j) {
			const job = jobs[j]
			N(item, N('span', job.name,
				{style: {"background-color": colors[job.color]}}
			), ' ')
		}
		N(output, item)
	}
}

// ---------------------------------------------------------------------
// Global data structures.

let jobs = {
	start: new Date(),
	cursor: 0,
	list: []
}
let hours = {}

const localStorageAvailable = storageAvailable('localStorage')
function serializeState(jobs, hours) {
	const start = jobs.start
	jobs.start = formatDate(jobs.start)
	const data = JSON.stringify({jobs: jobs, hours: hours})
	jobs.start = start
	return data
}
function deserializeState(json) {
	if(!json) return
	const data = JSON.parse(json)
	if(data) {
		data.jobs.start = parseDate(data.jobs.start)
		jobs = data.jobs
		hours = data.hours
	}
}

if(localStorageAvailable) {
	deserializeState(localStorage.getItem('schedule'))
}

// Per-session data.
let wasDeletion = false
let clips = []

function previousClip() {
	if(clips.length > 1) clips.unshift(clips.pop())
	return []
}

function nextClip() {
	if(clips.length > 1) clips.push(clips.shift())
	return []
}

function editJob(index, name, hours, color) {
	const job = jobs.list[index]
	const undoArgs = [index, job.name, job.hours, job.color]
	job.name = name;  job.hours = +hours;  job.color = color
	return undoArgs
}

function workingHours(date, duration) {
	date = formatDate(parseDate(date))
	const result = [date, hours[date]]
	if(duration == null) delete hours[date]
	else hours[date] = round(duration/unit)*unit
	return result
}

let history = new CommandHistory({
	"new job": [
		function(index, name, hours, color) {
			// Splice the new job into the list.
			jobs.list.splice(index, 0, {
				name: name, hours: +hours, color: color
			})
			jobs.cursor = index + 1
			// Return the index so we can undo by deleting it.
			return [index]
		},
		function(index) { jobs.list.splice(index, 1); jobs.cursor = index }
	],
	"edit job": [editJob, editJob],
	"working hours": [workingHours, workingHours],
	"delete": [
		function(index, newClip, prepend) {
			const job = jobs.list.splice(index, 1)[0]
			if(newClip) clips.push([])
			let clip = clips[clips.length-1]
			if(prepend) clip.unshift(job)
			else clip.push(job)
			return [index, job, newClip]
		},
		function(index, job, newClip) {
			if(newClip) clips.pop()
			else clips[clips.length-1].pop()
			jobs.list.splice(index, 0, job)
		}
	],
	"paste": [
		function(index) {
			let clip = clips.pop()
			jobs.list.splice(index, 0, ...clip)
			return [index, clip.length]
		},
		function(index, length) {
			clips.push(jobs.list.splice(index, length))
		}
	],
	"next clip": [nextClip, previousClip],
	"previous clip": [previousClip, nextClip]
})

const schedule = document.getElementById('schedule')
const clipsElement = document.getElementById('clips')
function redraw() {
	draw(schedule, jobs, hours, defaultHours, unit, colors)
	drawClips(clipsElement, clips)
}

redraw()

// ---------------------------------------------------------------------
// Initialize input fields.

const form = document.getElementById('fields')
const nameField = document.getElementById('name')
const hourField = document.getElementById('hours')
const colorField = document.getElementById('color')
const legend = document.getElementById('legend')

form.addEventListener('submit', function(evt) {
	event.preventDefault()
	document.activeElement.blur()
	const command = commitCommand(history)
	if(command) postCommand(command)
})

function selectColor(color) {
	const options = colorField.options
	for(let i=0; i<options.length; ++i) {
		const option = options[i]
		if(color === option.text) option.selected = true
		else delete(option.selected)
	}
}

for(name in colors) {
	N(colorField, N('option', name, {value: colors[name]}))
	N(legend, N('div', name, {style: {'background-color': colors[name]}}, ' '))
}
selectColor(randomElement(Object.keys(colors)))

function randomContrastingColor(index) {
	// Pick a random color that doesn't match adjacent jobs.
	const prev = jobs.list[index-1], cur = jobs.list[index]
	const prevColor = prev && prev.color
	const curColor = cur && cur.color
	let color
	do {
		color = randomElement(Object.keys(colors))
	} while(color === prevColor || color == curColor)
	return color
}

function updateInputFields() {
	if(jobs.cursor >= jobs.list.length) return
	const focused = document.activeElement, body = document.body
	const bodyFocused = (focused === body || !focused)
	if(bodyFocused) {
		const job = jobs.list[jobs.cursor]
		nameField.value = job.name
		hourField.value = '' + job.hours
		selectColor(job.color)
	}
}
updateInputFields()

// ---------------------------------------------------------------------
// Keyboard input handling.

const commands = {
	left: function() {
		jobs.cursor = max(0, jobs.cursor - 1)
	},
	right: function() {
		jobs.cursor = min(jobs.list.length, jobs.cursor + 1)
	},
	"new job": function() {
		nameField.value = ""
		hourField.value = "1"
		selectColor(randomContrastingColor(jobs.cursor))
		nameField.focus()
		pendingCommand('new job', jobs.cursor, nameField, hourField, colorField)
	},
	"edit job": function() {
		if(jobs.cursor < jobs.list.length) {
			nameField.focus()
			pendingCommand('edit job', jobs.cursor, nameField, hourField, colorField)
		}
	},
	"working hours": function() {
		nameField.value = ""
		hourField.value = ""
		nameField.focus()
		pendingCommand('working hours', nameField, hourField)
	},
	"delete": function() {
		if(jobs.cursor < jobs.list.length) {
			history.perform('delete', jobs.cursor, !wasDeletion)
		}
	},
	"backspace": function() {
		if(jobs.cursor > 0) {
			--jobs.cursor
			history.perform('delete', jobs.cursor, !wasDeletion, true)
		}
	},
	"paste": function() {
		if(clips.length > 0) history.perform('paste', jobs.cursor)
	},
	"next clip": function() {
		if(clips.length > 1) history.perform('next clip')
	},
	"previous clip": function() {
		if(clips.length > 1) history.perform('previous clip')
	},
	"start later": function() {
		jobs.start.setDate(jobs.start.getDate() + 1)
	},
	"start earlier": function() {
		jobs.start.setDate(jobs.start.getDate() - 1)
	},
	"undo": function() { history.undo() },
	"redo": function() { history.redo() }
}

const modifiers = { OS: true, Control: true, Alt: true, Shift: true }
const deletions = { "delete": true, "backspace": true }

function postCommand(command) {
	wasDeletion = !!deletions[command]
	if(localStorageAvailable) {
		localStorage.setItem('schedule', serializeState(jobs, hours))
	}
	updateInputFields()
	redraw()
}

document.body.addEventListener('keydown', function(evt) {
	if(evt.target === document.body) {
		if(!modifiers[evt.key]) {
			let parts = []
			if(evt.metaKey) parts.push('win')
			if(evt.ctrlKey) parts.push('ctrl')
			if(evt.altKey) parts.push('alt')
			if(evt.shiftKey) parts.push('shift')
			key = evt.key
			if(key.length === 1) key = key.toLowerCase()
			parts.push(key)
			const combo = parts.join('-')
			const command = keyBindings[combo]
			if(command != null) {
				evt.preventDefault()
				evt.stopPropagation()
				commands[command]()
				postCommand(command)
			}
		}
	} else if(evt.key === 'Escape') {
		evt.preventDefault()
		evt.stopPropagation()
		document.activeElement.blur()
		if(pending) delete pending
	}
})

const fileForm = document.getElementById('file')
// Save:
fileForm.addEventListener('submit', function(evt) {
	evt.preventDefault()
	const data = serializeState(jobs, hours).replace(' ', '%20')
	const link = N('a', {
		href: 'data:application/json,' + data,
		download: 'schedule.json',
		style: {visibility: 'hidden'}
	})
	N(form, link)
	link.click()
	form.removeChild(link)
	nameField.focus(); nameField.blur()
})

loadButton = document.getElementById('load')
loadButton.addEventListener('change', function(evt) {
	evt.preventDefault()
	if(loadButton.files.length !== 1) return
	const file = loadButton.files[0]
	file.text().then(function(json) {
		localStorage.setItem('schedule', json)
		deserializeState(json)
		history.clear()
		wasDeletion = false
		clips = []
		redraw()
	})
	nameField.focus(); nameField.blur()
})
