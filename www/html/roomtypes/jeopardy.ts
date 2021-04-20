import { BaseRoom } from './base.js';
import { toId } from '../utils.js';

// Represents a question. Contains the text, points value, and the HTML element
class Question{
	q: string;
	qLabel: Text;
	points: number;
	asked: boolean;
	div: HTMLElement;
	constructor(q: string, points: number, asked: boolean){
		console.log(`making question with q ${q} and points ${points}`);
		this.q = q;
		this.points = points;
		this.asked = asked;
		
		// Make all of the HTML elements needed
		this.div = document.createElement('div');
		this.div.className = this.asked ? 'jquestiona' : 'jquestion';
		if(q === ''){
			this.qLabel = document.createTextNode(`$${points}`);
		}else{
			this.qLabel = document.createTextNode(q);
		}
		this.div.appendChild(this.qLabel);
	}

	updateQuestion(newq: string){
		this.q = newq;
		this.qLabel.nodeValue = newq;
	}
}

// Each category is a column in the table
class Category{
	name: string;
	titleDiv: HTMLElement;
	titleLabel: Text;
	numQuestions: number;
	questions: Question[];
	//div: HTMLElement;
	constructor(initString: string){
		let parts = initString.split('|');
		this.name = parts[1];
		this.numQuestions = (parts.length-2)/3;
		this.questions = [];
		for(let i=0 ; i < this.numQuestions ; i++){
			this.questions.push(new Question(parts[3*i+2], parseInt(parts[3*i+3]), parts[3*i+4] === 'y'));
		}

		// Add the category title and question divs to the category div
		//this.div = document.createElement('div');
		//this.div.className = 'jcategory';
		this.titleDiv = document.createElement('div');
		this.titleDiv.className = 'jtitle';
		this.titleLabel = document.createTextNode(this.name);

		this.titleDiv.appendChild(this.titleLabel);
		//this.div.appendChild(this.titleDiv);
		//for(let question of this.questions){
			//this.div.appendChild(question.div);
		//}

	}

	setName(name: string){
		this.name = name;
		this.titleLabel.nodeValue = name;
	}
}

class Player{
	name: string;
	id: string;
	score: number;
	constructor(name: string, score: number){
		this.name = name;
		this.id = toId(name);
		this.score = score;
	}
}

// A room that allows users to play Jeopardy
export class JeopardyRoom extends BaseRoom{
	boardDiv!: HTMLElement;
	playerDiv!: HTMLElement;
	playerLabel!: Text;
	buzzButton!: HTMLButtonElement;
	textArea!: HTMLTextAreaElement;
	br!: HTMLElement;
	textInput!: HTMLInputElement;
	numCategories!: number;
	categories!: Category[];
	players: Player[];
	constructor(name: string, initString: string, mainDiv: HTMLElement, webSocket: WebSocket){
		super(name, initString, mainDiv, webSocket);
		this.players = [];
	}

	populateDiv(mainDiv: HTMLElement){
		// Create the board
		this.boardDiv = document.createElement('div');
		this.boardDiv.className = 'jeopardyboard'

		// Create the player list and the buzz button
		this.playerDiv = document.createElement('div');
		this.playerLabel = document.createTextNode('Players: ');
		this.playerDiv.appendChild(this.playerLabel);
		this.buzzButton = document.createElement('button');
		this.buzzButton.textContent = 'Buzz';
		this.buzzButton.style.visibility = 'hidden';
		this.buzzButton.disabled = true;
		this.buzzButton.onclick = (event)=>{
			this.webSocket.send(`${this.id}|buzz`);
		}

		// Create the text area and the input
		this.textArea = document.createElement('textarea');
		this.textArea.disabled = true;
		this.br = document.createElement('br');
		this.textInput = document.createElement('input');
		this.textInput.type = 'text';
		this.textInput.onkeypress = (event)=>{
			if(event.keyCode == 13 || event.which == 13){
				this.processInput(this.textInput.value);
				this.textInput.value = '';
			}
		}

		mainDiv.appendChild(this.boardDiv);
		mainDiv.appendChild(this.playerDiv);
		mainDiv.appendChild(this.buzzButton);
		mainDiv.appendChild(this.textArea);
		mainDiv.appendChild(this.br);
		mainDiv.appendChild(this.textInput);
	}

	fillContent(initString: string){
		// cat|name|q|points|q|points|q|points|...
		// hosts|n1|n2|...
		// players|p1|p2|...
		// Parse the category names, questions, and points
		let lines = initString.split('\n');
		this.categories = [];
		for(let line of lines){
			let parts = line.split('|');
			if(parts[0] === 'cat'){
				console.log('adding category');
				console.log(line);
				this.categories.push(new Category(line));
			}else if(parts[0] === 'hosts'){
			}else if(parts[0] === 'players'){
			}
		}
		this.numCategories = this.categories.length;

		this.createTable();
	}

	// (re)creates the table from the stored categories and questions
	createTable(){
		// First remove the children of the board div
		while(this.boardDiv.firstChild){
			this.boardDiv.removeChild(this.boardDiv.firstChild);
		}

		// Then, create the table from the current categories
		let table = document.createElement('table')
		table.className = 'jtable';
		let headerRow = document.createElement('tr');
		// Create the row of category titles
		for(let cat of this.categories){
			let th = document.createElement('th');
			th.className = 'jth';
			th.appendChild(cat.titleDiv);
			headerRow.appendChild(th);
		}
		table.appendChild(headerRow);

		// Add the questions
		for(let i=0 ; i < this.categories[0].numQuestions ; i++){
			let tr = document.createElement('tr');
			tr.className = 'jtr';

			for(let cat of this.categories){
				let td = document.createElement('td');
				td.className = 'jtd';
				td.appendChild(cat.questions[i].div);
				tr.appendChild(td);
			}
			table.appendChild(tr);
		}

		this.boardDiv.appendChild(table);
	}

	processInput(text: string){
		// Check if it is a command
		if(text[0] === '/'){
			let command = text.split(' ')[0].slice(1);
			let args = text.slice(command.length+2).split(',');
			if(text.length <= command.length+2){
				args = [];
			}
			console.log(command);
			console.log(args);
			if(command === 'q'){
				this.webSocket.send(`${this.id}|q|${args[0]}|${args[1]}|${args.slice(2).join(',')}`);
			}else if(command === 'show' || command === 'ask'){
				this.webSocket.send(`${this.id}|show|${args[0]}|${args[1]}`);
			}else if(command === 'cat'){
				this.webSocket.send(`${this.id}|cat|${args[0]}|${args.slice(1).join(',')}`);
			}else if(command === 'spec'){
				this.webSocket.send(`${this.id}|spec|${args[0]}`);
			}else if(command === 'player'){
				this.webSocket.send(`${this.id}|player|${args[0]}`);
			}else if(command === 'buzzon'){
				this.webSocket.send(`${this.id}|buzzon`);
			}else if(command === 'buzzoff'){
				this.webSocket.send(`${this.id}|buzzoff`);
			}else if(command === 'correct'){
				this.webSocket.send(`${this.id}|correct|${args[0]}|${args[1]}|${args[2]}`);
			}else if(command === 'board'){
				this.sendBoard(args[0]);
			}else if(command === 'inc'){
				this.webSocket.send(`${this.id}|inc|${args[0]}`);
			}else{
				this.giveFeedback(`The command '${command}' was not found.`);
			}
		}else{
			this.webSocket.send(this.id+'|t|'+this.textInput.value);
		}
	}

	receiveMessage(messageParts: string[]){
		if(messageParts[0] === 't'){
			if(this.textArea){
				this.giveFeedback(messageParts.slice(1).join('|'));
			}
		}else if(messageParts[0] === 'q'){
			this.updateQuestion(messageParts);
		}else if(messageParts[0] === 'cat'){
			this.updateCategory(messageParts);
		}else if(messageParts[0] === 'spec'){
			this.setSpectator(messageParts[1]);
		}else if(messageParts[0] === 'player'){
			this.updatePlayer(messageParts[1], parseInt(messageParts[2]));
		}else if(messageParts[0] === 'ui'){
			this.updateUI(messageParts[1]);
		}else if(messageParts[0] === 'cantbuzz'){
			this.buzzButton.disabled = true;
		}else if(messageParts[0] === 'canbuzz'){
			this.buzzButton.disabled = false;
		}else if(messageParts[0] === 'board'){
			// The client should remake their board
			this.replaceBoard(messageParts);
		}else if(messageParts[0] === 'cn'){
			this.updateName(messageParts[1], messageParts[2]);
		}
	}

	isValid(catNumber: number, qNumber: number): boolean {
		if (isNaN(catNumber) || isNaN(qNumber) || catNumber < 0 || catNumber > this.categories.length || qNumber < 0 || qNumber >= this.categories[catNumber].numQuestions) return false;
		return true;
	}

	updateQuestion(parts: string[]){
		// q|cat#|q#|question
		let catNumber = parseInt(parts[1]);
		let qNumber = parseInt(parts[2]);
		if(!this.isValid(catNumber, qNumber)) return;

		let qText = parts.slice(4).join('|');
		let question = this.categories[catNumber].questions[qNumber];
		question.updateQuestion(qText);

		// Change its style if it has been asked
		if(parts[3] === 'y') question.div.className = 'jquestiona';
	}

	updateCategory(parts: string[]){
		// cat|cat#|Cagegory
		let catNumber = parseInt(parts[1]);
		if(isNaN(catNumber) || catNumber < 0 || catNumber >= this.categories.length) return;

		let catText = parts.slice(2).join('|');
		this.categories[catNumber].setName(catText);

	}

	// Set a player to be a spectator (remove them from the player list)
	setSpectator(userid: string){
		for(let i=0 ; i < this.players.length ; i++){
			if(this.players[i].id === userid){
				this.players.splice(i,1);
				break;
			}
		}

		this.drawPlayerList();
	}

	// Updates a player's name if required
	updateName(oldName: string, newName: string){
		let oldId = toId(oldName);
		for(let player of this.players){
			if(player.id === oldId){
				player.name = newName;
				player.id = toId(newName);
				this.drawPlayerList();
				return;
			}
		}
	}

	// Updates the given player's score, or add them if they do not exist
	updatePlayer(username: string, score: number){
		let playerExists = false;
		let userid = toId(username);
		for(let player of this.players){
			if(player.id === userid){
				player.score = score;
				playerExists = true;
				break;
			}
		}

		if(!playerExists){
			this.players.push(new Player(username, score));
		}

		this.drawPlayerList();
	}

	// Update the text node that displays the player list
	drawPlayerList(){
		this.playerLabel.nodeValue = `Players: ${this.players.map(e=>{return `${e.name} ($${e.score})`}).join(', ')}`;
	}

	updateUI(state: string){
		if(state === 'spec'){
			// Hide the buzz button
			this.buzzButton.style.visibility = 'hidden';
		}else if(state === 'player'){
			// Show the buzz button
			this.buzzButton.style.visibility = 'visible';
		}
	}

	// Sends a saved board to the server to replace the current one
	sendBoard(boardName: string){
		// Sent board has the form
		// roomid|board|
		// cat|Category|q1|v1|q2|v2...
		// cat|Category|...
		// ...
		
		let boardId = toId(boardName);
		let boardStr = localStorage.getItem(boardId);
		if(boardStr){
			let message = `${this.id}|board|\n${boardStr}`;
			this.webSocket.send(message);
		}else{
			this.giveFeedback(`The saved board '${boardName}' could not be found.`);
		}
	}

	// This function will update the whole board and then broadcast it to all players
	replaceBoard(messageParts: string[]){
		// First, reconstruct the original message
		let message = messageParts.join('|');
		let lines = message.split('\n').slice(1);

		// Create the new list of categories
		let newCategories = [];
		for(let i=0 ; i < lines.length ; i++){
			newCategories.push(new Category(lines[i]));
		}

		// Replace the existing list and broadcast the change
		this.categories = newCategories;
		this.createTable();
	}

	giveFeedback(text: string){
		this.textArea.value = this.textArea.value + '\n' + text;
		this.textArea.scrollTop = this.textArea.scrollHeight;
	}

	disable(){
		this.textArea.value = this.textArea.value + '\n There was an error in the websocket. The server may not be running.';
		this.textInput.disabled = true;
	}
}
