var output;

var characters = [];
var story = [];

var currentCharacter = null;
var currentState = null;
var currentAction = null;

var stateInteractions = {
	"sad": {
		"text": "sad",
		"leads_to": {
			"leave": {
				"weight": 5,
			},
			"character_introduction": {
				"weight": 2,
			},
		},
	},
	"angry": {
		"text": "angry",
		"leads_to": {
			"violence": {
				"weight": 10,
			},
			"insults": {
				"weight": 10,
			},
			"death": {
				"weight": 1,
			},
		},
	},
	"wounded": 
	{
		"text": "wounded",
		"leads_to": {
			"death": {
				"weight": 7,
			},
			"leave": {
				"weight": 3,
			},
			"violence": {
				"weight": 5,
			},
			"character_introduction": {
				"weight": 2,
			},
		},
	},
};

var actionInteractions = {
	"character_introduction": {
		"text": "There was someone by the name of ${CURRENTNAMETOKEN}.",
		"effect": {
			"affects": "new",
			"new_character": "any",
			"state": {
				"random": {
					"weight": 1,
				},
			},
		},
	},
	"insults": {
		"text": "${CURRENTNAMETOKEN} called ${RANDOMONENAMETOKEN} a ${RANDOMTERM}.",
		"terms": ["newt","shrubbery","poor excuse for a ghost"],
		"require": {
			"character_count": {"greater_than_or_equal_to": 2},
		},
		"effect": {
			"affects": "randomOneNotCurrent",
			"state": {
				"sad": {
					"weight": 3,
				},
				"angry": {
					"weight": 7,
				},
			}
		},
	},
	"violence": {
		"text": "${CURRENTNAMETOKEN} ${RANDOMTERM} ${RANDOMONENAMETOKEN}.",
		"terms": ["hit","slapped","bifurcated"],
		"require": {
			"character_count": {"greater_than_or_equal_to": 2},
		},
		"effect": {
			"affects": "randomOneNotCurrent",
			"state": {
				"sad": {
					"weight": 1,
				},
				"angry": {
					"weight": 5,
				},
				"wounded": {
					"weight": 10,
				},
			}
		},
	},
	"death": {
		"text": "And so, ${CURRENTNAMETOKEN} has died.",
		"effect": {
			"affects": "current",
			"remove_character": "current",
		},
	},
	"leave": {
		"text": "And so, ${CURRENTNAMETOKEN} leaves the scene.",
		"effect":  {
			"affects": "current",
			"remove_character": "current",
		},
	},
};

function startEventLoop()
{
	// beginning
	addToStory("Once upon a time...");
	currentAction = "character_introduction";
	eventLoop();
}

function eventLoop()
{
	if((characters.length === 0 || (currentAction && currentAction.isEnd)) && currentAction !== "character_introduction")
	{
		addToStory("The End.");
		return;
	}
	
	if(!currentCharacter)
	{
		currentCharacter = randomElementInArray(characters);
	}	
	
	if(currentState)
	{
		var state = getState(currentState);		
		var text = currentCharacter.name + " was " + state.text + ".";
		addToStory(text);
		currentCharacter.addHistory(text);
		currentAction = randomWeightedElement(state.leads_to);
	}
	
	if(currentAction)
	{
		var action = getAction(currentAction);
		var terms = action.terms;
		var text = action.text;
		var require = processActionRequire(action);
		if(!require)
		{
			eventLoop();
			return;
		}
		
		// process 
		var affects = processActionEffect(action);
		
		// predetermined randoms for consistency's sake
		var currentName = currentCharacter.name;
		var randomTerm = terms ? randomElementInArray(terms) : "";
		var randomOneCharacter = affects[0];
		var randomOneCharacterName = randomOneCharacter ? randomOneCharacter.name : "";
		
		text = replaceAll(text, "${CURRENTNAMETOKEN}", currentName);
		text = replaceAll(text, "${RANDOMONENAMETOKEN}", randomOneCharacterName);
		text = replaceAll(text, "${RANDOMTERM}", randomTerm);
		
		addToStory(text);
		currentCharacter.addHistory(text);
		
		// end replace
		if(characters.indexOf(currentCharacter) <= -1)
		{
			currentCharacter = null;
			currentCharacter = randomElementInArray(characters);
		}
		else 
		{
			currentCharacter = randomElementInArray(affects);
		}
		currentAction = null;
	}
	
	eventLoop();
}

function processActionRequire(action)
{
	var require = action.require;
	
	for(var requirement in require)
	{
		var value;
		if(requirement === "character_count")
		{
			value = characters.length;
		}
		
		if(!processRequirement(value, require[requirement])) return false;
	}
	
	return true;
}

function processRequirement(value, requirement)
{
	for(var comparison in requirement)
	{
		switch(comparison)
		{
			case "less_than": 
				if(!(value < requirement[comparison])) return false;
				break;
			case "greater_than":
				if(!(value > requirement[comparison])) return false;
				break;
			case "equal_to":
				if(!(value == requirement[comparison])) return false;
				break;
			case "greater_than_or_equal_to":
				if(!(value >= requirement[comparison])) return false;
				break;
			case "less_than_or_equal_to": 
				if(!(value <= requirement[comparison])) return false;
				break;
			default: 
		}
	}
	
	return true;
}

function processActionEffect(action)
{
	var effect = action.effect;
	var affects = getEffectAffectsCharacters(effect);
	
	for(var index = 0; index < affects.length; index++)
	{
		var character = affects[index];
		
		if(character === "NEWTOKEN")
		{
			if(effect.new_character)
			{
				var character = new Character();
				addCharacter(character);
				currentCharacter = character;
				
				replaceElementInArray(affects, "NEWTOKEN", character);
			}
			if(effect.state)
			{
				currentState = randomWeightedElement(effect.state);
			}
		}
		else if (!character)
		{
			// invalid token
			console.log("processActionEffect(effect): invalid character token " + character);
			continue;
		}
		else 
		{
			if(effect.new_character)
			{
				var character = new Character();
				addCharacter(new Character());
			}
			if(effect.remove_character)
			{
				removeCharacter(character);
			}
			if(effect.state)
			{
				currentState = randomWeightedElement(effect.state);
			}
		}
	}
	
	return affects;
}

function getEffectAffectsCharacters(effect)
{
	switch(effect.affects)
	{	
		case "randomOneNotCurrent": 
			return [randomElementInArrayExcludingOne(characters, currentCharacter)];
			break;
		case "randomOne":
			return [randomElementInArray(characters)];
			break;
		case "new": 
			return ["NEWTOKEN"];
			break;
		case "any":
			return characters;
			break;
		case "current":
			if(currentCharacter)
			{
				return [currentCharacter];
				break;
			}
		default:
			return [];
	}
}

function Character()
{
	this.name = randomString(randomInteger(3,8));
	this.history = [];
}

Character.prototype.addHistory = function(text)
{
	this.history.push(text);
}

function addCharacter(character)
{
	characters.push(character);
}

function removeCharacter(character)
{
	removeElementInArray(characters, character);
}

function getState(key)
{
	if(key === "random")
	{
		return randomPropertyInObject(stateInteractions);
	}
	else if(stateInteractions[key])
	{
		return stateInteractions[key];
	}
	else 
	{
		throw "getState(key): state not found.";
	}
}

function getAction(key)
{
	if(actionInteractions[key])
	{
		return actionInteractions[key];
	}
	else 
	{
		throw "getAction(key): state not found.";
	}
}

/**
	Takes in a set of elements with format:
		{
			"element": {
				"weight": x
			}
		}
	
	and returns one element key with format string: 
		"element"
 */
function randomWeightedElement(set)
{
	if(Object.keys(set).length < 1) 
	{
		throw "randomWeightedElement(set): set is empty exception.";
	}
	
	var sumOfWeights = 0;
	for(var element in set)
	{
		var weight = set[element].weight;
		// in case weight is undefined, in which case that casts to zero
		sumOfWeights += weight ? weight : 0;
	}
	
	var randomNumber = Math.random() * sumOfWeights;
	var elapsedSum = 0;
	for(var element in set)
	{
		var weight = set[element].weight;
		// in case weight is undefined, in which case that casts to zero
		elapsedSum += weight ? weight : 0;
		if(randomNumber <= elapsedSum) return element;
	}
	
	// if we ever get here, that means something is seriously wrong, and we should throw an exception.
	throw "randomWeightedElement(set): error in method, unable to return an element from random set.";
}

function randomElementInArray(array)
{
	return array[randomIndex(array.length)];
}

function randomElementInArrayExcludingOne(array, excludedElement)
{
	if(array.length === 1)
	{
		if(array[0] === excludedElement)
		{
			return null;
		}
	}
	
	var element = null;
	while(!element)
	{
		element = randomElementInArray(array);
		if(element === excludedElement) element = null;
	}
	return element;
}

function randomKeyInObject(object)
{
	return randomElementInArray(Object.keys(object));
}

function randomPropertyInObject(object)
{
	return object[randomElementInArray(Object.keys(object))];
}

// min inclusive, max exclsusive
function randomIndex(max)
{
	return Math.floor(randomNumber(0,max));
}

// min and max inclusive
function randomInteger(min, max)
{
	return Math.round(randomNumber(min,max));
}

// min and max inclusive
function randomNumber(min, max)
{
	return Math.random() * (max - min) + min;
}

// random for each character, uses only latin a-z
function randomString(length)
{
	var string = "";
	var charset = "abcdefghijklmnopqrstuvwxyz";
	for(var i = 0; i < length; i++)
	{
		var index = randomIndex(charset.length);
		string += charset.substring(index, index + 1);
	}
	return string;
}

function removeElementInArray(array, element)
{
	for(var index = 0, length = array.length; index < array.length; index++)
	{
		if(array[index] === element)
		{
			array.splice(index,1);
			return true;
		}
	}
	return false;
}

function replaceElementInArray(array, element, newElement)
{
	for(var index = 0, length = array.length; index < array.length; index++)
	{
		if(array[index] === element)
		{
			array.splice(index,1,newElement);
			return true;
		}
	}
	return false;
}

function replaceAll(text, string, replaceString)
{
	var newText = text;
	while(newText.indexOf(string) > -1)
	{
		newText = newText.replace(string, replaceString);
	}
	return newText;
}

function initialize()
{
	output = document.getElementById("output");
	
	startEventLoop();
}

function addToStory(text)
{
	story.push(text);
	
	var element = document.createElement("p");
	element.appendChild(document.createTextNode(text));
	output.appendChild(element);
}

window.onload = function()
{
	initialize();
}