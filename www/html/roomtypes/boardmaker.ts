import { BaseRoom } from './base.js';
import { toId } from '../utils.js';


// Represents a question. Contains the text, points value, and the HTML element
class InputSquare{
	qInput: HTMLInputElement;
	value: number;
	div: HTMLElement;
	constructor(text: string, value: number){
		// Make all of the HTML elements needed
		this.div = document.createElement('div');
		this.div.className = 'jquestion';
		this.qInput = document.createElement('input');
		this.qInput.placeholder = text;
		this.div.appendChild(this.qInput);
		this.value = value;
	}
}

class LabelSquare{
	text: string;
	div: HTMLElement;
	constructor(text: string){
		this.text = text;
		this.div = document.createElement('div');
		this.div.className = 'jquestion';
		let node = document.createTextNode(text);
		this.div.appendChild(node);
	}
}

// Stores the board squares and text inputs for a single column
class Category{
	title: InputSquare;
	questions: InputSquare[];
	constructor(numQuestions: number){
		this.title = new InputSquare('(category title here)', 0);
		this.questions = [];
		for(let i=0 ; i < numQuestions ; i++){
			this.questions.push(new InputSquare('(question here)', (i+1)*100));
		}
	}
}


// A room that allows users to play Jeopardy
export class BoardMaker extends BaseRoom{
	boardDiv!: HTMLElement;
	categories!: Category[];
	br!: HTMLElement;
	boardName!: HTMLInputElement;
	saveBoard!: HTMLButtonElement;
	loadBoard!: HTMLButtonElement;
	listBoards!: HTMLButtonElement;
	deleteBoard!: HTMLButtonElement;
	feedback!: HTMLTextAreaElement;
	constructor(name: string, initString: string, mainDiv: HTMLElement, webSocket: WebSocket){
		super(name, initString, mainDiv, webSocket);
	}

	populateDiv(mainDiv: HTMLElement){
		// Create the board
		this.boardDiv = document.createElement('div');
		this.boardDiv.className = 'jeopardyboard'

		this.br = document.createElement('br');
		this.boardName = document.createElement('input');
		this.boardName.placeholder = 'Board Title Here';
		this.saveBoard = document.createElement('button');
		this.saveBoard.textContent = 'Save Board';
		this.saveBoard.onclick = (event) => {
			this.save();
		}
		this.loadBoard = document.createElement('button');
		this.loadBoard.textContent = 'Load Board';
		this.loadBoard.onclick = (event) => {
			this.load();
		}
		this.listBoards = document.createElement('button');
		this.listBoards.textContent = 'List Boards';
		this.listBoards.onclick = (event) => {
			this.list();
		}
		this.deleteBoard = document.createElement('button');
		this.deleteBoard.textContent = 'Delete Board';
		this.deleteBoard.onclick = (event) => {
			this.delete();
		}
		this.feedback = document.createElement('textarea');
		this.feedback.disabled = true;




		mainDiv.appendChild(this.boardDiv);
		mainDiv.appendChild(this.boardName);
		mainDiv.appendChild(this.saveBoard);
		mainDiv.appendChild(this.loadBoard);
		mainDiv.appendChild(this.listBoards);
		mainDiv.appendChild(this.deleteBoard);
		mainDiv.appendChild(this.br);
		mainDiv.appendChild(this.feedback);
	}

	fillContent(initString: string){
		// Make the categories
		this.categories = [];
		for(let i=0 ; i < 6 ; i++){
			this.categories.push(new Category(5));
		}


		this.createTable();

		this.giveFeedback('Fill out the category names and questions, give your board a name, and then hit the save button.');
	}

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
		let headerLabel = new LabelSquare('Category Name:');
		headerLabel.div.className = 'jth';
		headerRow.appendChild(headerLabel.div);
		for(let cat of this.categories){
			let th = document.createElement('th');
			th.className = 'jth';
			th.appendChild(cat.title.div);
			headerRow.appendChild(th);
		}
		table.appendChild(headerRow);

		// Add the questions
		for(let i=0 ; i < this.categories[0].questions.length ; i++){
			let tr = document.createElement('tr');
			tr.className = 'jtr';

			let rowLabel = new LabelSquare(`Question ${i+1}:`);
			let td = document.createElement('td');
			td.className = 'jtd';
			td.appendChild(rowLabel.div);
			tr.appendChild(td);

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

	save(){
		// Get the board id from the name input
		let id = toId(this.boardName.value);
		if(!id) return;

		// Construct the board string
		let boardString = '';
		for(let category of this.categories){
			let questions = category.questions.map(q=>{return `${q.qInput.value}|${q.value}`}).join('|');
			boardString = boardString + `cat|${category.title.qInput.value}|${questions}\n`;
		}

		if(localStorage.getItem(id)){
			this.giveFeedback(`Overwriting previous board ${id}...`);
		}

		//console.log(boardString);
		//console.log(boardString.trim());

		localStorage.setItem(id, boardString.trim());

		this.giveFeedback(`Saved the board as ${id}`);
	}

	load(){
		// Get the board id from the name input
		let id = toId(this.boardName.value);
		if(!id) return;

		let item = localStorage.getItem(id);
		if(item){
			let categories = [];
			let lines = item.split('\n');
			for(let line of lines){
				categories.push(lineToCategory(line));
			}
			this.categories = categories;
			this.createTable();
			//this.giveFeedback(item);
			this.giveFeedback(`Loaded the board ${id}`);
		}else{
			this.giveFeedback(`Could not find the board ${id}`);
		}
	}

	list(){
		let boards = [];
		for(let i=0 ; i < localStorage.length ; i ++){
			boards.push(localStorage.key(i));
		}
		this.giveFeedback(`Stored boards: ${boards.join(', ')}`);
	}

	delete(){
		// Get the board id from the name input
		let id = toId(this.boardName.value);
		if(!id) return;

		if(localStorage.getItem(id)){
			localStorage.removeItem(id);
			this.giveFeedback(`Removed the board ${id}.`);
		}else{
			this.giveFeedback(`The board ${id} does not exist.`);
		}
	}

	giveFeedback(text: string){
		this.feedback.value = this.feedback.value + `\n${text}`;
		this.feedback.scrollTop = this.feedback.scrollHeight;
	}
}

let lineToCategory = (line: string): Category => {
	// Take a line of text, return a category
	// cat|Category|q1|v1|q2|v2|...

	let parts = line.split('|');
	let catName = parts[1];
	let numQuestions = (parts.length-2)/2;
	let category = new Category(numQuestions);

	category.title.qInput.value = catName;
	for(let i=0 ; i < numQuestions ; i++){
		let q = category.questions[i];
		q.qInput.value = parts[2*i+2];
		q.value = parseInt(parts[2*i+3]);
	}

	//console.log(line);
	//console.log(`Made category with ${numQuestions} questions`);

	return category;
}
