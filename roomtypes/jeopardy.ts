import { BaseRoom, User } from './base';
import { toId } from '../utils';

class Player{
	user: User;
	score: number;
	constructor(user: User){
		this.user = user;
		this.score = 0;
	}
}

class Question{
	catNumber: number;
	qNumber: number;
	value: number;
	q: string;
	dailyDouble: boolean;
	asked: boolean;
	constructor(catNumber: number, qNumber: number, q: string, value: number){
		this.catNumber = catNumber;
		this.qNumber = qNumber;
		this.value = value;
		this.q = q;
		this.dailyDouble = false;
		this.asked = false;
	}
}

class Category{
	catNumber: number;
	name: string;
	numQuestions: number;
	questions: Question[];
	constructor(catNumber: number, name: string, numQuestions: number, multiplier: number){
		this.catNumber = catNumber
		this.name = name;
		this.numQuestions = numQuestions;
		this.questions = [];
		for(let i=0 ; i < numQuestions ; i++){
			this.questions.push(new Question(catNumber, i, '', (i+1)*multiplier*100));
		}
	}
}

// A room for playing Jeopardy
export class JeopardyRoom extends BaseRoom{
	// Needs to store the questions/categories, the host, the players
	categories!: Category[];
	players: Player[];
	buzzList: Player[];
	enableBuzz: boolean;
	hosts: User[];
	constructor(name: string, password: string){
		super(name, password);
		this.roomType = 'jeopardy';
		this.createBoard(1, false);
		this.players = [];
		this.buzzList = [];
		this.enableBuzz = false;
		this.hosts = [];
	}

	// Creates/remakes the board, with the specified multiplier
	createBoard(multiplier: number, shouldBroadcast: boolean){
		this.categories = [];
		for(let i=0 ; i < 6 ; i++){
			this.categories.push(new Category(i, `Category ${i}`, 5, multiplier));
		}

		if(shouldBroadcast){
			this.broadcastBoard();
		}
	}

	// Gets a string representing the board. Each category is one line of the form
	// cat|Name|q1|$1|q2|$2|q3|$3...
	getBoardString(showHidden: boolean): string {
		let boardString = '';
		let first = true;
		for(let category of this.categories){
			let catMessage = `cat|${category.name}`;
			if(!first){
				catMessage = '\n' + catMessage;
			}else{
				first = false;
			}
			for(let question of category.questions){
				if(showHidden || question.asked){
					// If the question has been asked or the board is for a host, we can show the question
					catMessage = catMessage + `|${question.q}|${question.value}`;
				}else{
					catMessage = catMessage + `||${question.value}`;
				}
			}
			boardString = boardString + catMessage;
		}
		return boardString;
	}

	addUser(user: User){
		if(this.users[user.id]) return;
		this.users[user.id] = user;
		this.sendInit(user);
		this.userCount += 1;
		if(this.userCount === 1){
			this.hosts.push(user);
			console.log('added host');
		}
	}

	sendInit(user: User){
		let initMessage = `|init|jeopardy|${this.name}|Welcome to ${this.name}`;
		initMessage = `${initMessage}\n${this.getBoardString(false)}`;
		user.send(initMessage);
	}

	broadcastMessage(message: string){
		for(let i in this.users){
			this.users[i].send(message);
		}
	}

	// Called when a user sends a message to a room.
	// Checks if the user is in the room, then calls an appropriate function to process it.
	receiveMessage(from: User, messageParts: string[]){
		if(!this.users[from.id]){
			// User tried sending message to a room they aren't in
			return;
		}
		console.log('receiveMessage');
		console.log(messageParts);
		if(messageParts[0] === 't'){
			// Text message should be broadcast to other users
			let textMessage = messageParts.slice(1).join('|');
			this.broadcastMessage(`${this.id}|t|${from.username}: ${textMessage}`);
		}else if(messageParts[0] === 'q'){
			// Someone requested a question update
			// q|cat#|q#|Question
			// First check if that user is a host
			if(this.isHost(from)){
				let catNumber = parseInt(messageParts[1]);
				let qNumber = parseInt(messageParts[2]);
				let q = messageParts.slice(3).join('|').trim();
				this.changeQuestion(catNumber, qNumber, q);
			}
		}else if(messageParts[0] === 'show' || messageParts[0] === 'ask'){
			// Someone requested a question to be shown
			// q|cat#|q#|Question
			if(this.isHost(from)){
				let catNumber = parseInt(messageParts[1]);
				let qNumber = parseInt(messageParts[2]);
				this.showQuestion(catNumber, qNumber);
			}
		}else if(messageParts[0] === 'cat'){
			// Someone requested a category update
			// q|cat#|Category
			// First check if that user is a host
			if(this.isHost(from)){
				let catNumber = parseInt(messageParts[1]);
				let catText = messageParts.slice(2).join('|').trim();
				this.changeCategory(catNumber, catText);
			}
		}else if(messageParts[0] === 'spec'){
			// Someone requested a user be changed to spectator
			// spec|userid
			// First check if the sender is a host
			if(this.isHost(from)){
				let userid = parseInt(messageParts[1]);
				this.setSpectator(userid);
			}
		}else if(messageParts[0] === 'player'){
			// Someone requested a user be changed to spectator
			// spec|userid
			// First check if the sender is a host
			if(this.isHost(from)){
				let userid = parseInt(messageParts[1]);
				this.setPlayer(userid);
			}
		}else if(messageParts[0] === 'buzz'){
			// When a user buzzes in
			this.buzzIn(from);
		}else if(messageParts[0] === 'correct'){
			// When the hosts indicates that a user got a question right
			if(this.isHost(from)){
				let catNumber = parseInt(messageParts[1]);
				let qNumber = parseInt(messageParts[2]);
				let userid = parseInt(messageParts[3]);
				this.correctAnswer(catNumber, qNumber, userid);
			}
		}else if(messageParts[0] === 'buzzon'){
			// Used by the host to enable buzzing
			if(this.isHost(from)){
				this.setBuzzing(true);
			}
		}else if(messageParts[0] === 'buzzoff'){
			// Used by the host to disable buzzing
			if(this.isHost(from)){
				this.setBuzzing(false);
			}
		}
	}

	// Marks a user as a spectator
	setSpectator(userid: number){
		// Check that the id specifies a valid player
		if(!this.idIsPlayer(userid)) return;

		for(let i=0 ; i < this.players.length ; i++){
			if(this.players[i].user.id === userid){
				// Tell all users that userid is now a spectator
				this.broadcastMessage(`${this.id}|spec|${toId(this.players[i].user.username)}`);
				// Tell userid that they should update their ui
				this.players[i].user.send(`${this.id}|ui|spec`);
				// Remove userid from the player list
				this.players.splice(i,1);
				break;
			}
		}
	}

	// Marks a user as a player
	setPlayer(userid: number){
		// Check that the id specifies a valid spectator
		if(!this.idIsSpectator(userid)) return;

		// Create a player object and add it to the list
		let user = this.users[userid];
		let player = new Player(user);
		this.players.push(player);

		// Send the player update to all users
		this.broadcastMessage(`${this.id}|player|${user.username}|${player.score}`);

		// Send the player the command to enable their player display
		user.send(`${this.id}|ui|player`);
	}

	// Gets a player object
	getPlayer(userid: number): Player | undefined {
		for(let player of this.players){
			if(player.user.id === userid) return player;
		}
		return;
	}

	idIsPlayer(userid: number): boolean {
		// may need to remove the check for this.users[userid], otherwise breaks when someone leaves
		if(isNaN(userid) || !this.users[userid]) return false;

		for(let player of this.players){
			if(player.user.id === userid) return true;
		}

		return false;
	}

	idIsSpectator(userid: number): boolean {
		// userid is in the user list, but they are not a player or a host
		if(isNaN(userid) || !this.users[userid]) return false;

		if(this.isHost(this.users[userid]) || this.idIsPlayer(userid)) return false;

		return true;
	}

	// Checks if a user is a host
	isHost(user: User): boolean {
		return this.hosts.includes(user);
	}

	// Checks if a user is allowed to buzz in
	canBuzz(user: User){
		for(let player of this.buzzList){
			if(player.user.id === user.id) return true;
		}
		return false;
	}

	// Checks if a category+question number is valid
	isValid(catNumber: number, qNumber: number): boolean {
		if (isNaN(catNumber) || isNaN(qNumber) || catNumber < 0 || catNumber > this.categories.length || qNumber < 0 || qNumber >= this.categories[catNumber].numQuestions) return false;
		return true;
	}

	// Updates the text of a question, and broadcasts the change
	changeQuestion(catNumber: number, qNumber: number, qString: string){
		// Check if the indices specify a valid question
		if (!this.isValid(catNumber, qNumber)) return;

		// Everything is okay here, so we can update the question and send the updates
		let question = this.categories[catNumber].questions[qNumber];

		question.q = qString;

		this.broadcastQuestion(question);
	}

	// Sets a question as asked, and shows it to all players
	showQuestion(catNumber: number, qNumber: number){
		// Check if the indices specify a valid question
		if (!this.isValid(catNumber, qNumber)) return;

		// Allow all players to buzz in
		this.buzzList = this.players.slice(0);
		this.setBuzzing(true);

		let question = this.categories[catNumber].questions[qNumber];

		question.asked = true;

		this.broadcastQuestion(question);
	}

	// Awards points to a player
	correctAnswer(catNumber: number, qNumber: number, userid: number){
		if(!this.isValid(catNumber, qNumber) || !this.idIsPlayer(userid)) return;

		// turn off buzzing
		this.setBuzzing(false);

		// add the question's value to the player's score and send an update
		let player = this.getPlayer(userid);
		if(player){
			let value = this.categories[catNumber].questions[qNumber].value;
			player.score = player.score + value;
			this.broadcastMessage(`${this.id}|player|${player.user.username}|${player.score}`);
		}
	}

	// Changes the name of a category
	changeCategory(catNumber: number, catString: string){
		// Check if the indices specify a valid question
		if (isNaN(catNumber) || catNumber < 0 || catNumber >= this.categories.length) return;

		// Everything is okay here, so we can update the question and send the updates
		let category = this.categories[catNumber];

		category.name = catString;

		// Category changes will always be broadcast
		for(let id in this.users){
			this.users[id].send(`${this.id}|cat|${catNumber}|${catString}`);
		}
	}

	// buzzIn
	buzzIn(user: User){
		if(!this.canBuzz(user) || !this.enableBuzz) return;

		// Remove this user from the buzz list so they can't do it more than once
		for(let i=0 ; i < this.buzzList.length ; i++){
			if(user.id === this.buzzList[i].user.id){
				this.buzzList.splice(i,1);
				break;
			}
		}

		// Disallow others from buzzing in
		this.setBuzzing(false);
		
		this.broadcastMessage(`${this.id}|t|${user.username} has buzzed in!`);
	}

	// Enable/disable buzzing
	setBuzzing(enabled: boolean){
		this.enableBuzz = enabled;
		console.log(`setting buzzing to ${enabled}`);
		if(enabled){
			for(let player of this.buzzList){
				player.user.send(`${this.id}|canbuzz`);
			}
		}else{
			for(let player of this.players){
				player.user.send(`${this.id}|cantbuzz`);
			}
		}
	}

	// For broadcasting question for updating
	broadcastQuestion(question: Question){
		if(question.asked){
			// If the question is visible, broadcast it to all users
			for(let id in this.users){
				this.users[id].send(`${this.id}|q|${question.catNumber}|${question.qNumber}|${question.q}`);
			}
		}else{
			// If the question is not visible, broadcast to hosts
			for(let user of this.hosts){
				user.send(`${this.id}|q|${question.catNumber}|${question.qNumber}|${question.q}`);
			}
		}
	}

	// This will cause all clients to fully remake their board
	broadcastBoard(){
		let hostBoard = this.getBoardString(true);
		let playerBoard = this.getBoardString(false);
		let hostMessage = `${this.id}|board\n${hostBoard}`;
		let playerMessage = `${this.id}|board\n${playerBoard}`;
		for(let id in this.users){
			let player = this.users[id];
			if(this.isHost(player)){
				player.send(hostMessage);
			}else{
				player.send(playerMessage);
			}
		}
	}
}
