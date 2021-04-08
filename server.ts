import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as WebSocket from 'ws';
import * as fs from 'fs';

// Import room types
import { BaseRoom, User } from './roomtypes/base';
import { ChatRoom } from './roomtypes/chat';
import { JeopardyRoom } from './roomtypes/jeopardy';
import { toId, cleanName } from './utils';

const httpPort = 9000;
const httpsPort = 9443;

let connectionCount = 0;

let privateKey  = fs.readFileSync('certs/privkey.pem', 'utf8');
let certificate = fs.readFileSync('certs/fullchain.pem', 'utf8');
let credentials = {key: privateKey, cert: certificate};

const app = express();

const httpServer = http.createServer(app);
const server = https.createServer(credentials, app);

const wss = new WebSocket.Server({ server });

let clients:{[id: number] : User;} = {};
let usernames:{[username: string] : User;} = {};
let rooms:{[id: string] : BaseRoom;} = {};
let roomTypes:{[id: string] : typeof BaseRoom;} = {
	'base': BaseRoom,
	'chat': ChatRoom,
	'jeopardy': JeopardyRoom
}

let changeName = (newName: string, user: User) => {
	let newId = toId(newName);
	let oldId = user.userid;
	if(usernames[newId]){
		// TODO should give an error to the client here
		return;
	}

	user.setUsername(newName);
	delete usernames[oldId];
	usernames[newId] = user;

	// Make sure all rooms acknowledge the name change
	for(let id in rooms){
		if(user.id in rooms[id].users){
			rooms[id].nameChange(oldId, user);
		}
	}

	// TODO send a message to the user to let them know the change was successful
	user.send(`|n|${user.username}`);
}

let nameIsValid = (name: string) => {
	if(name.length > 20 || name.length < 1) return false;
	if(toId(name).match(/^guest\d+$/)) return false;
	return true;
}

let main = new ChatRoom('Main', '');
rooms[main.id] = main;

wss.on('connection', (ws: WebSocket) => {
	let user = new User(connectionCount, ws);
	main.addUser(user);
	clients[connectionCount] = user;
	usernames[user.userid] = user;
	connectionCount++;
	console.log(`User joined: ${user.username}`);
	ws.on('message', (message: string) => {
		
		console.log(`message from user ${user.id}`);
		console.log(message);
		let parts = message.split('|');
		let roomid = toId(parts[0]);
		if(roomid){
			// User sent a message to a room, let the room handle it
			let room = rooms[roomid];
			if(room){
				room.receiveMessage(user, parts.slice(1));
			}
		}else{
			// This is not a chat message
			let command = toId(parts[1]);

			// TODO make a dict of functions that can be run
			if(command === 'queryrooms'){
				// User requested an updated room list
				// |queryrooms
				let roomStr = '|roomlist';
				for(let roomId in rooms){
					roomStr = roomStr + rooms[roomId].getRoomStr();
				}
				user.send(roomStr);
			}else if(command === 'createroom'){
				// User is trying to make a room
				// |createroom|roomtype|roomname|password
				let roomType = parts[2];
				let roomName = cleanName(parts[3]);
				let roomPassword = parts.slice(4).join('|');
				if(!(roomType in roomTypes)){
					user.send('|error|Invalid room type given.');
					return;
				}
				let newRoom = new roomTypes[roomType](roomName, roomPassword);
				newRoom.addUser(user);
				rooms[newRoom.id] = newRoom;
				console.log(`Made room ${roomName}`);
			}else if(command === 'join'){
				// User is trying to join a room
				// |join|roomid|roompassword
				let roomId = toId(parts[2]);
				let roomPassword = parts.slice(3).join('|');
				let room = rooms[roomId];
				if(room){
					if(room.password && room.password !== roomPassword){
						user.send('|error|Invalid password given.');
					}else{
						room.addUser(user);
					}
				}
			}else if(command === 'leave'){
				// User is trying to leave a room
				// |leave|roomid
				let roomId = toId(parts[2]);
				let room = rooms[roomId];
				if(room){
					room.removeUser(user);
					if(room.userCount === 0 && room.id !== 'main'){
						delete rooms[roomId];
					}
				}
			}else if(command === 'cn'){
				// User wants to change their name
				// |cn|newName
				// Check if the new name is valid (is not guest #, no more than 20 chars
				let newName = cleanName(parts[2]);
				if(!nameIsValid(newName)){
					// TODO Tell the user their name is invalid
					return;
				}

				changeName(newName, user);
			}
		}
		
	});

	ws.on('close', (event) => {
		console.log(`websocket closed from ${user.username}`);
		// Remove from all rooms
		for(let id in rooms){
			if(user.id in rooms[id].users){
				rooms[id].removeUser(user);
			}
		}
		// Remove user from list
		delete clients[user.id];
		delete usernames[user.userid];
	});

	user.send(`|n|${user.username}`);
});

httpServer.listen(httpPort, () => {
	console.log('Server started on port ' + httpPort);
});

server.listen(httpsPort, () => {
	console.log('Secure server started on port ' + httpsPort);
});

app.use(express.static(__dirname + '/www/html'));
