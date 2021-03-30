let webSocket = new WebSocket('wss://www.cclarry.ca:9443');

import { toId } from './utils.js';

// Import the room types
import { BaseRoom } from './roomtypes/base.js';
import { ChatRoom } from './roomtypes/chat.js';
import { JeopardyRoom } from './roomtypes/jeopardy.js';
import { BoardMaker } from './roomtypes/boardmaker.js';

webSocket.onopen = ()=>{
	webSocket.send('|queryrooms');
}
webSocket.onerror = ()=>{
	// TODO call disable() function on all rooms
}

let rooms:{[id: string] : BaseRoom;} = {}; 
let currentRoom: string = '';
let roomTypes:{[id: string] : typeof BaseRoom;} = {
	base: BaseRoom,
	chat: ChatRoom,
	jeopardy: JeopardyRoom,
	boardmaker: BoardMaker
}


let mainDiv: HTMLElement;
let roomSelect: HTMLSelectElement;

let roomBrowser: HTMLElement;
let roomToggleButton: HTMLButtonElement;
let roomToggleButton2: HTMLButtonElement;
let showSidebar = false;

// Room creation elements
let createRoomButton: HTMLInputElement;
let roomNameInput: HTMLInputElement;
let roomTypeInput: HTMLSelectElement;
let roomPasswordInput: HTMLInputElement;

// Room list elements
let refreshRoomsButton: HTMLInputElement;
let roomListDiv: HTMLElement;
let roomListTable: HTMLElement;

webSocket.onmessage = (event)=>{
    console.log(event.data);
    console.log(event);
    let parts = event.data.split('|');
	console.log(parts);
    if(!parts[0]){
        // This message shouldn't be displayed in a chat
        // |command identifier|data
		if(parts[1] === 'roomlist'){
			updateRoomList(parts.slice(2));
		}else if(parts[1] === 'init'){
			// Initialize a room
			let roomType = parts[2];
			let roomName = parts[3];
			let initText = parts.slice(4).join('|');
			initRoom(roomType, roomName, initText);
		}else if(parts[1] === 'deinit'){
			// Destroy a room
			deinitRoom(parts[2]);
		}
    }else{
		if(rooms[parts[0]]){
			rooms[parts[0]].receiveMessage(parts.slice(1));
		}
    }
}

window.onload = ()=>{
	// Get all of the HTML elements that will be needed
	roomBrowser = (<HTMLElement>document.getElementById('sidenav'));
	roomToggleButton = (<HTMLButtonElement>document.getElementById('roomtoggle'));
	roomToggleButton2 = (<HTMLButtonElement>document.getElementById('roomtoggle2'));
    createRoomButton = (<HTMLInputElement>document.getElementById('createroombutton'));
    roomNameInput = (<HTMLInputElement>document.getElementById('roomname'));
    roomTypeInput = (<HTMLSelectElement>document.getElementById('roomtype'));
    roomPasswordInput = (<HTMLInputElement>document.getElementById('roompassword'));
    refreshRoomsButton = (<HTMLInputElement>document.getElementById('refreshroomsbutton'));
    roomListDiv = (<HTMLElement>document.getElementById('roomlist'));
    roomListTable = (<HTMLElement>document.getElementById('roomtable'));
    mainDiv = (<HTMLElement>document.getElementById('roompane'));
	roomSelect = (<HTMLSelectElement>document.getElementById('roomselect'));

	// Set up event listeners on elements that the user can interact with
	createRoomButton.onclick = (event)=>{
		requestCreateRoom();
	}

	roomToggleButton.onclick = (event)=>{
		toggleSidebar();
	}
	roomToggleButton2.onclick = (event)=>{
		toggleSidebar();
	}

	refreshRoomsButton.onclick = (event)=>{
		webSocket.send('|queryrooms');
	}

	roomSelect.oninput = (event)=>{
		switchRoom(roomSelect.value);
	}

	for(let id in roomTypes){
		let option = document.createElement('option');
		option.value = id;
		option.text = id;
		roomTypeInput.add(option);
	}
	
	initRoom('boardmaker', 'Jeopardy Board Maker', '');
}

// Used to send a request to the server to create a new room
let requestCreateRoom = ()=>{
	// Get the name of the room and other options
	let roomName = roomNameInput.value;
	let roomType = toId(roomTypeInput.value);
	let roomPassword = roomPasswordInput.value;
	if(roomName.includes('|') || roomName.includes(',')){
		// TODO display an error if the room name has a |
		return;
	}else if(rooms[toId(roomName)]){
		// TODO display an error when trying to make a room that exists
		return;
	}
	webSocket.send(`|createroom|${roomType}|${roomName}|${roomPassword}`);
}

// Updates the client's list of rooms when a room list update is received from the server
let updateRoomList = (roomIds: string[])=>{
	console.log('updating room list:');
	console.log(roomIds);
	while(roomListTable.lastChild){
		roomListTable.removeChild(roomListTable.lastChild);
	}
	for(let entry of roomIds){
		let tr = createRoomListing(entry);
		roomListTable.appendChild(tr);
	}
}

// Creates a table element to be put in the room browser
let createRoomListing = function(roomStr: string): HTMLElement {
	let parts = roomStr.split(',');

	// Parse name, user count, and password
	let roomName = parts[0];
	let roomId = toId(roomName);
	let userCount = parseInt(parts[1]);

	// Create an entry for the room: name, player count, needs password
	let td = document.createElement('td');
	td.className = 'roomtd';

	// Left div contains room name, and password field if required
	let lDiv = document.createElement('div');
	lDiv.className = 'ldiv';
	let topDiv = document.createElement('div');
	topDiv.textContent = roomName;
	let br = document.createElement('br');
	let pwLabel = document.createTextNode('Password: ');
	let pwField = document.createElement('input');
	pwField.type = 'password';
	lDiv.appendChild(topDiv);
	lDiv.appendChild(br);
	if(parts[2] == 'y'){
		lDiv.appendChild(pwLabel);
		lDiv.appendChild(pwField);
	}

	// Right div contains password status, user count, and join button
	let rDiv = document.createElement('div');
	rDiv.className = 'rdiv';
	let countLabel = document.createTextNode(`Users: ${userCount}`);
	br = document.createElement('br');
	let joinButton = document.createElement('button');
	if(!(roomId in rooms)){
		joinButton.textContent = 'Join';
		joinButton.onclick = (event)=>{
			webSocket.send(`|join|${roomId}|${pwField.value}`);
		}
	}else{
		joinButton.textContent = 'Leave';
		joinButton.onclick = (event)=>{
			webSocket.send(`|leave|${roomId}`);
		}
	}
	rDiv.appendChild(countLabel);
	rDiv.appendChild(br);
	rDiv.appendChild(joinButton);

	td.appendChild(lDiv);
	td.appendChild(rDiv);
	let tr = document.createElement('tr');
	tr.appendChild(td);
	return tr;
}

let initRoom = (roomType: string, name: string, initText: string)=>{
	let roomId = toId(name);
	if(roomTypes[roomType]){
		if(!rooms[roomId]){
			// We're good to make the new room
			let roomDiv = document.createElement('div');
			let room = new roomTypes[roomType](name, initText, roomDiv, webSocket);
			rooms[roomId] = room;
			roomSelect.add(room.option);
			switchRoom(roomId);
		}else{
			// trying to init a room that already exists
		}
	}else{
		// Unrecognized room type
	}
}

let deinitRoom = (name: string)=>{
	let roomId = toId(name);
	let isCurrentRoom = currentRoom === roomId;
	let room = rooms[roomId];
	if(room){
		// Remove the room from the select
		roomSelect.removeChild(room.option);

		// If we're leaving our current room, we should switch
		if(isCurrentRoom){
			if(roomSelect.firstChild){
				switchRoom((<HTMLOptionElement>roomSelect.firstChild).value);
			}else{
				switchRoom('');
			}
		}

		delete rooms[roomId];
	}
}

// Set/switch the active room.
let switchRoom = (roomId: string)=>{
	if(roomId === currentRoom) return;
	if(rooms[currentRoom]) mainDiv.removeChild(rooms[currentRoom].mainDiv);
	currentRoom = roomId;
	if(rooms[currentRoom]) mainDiv.appendChild(rooms[currentRoom].mainDiv);
	if(roomSelect.value !== roomId) roomSelect.value = roomId;
}

let toggleSidebar = ()=>{
	showSidebar = !showSidebar;
	if(showSidebar){
		roomBrowser.style.width = "500px";
	}else{
		roomBrowser.style.width = "0px";
	}
}
