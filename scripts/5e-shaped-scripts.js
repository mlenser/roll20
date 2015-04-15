(function (shaped, undefined) {

	/* Options */
	shaped.createAbilityAsToken = true;
	shaped.monsterAsMinHp = false; // generated token hp can't be lower than the average hp
	shaped.rollMonsterHpOnDrop = true; // will roll HP when character are dropped on map

	/* Setting these to a sheet value will set the token bar value. If they are set to '' or not set then it will use whatever you already have set on the token
	 For a full list of attributes please look at https://app.roll20.net/forum/post/1734923/new-d-and-d-5e-shaped-character-sheet#post-1788863
	 Do not use npc_HP, use HP instead
	 */
	// Green bar
	shaped.parsebar1 = 'npc_AC';
	shaped.parsebar1Max = false;
	shaped.parsebar1_link = true;
	// Blue bar
	shaped.parsebar2 = ''; //'passive_perception'
	shaped.parsebar2Max = false;
	shaped.parsebar2_link = false;
	// Red bar
	shaped.parsebar3 = 'HP';  //'speed'
	shaped.parsebar3Max = true;
	shaped.parsebar3_link = false;

	shaped.showName = true; //show the name on the map (not to players)


	//optional Settings tab
	//shaped.defaultTab = 10; //1 is the core sheet. Uncomment to 10 if you want the actions page. Change to 6 if you want the spellbook page. Change to 98 if you want to "Show All" for the NPC pages.
	shaped.sheetOutput = ''; //change to 'hidden' if you wish the sheet to whisper all commands to the GM
	shaped.whisperDeathSaves = true; //change to false if you wish NPC death saves to be rolled openly
	shaped.initiativeTieBreaker = true; //change to true if you want to add the initiative modifier as a tie breaker for initiatives. (I use it)
	shaped.initiativeAddsToTracker = true; //change to false if you do not want to add the initiative to the tracker (mainly for the app)

	shaped.addInitiativeTokenAbility = true; //change to false if you do not want a macro "Init" on every token



	shaped.statblock = {
		version: '1.66',
		RegisterHandlers: function () {
			on('chat:message', HandleInput);

			if(shaped.rollMonsterHpOnDrop) {
				on('add:graphic', function(obj) {
					shaped.rollTokenHp(obj);
				});
			}

			log('Shaped Scripts ready');
		}
	};

	var status = '',
			errors = [],
			obj = null,
			characterId = null;

	function HandleInput(msg) {
		if(msg.type !== 'api') {
			return;
		}
		log('msg.content: ' + msg.content);
		args = msg.content.split(/\s+/);
		switch(args[0]) {
			case '!build-monster':
			case '!shaped-parse':
			case '!shaped-import':
				shaped.getSelectedToken(msg, shaped.ImportStatblock);
				break;
			case '!shaped-rollhp':
				return shaped.rollHpForSelectedToken(msg);
				break;
			case '!shaped-clone':
				return shaped.cloneToken(msg, args[1]);
				break;
			case '!shaped-convert':
				shaped.getSelectedToken(msg, shaped.parseOldToNew);
				break;
		}
	}

	shaped.getSelectedToken = shaped.getSelectedToken || function(msg, callback, limit) {
		try {
			if(!msg.selected || !msg.selected.length) {
				throw('No token selected');
			}

			limit = parseInt(limit, 10) || 0;

			if(!limit || limit > msg.selected.length + 1 || limit < 1) {
				limit = msg.selected.length;
			}

			for(i = 0; i < limit; i++) {
				if(msg.selected[i]._type === 'graphic') {
					var obj = getObj('graphic', msg.selected[i]._id);
					if(obj && obj.get('subtype') === 'token') {
						callback(obj);
					}
				}
			}
		} catch(e) {
			log(e);
			log('Exception: ' + e);
			sendChat('GM', '/w GM ' + e);
		}
	};

	shaped.rollHpForSelectedToken = function(msg) {
		shaped.getSelectedToken(msg, shaped.rollTokenHp);
	};

	shaped.rollTokenHp = function(token) {
		var number = 0;
		for(var i = 1; i < 4; i++) {
			if(shaped['parsebar' + i] === 'HP') {
				number = i;
				break;
			}
		}
		if(number === 0) {
			throw('One of the shaped.parsebar option has to be set to "HP" for random HP roll');
		}

		var bar = 'bar' + number;
		var represent = '';
		try {
			if((represent = token.get('represents')) === '') {
				throw('Token does not represent a character');
			}

			if(token.get(bar + '_link') !== '') {
				throw('Token ' + bar + ' is linked');
			}

			rollCharacterHp(represent, function(total, original) {
				token.set(bar + '_value', total);
				token.set(bar + '_max', total);
				var message = '/w GM Hp rolled: ' + total;
				if(original > 0) {
					message += ' adjusted from original result of ' + original;
				}
				sendChat('GM', message);
			});
		} catch(e) {
			log('Exception: ' + e);
		}
	};

	function rollCharacterHp(id, callback) {
		var hd = getAttrByName(id, 'npc_HP_hit_dice', 'current');
		if(hd === '') {
			throw 'Character has no HP Hit Dice defined';
		}

		var match = hd.match(/^(\d+)d(\d+)$/);
		if(!match || !match[1] || !match[2]) {
			throw 'Character doesn\'t have valid Hit Dice format';
		}

		var nb_dice = parseInt(match[1], 10);
		var nb_face = parseInt(match[2], 10);
		var total = 0;
		var original = 0;

		sendChat('GM', '[[' + hd + ']]', function(ops) {
			var rollResult = JSON.parse(ops[0].content);
			if(_.has(rollResult, 'total')) {
				total = rollResult.total;

				// Add Con modifier x number of hit dice
				var constitution_mod = Math.floor((getAttrByName(id, 'constitution', 'current') - 10) / 2);
				total = Math.floor(nb_dice * constitution_mod + total);

				if(shaped.monsterAsMinHp) {
					// Calculate average HP, as written in statblock.
					var average_hp = Math.floor(((nb_face + 1) / 2 + constitution_mod) * nb_dice);
					if(average_hp > total) {
						original = total;
						total = average_hp;
					}
				}
				callback(total, original);
			}
		});
	}

	shaped.capitalizeEachWord = function(str) {
		return str.replace(/\w\S*/g, function(txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	};

	shaped.setCharacter = function(name, gmnotes, bio) {
		if(!name) {
			throw('Name require to get or create character');
		}
		name = shaped.capitalizeEachWord(name);

		var obj = findObjs({
			_type: 'character',
			name: name
		});

		if(obj.length === 0) {
			obj = createObj('character', {
				name: name
			});
			status = 'Character ' + name + ' created';
		} else {
			obj = getObj('character', obj[0].id);
			status = 'Character ' + name + ' updated';
		}

		if(!obj) {
			throw('Something prevent script to create or find character ' + name);
		}

		if(gmnotes)
			obj.set({
				gmnotes: gmnotes
			});

		if(bio)
			obj.set({
				bio: bio
			});

		characterId = obj.id;
		if(getAttrByName(characterId, 'is_npc') !== 1) {
			setAttribute('is_npc', 1);
		}

		return obj;
	};

	function setUserDefinedScriptSettings () {
		if(shaped.defaultTab) {
			setAttribute('tab', shaped.defaultTab);
		}
		if(shaped.sheetOutput === 'hidden') {
			setAttribute('output_option', '/w GM ');
		} else {
			setAttribute('output_option', ' ');
		}
		if(shaped.whisperDeathSaves) {
			setAttribute('death_save_output_option', '/w GM ');
		} else {
			setAttribute('death_save_output_option', ' ');
		}
		if(shaped.initiativeTieBreaker) {
			setAttribute('initiative_tie_breaker', '(@{initiative_overall}) / 100');
		} else {
			setAttribute('initiative_tie_breaker', '0');
		}
		if(shaped.initiativeAddsToTracker) {
			setAttribute('intiaitive_to_tracker', '@{selected|initiative_overall} [Initiative Mod] &{tracker}');
		} else {
			setAttribute('intiaitive_to_tracker', '@{initiative_overall} [Initiative Mod]');
		}
	}

	function logObject(obj) {
		for (var k in obj) {
			if (obj.hasOwnProperty(key)) {
				logObject(obj[k]);
			} else {
				log('SEARCH OBJ: ' + k + '->' + obj[k])
			}
		}
	}

	shaped.ImportStatblock = function(token) {
		status = 'Nothing modified';
		errors = [];
		try {
			var statblock = token.get('gmnotes').trim();

			if(statblock === '') {
				throw('Selected token GM Notes was empty.');
			}

			log('statblock1: ' + statblock);

			var name = shaped.parseStatblock(statblock);
			if(characterId) {
				token.set('represents', characterId);
				token.set('name', shaped.capitalizeEachWord(name.toLowerCase()));
				if(shaped.showName) {
					token.set('showname', true);
				}

				setUserDefinedScriptSettings();

				getAndSetBarInfo(token, 'bar1');
				getAndSetBarInfo(token, 'bar2');
				getAndSetBarInfo(token, 'bar3');

			}
		} catch(e) {
			status = 'Parsing was incomplete due to error(s)';
			log(e);
			errors.push(e);
		}

		log(status);
		sendChat('Shaped', '/w GM ' + status);

		if(errors.length > 0) {
			log(errors.join('\n'));
			sendChat('Shaped', '/w GM Error(s):\n/w GM ' + errors.join('\n/w GM '));
		}
	};

	function setAttribute(name, currentVal, max) {
		if(!name) {
			throw('Name required to set attribute');
		}

		max = max || '';

		if(!currentVal) {
			log('Error setting empty value: ' + name);
			return;
		}

		var attr = findObjs({
			_type: 'attribute',
			_characterid: characterId,
			name: name
		})[0];

		if(!attr) {
			//log('Creating attribute ' + name);
			createObj('attribute', {
				name: name,
				current: currentVal,
				max: max,
				characterid: characterId
			});
		} else if(!attr.get('current') || attr.get('current').toString() !== currentVal) {
			//log('Updating attribute ' + name);
			attr.set({
				current: currentVal,
				max: max
			});
		}
	}

	function setAbility(name, description, action, istokenaction) {
		if(!name) {
			throw('Name required to set ability');
		}

		var ability = findObjs({
			_type: 'ability',
			_characterid: characterId,
			name: name
		});

		if(!ability) {
			throw('Something prevent script to create or find ability ' + name);
		}

		if(ability.length === 0) {
			ability = createObj('ability', {
				_characterid: characterId,
				name: name,
				description: description,
				action: action,
				istokenaction: istokenaction
			});
			log('Ability ' + name + ' created');
		} else {
			ability = getObj('ability', ability[0].id);
			if(ability.get('description') != description || ability.get('action') !== action || ability.get('istokenaction') != istokenaction) {
				ability.set({
					description: description,
					action: action,
					istokenaction: istokenaction
				});
				log('Ability ' + name + ' updated');
			}
		}
	}

	shaped.parseStatblock = function(statblock) {
		log('---- Parsing statblock ----');

		var text = sanitizeText(clean(statblock)),
				keyword = findKeyword(text),
				section = splitStatblock(text, keyword);
		shaped.setCharacter(section.attr.name, text.replace(/#/g, '<br>'), section.bio);
		processSection(section);
		return section.attr.name;
	};

	function clean(statblock) {
		return unescape(statblock).replace(/–/g, '-').replace(/<br[^>]*>/g, '#').replace(/\s+#\s+/g, '#').replace(/(<([^>]+)>)/gi, '').replace(/#(?=[a-z]|DC)/g, ' ').replace(/\s+/g, ' ');
	}


	function sanitizeText (text) {
		if(typeof text !== 'String') {
			text = text.toString();
		}

		text = text.replace(/ft\s\./gi, 'ft.').replace(/ft\.\s\,/gi, 'ft').replace(/ft\./gi, 'ft').replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft').replace(/ld(\d+)/gi, '1d$1').replace(/ld\s+(\d+)/gi, '1d$1').replace(/(\d+)d\s+(\d+)/gi, '$1d$2').replace(/(\d+)\s+d(\d+)/gi, '$1d$2').replace(/(\d+)\s+d(\d+)/gi, '$1d$2').replace(/(\d+)f(?:Day|day)/gi, '$1/Day').replace(/(\d+)f(\d+)/gi, '$1/$2');
		var replaceObj = {
			'abol eth':'aboleth',
			'Afrightened':'A frightened',
			'Aundefinedr':'After',
			'blind sight':'blindsight',
			'choos in g':'choosing',
			'com muni cate':'communicate',
			'dea ls':'deals',
			'di sease':'disease',
			'di stance':'distance',
			'fe et':'feet',
			'exha les':'exhales',
			'ex istence':'existence',
			'magica lly':'magically',
			'minlilte':'minute',
			'ofthe':'of the',
			"on'e":'one',
			'radi us':'radius',
			'ra nge':'range',
			'rega ins':'regains',
			'savin g':'saving',
			'slash in g':'slashing',
			'slash ing':'slashing',
			'successfu l':'successful',
			'ta rget':'target',
			'Th e':'The',
			'withi n':'within'
		};
		var re = new RegExp(Object.keys(replaceObj).join('|'),'gi');
		text = text.replace(re, function(matched){
			return replaceObj[matched];
		});
		return text;
	}

	function findKeyword(statblock) {
		var keyword = {
			attr: {},
			traits: {},
			actions: {},
			lair: {},
			legendary: {},
			reactions: {}
		};

		var indexAction = 0,
				indexLair = statblock.length,
				indexLegendary = statblock.length,
				indexReactions = statblock.length;

		// Standard keyword
		var regex = /#\s*(tiny|small|medium|large|huge|gargantuan|armor class|hit points|speed|str|dex|con|int|wis|cha|saving throws|skills|damage resistances|damage immunities|condition immunities|damage vulnerabilities|senses|languages|challenge|traits|actions|lair actions|legendary actions|reactions)(?=\s|#)/gi;
		while(match = regex.exec(statblock)) {
			key = match[1].toLowerCase();
			if(key === 'actions') {
				indexAction = match.index;
				keyword.actions.Actions = match.index;
			} else if(key === 'legendary actions') {
				indexLegendary = match.index;
				keyword.legendary.Legendary = match.index;
			} else if(key === 'reactions') {
				indexReactions = match.index;
				keyword.reactions.Reactions = match.index;
			} else if(key === 'lair actions') {
				indexLair = match.index;
				keyword.lair.Lair = match.index;
			} else {
				keyword.attr[key] = match.index;
			}
		}

		// Power
		regex = /(?:#|\.\s+)([A-Z][\w-]+(?:\s(?:[A-Z][\w-]+|[\(\)\d\-]|of|and|or)+)*)(?=\s*\.)/g;
		log('parsed statblock: ' + statblock);
		while(match = regex.exec(statblock)) {
			if(!keyword.attr[match[1].toLowerCase()]) {
				if(match.index < indexAction) {
					keyword.traits[match[1]] = match.index;
				} else if(match.index > indexAction && match.index < indexLegendary && match.index < indexReactions && match.index < indexLair) {
					keyword.actions[match[1]] = match.index;
				} else if(match.index > indexLegendary && match.index < indexReactions && match.index < indexLair) {
					keyword.legendary[match[1]] = match.index;
				} else if(match.index > indexReactions && match.index < indexLair) {
					keyword.reactions[match[1]] = match.index;
				} else if(match.index > indexLair) {
					keyword.lair[match[1]] = match.index;
				}
			}
		}

		return keyword;
	}

	function splitStatblock(statblock, keyword) {
		// Check for bio (flavor text) at the end, separated by at least 3 line break.
		var bio;
		if((pos = statblock.indexOf('###')) != -1) {
			bio = statblock.substring(pos + 3).replace(/^[#\s]/g, '');
			bio = bio.replace(/#/g, '<br>').trim();
			statblock = statblock.slice(0, pos);
		}

		var debut = 0;
		var keyName = 'name';
		var sectionName = 'attr';

		for(var section in keyword) {
			var obj = keyword[section];
			for(var key in obj) {
				var fin = parseInt(obj[key], 10);
				keyword[sectionName][keyName] = extractSection(statblock, debut, fin, keyName);
				keyName = key;
				debut = fin;
				sectionName = section;
			}
		}
		keyword[sectionName][keyName] = extractSection(statblock, debut, statblock.length, keyName);

		delete keyword.actions.Actions;
		delete keyword.legendary.Legendary;
		delete keyword.reactions.Reactions;

		if(bio) {
			keyword.bio = bio;
		}

		// Patch for multiline abilities
		var abilitiesName = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
		var abilities = '';
		for(i = 0, len = abilitiesName.length; i < len; ++i) {
			if(keyword.attr[abilitiesName[i]]) {
				abilities += keyword.attr[abilitiesName[i]] + ' ';
				delete keyword.attr[abilitiesName[i]];
			}
		}
		keyword.attr.abilities = abilities;

		// Size attribute:
		var size = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
		for(i = 0, len = abilitiesName.length; i < len; ++i) {
			if(keyword.attr[size[i]]) {
				keyword.attr.size = size[i] + ' ' + keyword.attr[size[i]];
				delete keyword.attr[size[i]];
				break;
			}
		}
		return keyword;
	}

	function extractSection(text, debut, fin, title) {
		var section = text.substring(debut, fin);
		// Remove action name from action description and clean.
		section = section.replace(new RegExp('^[\\s\\.#]*' + title.replace(/([-()\\/])/g, '\\$1') + '?[\\s\\.#]*', 'i'), '');
		section = section.replace(/#/g, ' ');
		return section;
	}

	function processSection(section) {
		// Process abilities first cause needed by other attribute.
		if(section.attr.abilities) parseAbilities(section.attr.abilities);
		if(section.attr.size) parseSize(section.attr.size);
		if(section.attr['armor class']) parseArmorClass(section.attr['armor class']);
		if(section.attr['hit points']) parseHp(section.attr['hit points']);
		if(section.attr.speed) parseSpeed(section.attr.speed);
		if(section.attr.challenge) parseChallenge(section.attr.challenge);
		if(section.attr['saving throws']) parseSavingThrow(section.attr['saving throws']);
		if(section.attr.skills) parseSkills(section.attr.skills);
		if(section.attr.senses) parseSenses(section.attr.senses);

		if(section.attr['damage immunities']) setAttribute('damage_immunity', section.attr['damage immunities']);
		if(section.attr['condition immunities']) setAttribute('condition_immunity', section.attr['condition immunities']);
		if(section.attr['damage vulnerabilities']) setAttribute('damage_vulnerability', section.attr['damage vulnerabilities']);
		if(section.attr['damage resistances']) setAttribute('damage_resistance', section.attr['damage resistances']);
		if(section.attr.languages) setAttribute('prolanguages', section.attr.languages);

		parseTraits(section.traits);
		parseReactions(section.reactions);
		parseActions(section.actions);
		parseActions(section.legendary, 'legendary_');
		parseActions(section.lair, 'lair_');
	}

	/* Section parsing function */
	function parseAbilities(abilities) {
		var regex = /(\d+)\s*\(/g;
		var match = [];

		while(matches = regex.exec(abilities)) {
			match.push(matches[1]);
		}

		setAttribute('strength', match[0]);
		setAttribute('dexterity', match[1]);
		setAttribute('constitution', match[2]);
		setAttribute('intelligence', match[3]);
		setAttribute('wisdom', match[4]);
		setAttribute('charisma', match[5]);
	}

	function parseSize(size) {
		var match = size.match(/(.*?) (.*?), (.*)/i);
		setAttribute('size', shaped.capitalizeEachWord(match[1]));
		setAttribute('npc_type', shaped.capitalizeEachWord(match[2]));
		setAttribute('alignment', shaped.capitalizeEachWord(match[3]));
	}

	function parseArmorClass(ac) {
		var match = ac.match(/(\d+)\s?(.*)/);
		setAttribute('npc_AC', match[1]);
		setAttribute('npc_AC_note', match[2].replace(/\(|\)/g,''));
	}

	function parseHD(hd) {
		var splitHD = hd.match(/(\d+)d(\d+)/i),
				numHD = splitHD[1],
				HDsize = 'd' + splitHD[2];

		setAttribute('hd_' + HDsize, numHD, numHD);
	}
	function parseHp(hp) {
		var match = hp.match(/(\d+).*((\d+d\d+)[\d\s+|\-]*)/i);

		if(match[1]) {
			setAttribute('HP', match[1], match[1]);
		} else {
			log('error parsing hp');
		}
		if(match[2]) {
			setAttribute('npc_HP_hit_dice', match[2]);

			parseHD(match[2]);
		} else {
			log('error parsing hd');
		}
	}

	function parseSpeed(speed) {
		var baseAttr = 'speed',
				regex = /(|burrow|climb|fly|swim|)\s*(\d+)\s*?(?:ft)?\s*(\(.*\))?/gi;

		while(match = regex.exec(speed)) {
			var attrName = baseAttr + (match[1] !== '' ? '_' + match[1].toLowerCase() : ''),
					value = match[2];

			if(match[3]) {
				if(match[3].indexOf('hover')) {
					setAttribute('speed_fly_hover', 'on');
				}
			}
			setAttribute(attrName, value);
		}
	}

	function parseSenses(senses) {
		senses = senses.replace(/[,\s]*passive.*/i,'');
		var regex = /(|blindsight|darkvision|tremorsense|truesight|)\s*?(\d+)\s*?ft?\s*(\(.*\))?/gi;

		while(match = regex.exec(senses)) {
			var attrName = match[1].toLowerCase(),
					value = match[2];

			if(match[3]) {
				if(match[3].indexOf('blind beyond')) {
					setAttribute('blindsight_blind_beyond', 'on');
				}
			}
			setAttribute(attrName, value);
		}
	}

	function parseChallenge(cr) {
		input = cr.replace(/[, ]/g, '');
		var match = input.match(/([\d/]+).*?(\d+)/);
		setAttribute('challenge', match[1]);

		var xp = parseInt(match[2]);
		if(getAttrByName(characterId, 'xp') !== xp) {
			setAttribute('xp', xp);
		}
	}

	function parseSavingThrow(save) {
		var regex = /(STR|DEX|CON|INT|WIS|CHA).*?(\d+)/gi;
		var attr, value;
		while(match = regex.exec(save)) {
			// Substract ability modifier from this field since sheet computes it
			switch(match[1].toLowerCase()) {
				case 'str':
					attr = 'strength';
					break;
				case 'dex':
					attr = 'dexterity';
					break;
				case 'con':
					attr = 'constitution';
					break;
				case 'int':
					attr = 'intelligence';
					break;
				case 'wis':
					attr = 'wisdom';
					break;
				case 'cha':
					attr = 'charisma';
					break;
			}
			setAttribute(attr + '_save_prof', '@{PB}');

			var proficiencyBonus = (2 + Math.floor(Math.abs((getAttrByName(characterId, 'challenge')-1)/4))),
					totalSaveBonus = match[2] - proficiencyBonus - Math.floor((getAttrByName(characterId, attr) - 10) / 2);

			if(totalSaveBonus !== 0) {
				setAttribute(attr + '_save_bonus', totalSaveBonus);
			}
		}
	}

	function parseSkills(skills) {
		// Need to substract ability modifier skills this field since sheet compute it
		var skillAbility = {
			acrobatics: 'dexterity',
			'animal handling': 'wisdom',
			arcana: 'intelligence',
			athletics: 'strength',
			deception: 'charisma',
			history: 'intelligence',
			insight: 'wisdom',
			intimidation: 'charisma',
			investigation: 'intelligence',
			medicine: 'wisdom',
			nature: 'intelligence',
			perception: 'wisdom',
			performance: 'charisma',
			persuasion: 'charisma',
			religion: 'intelligence',
			'sleight of hand': 'dexterity',
			stealth: 'dexterity',
			survival: 'wisdom'
		};

		var regex = /([\w\s]+).*?(\d+)/gi;
		while(match = regex.exec(skills.replace(/Skills\s+/i, ''))) {
			var skill = match[1].trim().toLowerCase();
			if(skill in skillAbility) {
				var abilitymod = skillAbility[skill],
						attr = skill.replace(/\s/g, '');


				var proficiencyBonus = (2 + Math.floor(Math.abs((getAttrByName(characterId, 'challenge')-1)/4))),
						totalSkillBonus = match[2] - Math.floor((getAttrByName(characterId, abilitymod) - 10) / 2);

				var expertise = proficiencyBonus * 2;

				if(totalSkillBonus >= expertise) {
					setAttribute(attr + '_prof_exp', '(2*@{PB})');
					if(totalSkillBonus > expertise) {
						setAttribute(attr + '_bonus', totalSkillBonus - expertise);
					}
				} else if (totalSkillBonus >= proficiencyBonus) {
					setAttribute(attr + '_prof_exp', '@{PB}');
					if(totalSkillBonus > proficiencyBonus) {
						setAttribute(attr + '_bonus', totalSkillBonus - proficiencyBonus);
					}
				} else {
					setAttribute(attr + '_prof_exp', '@{jack_of_all_trades}');
					if(totalSkillBonus > 0) {
						setAttribute(attr + '_bonus', totalSkillBonus);
					}
				}
			} else {
				errors.push('Skill ' + skill + ' is not a valid skill');
			}
		}
	}
	function parseTraits(traits) {
		var traitsArray = [];
		_.each(traits, function(value, key) {
			traitsArray.push('**' + key + '**' + '. ' + value);
		});

		if(traitsArray.length > 0) {
			var traitsOutput = traitsArray.join('\n');
			setAttribute('npc_traits', traitsOutput);
		}
	}

	function parseReactions(reactions) {
		var reactionsArray = [];
		_.each(reactions, function(value, key) {
			reactionsArray.push('**' + key + '**. ' + value);
		});
		if(reactionsArray.length > 0) {
			setAttribute('reactions', reactionsArray.join('\n'));
			setAttribute('npc_action_toggle_reactions', 'on');
		}
	}

	function parseActions(actions, actionType) {
		if(!actionType) {
			actionType = '';
		}
		var multiAttackText,
				actionPosition = []; // For use with multiattack.

		function processActions (actionList) {
			var actionNum = 1,
					legendaryActionsNotes = [];

			_.each(actionList, function(value, key) {
				var parsedAttack = false,
						parsedDetails = false,
						parsedSave = false,
						parsedDamage = false,
						parsed;

				if((pos = key.indexOf('(')) > 1) {
					actionPosition[actionNum] = key.substring(0, pos - 1).toLowerCase();
				} else {
					actionPosition[actionNum] = key.toLowerCase();
				}

				var keyRegex = /\s*?\(Recharge\s*?(\d+\-\d+|\d+)\)/gi;
				while(keyResult = keyRegex.exec(key)) {
					if(keyResult[1]) {
						setAttribute('npc_' + actionType + 'action_toggle_recharge_' + actionNum, '@{npc_action_var_recharge_' + actionNum + '}');
						setAttribute('npc_' + actionType + 'action_recharge_' + actionNum, keyResult[1]);
						key = key.replace(keyRegex, '');
					}
				}
				setAttribute('npc_' + actionType + 'action_name_' + actionNum, key);

				var splitAction = value.split(/\.(.+)?/),
						attackInfo = splitAction[0],
						damageInfo = splitAction[1],
						splitAttack = attackInfo.split(',');

				var typeRegex = /(melee|ranged|melee or ranged)\s*(spell|weapon)\s*/gi;
				while(type = typeRegex.exec(splitAttack[0])) {
					if(type[1]) {
						var meleeOrRanged = 'Melee or Ranged';
						if(type[1].toLowerCase() === meleeOrRanged.toLowerCase()) {
							type[1] = 'Thrown';
						}
						setAttribute('npc_' + actionType + 'action_type_' + actionNum, shaped.capitalizeEachWord(type[1]));
					}
					if(type[2]) {
						var attackWeaponOrSpell = shaped.capitalizeEachWord(type[2]);
					}
					parsedAttack = true;
				}
				var toHitRegex = /\+\s?(\d+)\s*(?:to hit)/gi;
				while(toHit = toHitRegex.exec(splitAttack[0])) {
					if(toHit[1]) {
						setAttribute('npc_' + actionType + 'action_tohit_' + actionNum, toHit[1]);
						setAttribute('npc_' + actionType + 'action_toggle_attack_' + actionNum, '@{npc_' + actionType + 'action_var_attack_' + actionNum + '}');
						setAttribute('npc_' + actionType + 'action_toggle_crit_' + actionNum, '@{npc_' + actionType + 'action_var_crit_' + actionNum + '}');
					}
					if(splitAttack[2]) {
						setAttribute('npc_' + actionType + 'action_target_' + actionNum, splitAttack[2].trim().toLowerCase());
						parsedDetails = true;
					}
					parsedAttack = true;
				}
				var reachRegex = /(?:reach)\s?(\d+)\s?(?:ft)/gi;
				while(reach = reachRegex.exec(splitAttack[1])) {
					if(reach[1]) {
						setAttribute('npc_' + actionType + 'action_reach_' + actionNum, reach[1] + ' ft');
					}
					parsedAttack = true;
					parsedDetails = true;
				}
				var rangeRegex = /(?:range)\s?(\d+)\/(\d+)\s?(ft)/gi;
				while(range = rangeRegex.exec(splitAttack[1])) {
					if(range[1] && range[2]) {
						setAttribute('npc_' + actionType + 'action_range_' + actionNum, range[1] + '/' + range[2] + ' ft');
					}
					parsedAttack = true;
					parsedDetails = true;
				}

				var damageRegex = /(?:Hit:| Each).*?(?:(\d+)|(?:\d+).*?((\d+d\d+)[\d\s+|\-]*).*?)\s*?([a-zA-Z]*)\s*?damage(?:\,\sor\s*?(?:(\d+)|(?:\d+)\s*?\(?((\d+d\d+)[\d\s+|\-]*)\)?)\s*?([a-zA-Z]*)\s*damage if\s*(.*?)\.)?(?:\.|\s*?plus|.*\,\s*taking)?(?:\s*?(?:(\d+)|(?:\d+)\s*?\(?((\d+d\d+)[\d\s+|\-]*)\)?)\s*?([a-zA-Z]*)\s*damage)?(?:\,?\s*and\s(the target is\s.*|be.*))?(?:\.?\s*(If.*?grappled.*))?/gi;
				while(damage = damageRegex.exec(value)) {
					setAttribute('npc_' + actionType + 'action_dmg_' + actionNum, damage[1] || damage[2]);
					setAttribute('npc_' + actionType + 'action_toggle_damage_' + actionNum, '@{npc_' + actionType + 'action_var_damage_' + actionNum + '}');
					setAttribute('npc_' + actionType + 'action_dmg_type_' + actionNum, damage[4]);
					setAttribute('npc_' + actionType + 'action_crit_dmg_' + actionNum, damage[1] || damage[3]);

					//alternate damage
					if(damage[5] || damage[6]) {
						setAttribute('npc_' + actionType + 'action_alt_dmg_' + actionNum, damage[5] || damage[6]);
					}
					if(damage[5] || damage[7]) {
						setAttribute('npc_' + actionType + 'action_alt_crit_dmg_' + actionNum, damage[5] || damage[7]);
					}
					if(damage[9]) {
						setAttribute('npc_' + actionType + 'action_alt_dmg_reason_' + actionNum, damage[9]);
					}
					if(damage[5] || damage[6] || damage[7] || damage[9]) {
						setAttribute('npc_' + actionType + 'action_toggle_alt_damage_' + actionNum, '@{npc_' + actionType + 'action_var_alt_damage_' + actionNum + '}');
					}

					//secondary damage
					if(damage[10] || damage[11]) {
						setAttribute('npc_' + actionType + 'action_second_dmg_' + actionNum, damage[10] || damage[11]);
					}
					if(damage[10] || damage[12]) {
						setAttribute('npc_' + actionType + 'action_second_crit_dmg_' + actionNum, damage[10] || damage[12]);
					}
					if(damage[13]) {
						setAttribute('npc_' + actionType + 'action_second_dmg_type_' + actionNum, damage[13]);
					}
					if(damage[10] || damage[11] || damage[12] || damage[13]) {
						setAttribute('npc_' + actionType + 'action_toggle_second_damage_' + actionNum, '@{npc_' + actionType + 'action_var_second_damage_' + actionNum + '}');
					}

					//effect
					if(damage[14] || damage[15]) {
						var effect = damage[14] || damage[15];
						setAttribute('npc_' + actionType + 'action_effect_' + actionNum, effect.replace(/DC\s(\d+)/g, 'DC [[$1]]'));
						setAttribute('npc_' + actionType + 'action_toggle_effects_' + actionNum, '@{npc_' + actionType + 'action_var_effects_' + actionNum + '}');
					}
					parsedDamage = true;
				}
				if(!parsedDamage) {
					if(damageInfo) {
						setAttribute('npc_' + actionType + 'action_effect_' + actionNum, damageInfo.replace(/(\s*?Hit:\s?)/gi, '').replace(/DC\s(\d+)/g, 'DC [[$1]]'));
						setAttribute('npc_' + actionType + 'action_toggle_effects_' + actionNum, '@{npc_' + actionType + 'action_var_effects_' + actionNum + '}');
					}
				}

				var saveDmgRegex = /(?:DC)\s*?(\d+)\s*?([a-zA-Z]*)\s*?(?:saving throw).*or\s(.*)?\s(?:on a successful one.)\s?(.*)/gi;
				while(saveDmg = saveDmgRegex.exec(value)) {
					//log('saveDmg: ' + saveDmg);

					if(saveDmg[1]) {
						setAttribute('npc_' + actionType + 'action_save_dc_' + actionNum, saveDmg[1]);
					}
					if(saveDmg[2]) {
						setAttribute('npc_' + actionType + 'action_save_stat_' + actionNum, saveDmg[2].substring(0, 3));
					}
					if(saveDmg[1] || saveDmg[2]){
						setAttribute('npc_' + actionType + 'action_toggle_save_' + actionNum, '@{npc_' + actionType + 'action_var_save_' + actionNum + '}');
					}
					if(saveDmg[3]) {
						setAttribute('npc_' + actionType + 'action_save_success_' + actionNum, saveDmg[3]);
					}
					if(saveDmg[4]) {
						setAttribute('npc_' + actionType + 'action_effect_' + actionNum, saveDmg[4]);
						setAttribute('npc_' + actionType + 'action_toggle_effects_' + actionNum, '@{npc_' + actionType + 'action_var_effects_' + actionNum + '}');
					}
					parsedSave = true;
				}
				var saveOrRegex = /(?:DC)\s*?(\d+)\s*?([a-zA-Z]*)\s*?(?:saving throw)\,?\s*?or\s(?:take.*)?(be.*|it can't.*)/gi;
				while(saveOr = saveOrRegex.exec(value)) {
					if(saveOr[1]) {
						setAttribute('npc_' + actionType + 'action_save_dc_' + actionNum, saveOr[1]);
					}
					if(saveOr[2]) {
						setAttribute('npc_' + actionType + 'action_save_stat_' + actionNum, saveOr[2].substring(0, 3));
					}
					if(saveOr[1] || saveOr[2]){
						setAttribute('npc_' + actionType + 'action_toggle_save_' + actionNum, '@{npc_' + actionType + 'action_var_save_' + actionNum + '}');
					}
					if(saveOr[3]) {
						setAttribute('npc_' + actionType + 'action_effect_' + actionNum, saveOr[3]);
						setAttribute('npc_' + actionType + 'action_toggle_effects_' + actionNum, '@{npc_' + actionType + 'action_var_effects_' + actionNum + '}');
					}
					parsedSave = true;
				}
				var saveRangeRegex = /((?:Each | a | an | one ).*(?:creature|target).*)\swithin\s*?(\d+)\s*?(?:feet|ft)/gi;
				while(saveRange = saveRangeRegex.exec(value)) {
					if(saveRange[1]) {
						setAttribute('npc_' + actionType + 'action_target_' + actionNum, saveRange[1].trim());
					}
					if(saveRange[2]) {
						setAttribute('npc_' + actionType + 'action_range_' + actionNum, saveRange[2] + ' ft');
					}
					parsedDetails = true;
				}

				var lineRangeRegex = /(\d+\-foot line)\s*?(that is \d+ feet wide)/gi;
				while(lineRange = lineRangeRegex.exec(value)) {
					setAttribute('npc_' + actionType + 'action_type_' + actionNum, 'Line');
					if(lineRange[1] && lineRange[2]) {
						setAttribute('npc_' + actionType + 'action_range_' + actionNum, lineRange[1] + ' ' + lineRange[2]);
					} else if(lineRange[1]) {
						setAttribute('npc_' + actionType + 'action_range_' + actionNum, lineRange[1]);
					}
					parsedDetails = true;
				}

				var lineTargetRegex = /\.\s*(.*in that line)/gi;
				while(lineTarget = lineTargetRegex.exec(value)) {
					if(lineTarget[1]) {
						setAttribute('npc_' + actionType + 'action_target_' + actionNum, lineTarget[1]);
					}
					parsedDetails = true;
				}
				if(parsedDetails) {
					setAttribute('npc_' + actionType + 'action_toggle_details_' + actionNum, '@{npc_' + actionType + 'action_var_details_' + actionNum + '}');
				}


				function createTokenAction() {
					// Create token action
					if(shaped.usePowerAbility) {
						setAbility(key, '', powercardAbility(id, actionNum), shaped.createAbilityAsToken);
					} else {
						setAbility(key, '', '%{selected|npc_' + actionType + 'action_' + actionNum + '}', shaped.createAbilityAsToken);
					}
				}
				parsed = parsedAttack || parsedDamage || parsedSave;
				if(!parsed) {
					if(actionType === 'legendary_') {
						legendaryActionsNotes.push(key + '. ' + value);
					} else {
						//make this work
						value = value.replace(/(?:DC)\s*?(\d+)/gi, '[[$1]]');
						setAttribute('npc_' + actionType + 'action_effect_' + actionNum, value);
						setAttribute('npc_' + actionType + 'action_toggle_effects_' + actionNum, '@{npc_' + actionType + 'action_var_effects_' + actionNum + '}');
						createTokenAction();
						actionNum++;
					}
				} else {
					if(actionType === 'legendary_') {
						legendaryActionsNotes.push(key + '. See below');
					}
					if(key.indexOf('Costs ') > 0) {
						key = key.replace(/\s*\(Costs\s*\d+\s*Actions\)/gi, '');
						setAttribute('npc_' + actionType + 'action_name_' + actionNum, key);
					}
					createTokenAction();
					actionNum++;
				}
			});

			if(legendaryActionsNotes.length > 0) {
				setAttribute('legendary_action_notes', legendaryActionsNotes.join('\n'));
			}
		}
		if(actions.Multiattack) {
			multiAttackText = actions.Multiattack;
			setAttribute('npc_multiattack', multiAttackText);
			delete actions.Multiattack;

			if(!shaped.usePowerAbility) {
				setAbility('MultiAttack', '', '', shaped.createAbilityAsToken);
			}
		}
		if(shaped.addInitiativeTokenAbility) {
			setAbility('Init', '', '%{selected|Initiative}', shaped.createAbilityAsToken);
		}

		processActions(actions);

		if(actionType === 'lair_' && Object.keys(actions).length > 0) {
			setAttribute('npc_action_toggle_lair_actions', 'on');
		}
		if(actionType === 'legendary_' && Object.keys(actions).length > 0) {
			setAttribute('npc_action_toggle_legendary_actions', 'on');
		}

		if(multiAttackText) {
			var actionList = actionPosition.join('|').slice(1);

			//var regex = new RegExp('(?:(?:(one|two) with its )?(' + actionList + '))', 'gi');
			var regex = new RegExp('(one|two|three)? (?:with its )?(' + actionList + ')( or)?', 'gi');
			var macro = multiAttackText + '\n';

			while(match = regex.exec(multiAttackText)) {
				var action = match[2];
				var nb = match[1] || 'one';
				var actionNumber = actionPosition.indexOf(action.toLowerCase());

				function addActionToMultiattack() {
					macro += '%{selected|npc_action_' + actionNumber + '}\n';
					setAttribute('npc_action_toggle_multiattack_' + actionNumber, '@{npc_action_var_multiattack_' + actionNumber + '}');
				}

				if(actionNumber !== -1) {
					addActionToMultiattack();
					if(nb == 'two') {
						addActionToMultiattack();
					}
					if(nb == 'three') {
						addActionToMultiattack();
					}
					if(match[3]) {
						macro += 'or\n';
					}

					delete actionPosition[actionNumber]; // Remove
				}
			}


			if(shaped.usePowerAbility) {
				setAbility('MultiAttack', '', powercardAbility(id, actionNumber), shaped.createAbilityAsToken);
			} else {
				setAbility('MultiAttack', '', macro, shaped.createAbilityAsToken);
			}
		}
	}

	function parseActionsForConvert() {
		var actions = {},
				lairActions = {},
				legendaryActions = {},
				reactions = [];

		for (var i = 1; i <= 20; i++) {
			var name = getAttrByName(characterId, 'npc_action_name' + i, 'current'),
					type = getAttrByName(characterId, 'npc_action_type' + i, 'current'),
					description = getAttrByName(characterId, 'npc_action_description' + i, 'current'),
					effect = getAttrByName(characterId, 'npc_action_effect' + i, 'current'),
					combinedText = description + ' ' + effect;

			if(name) {
				combinedText = combinedText.replace(/\s*?\:\s*?\[\[(\d+d\d+[\d\s+|\-]*)\]\]\s*?\|\s*?\[\[(\d+d\d+[\d\s+|\-]*)\]\]/gi, '').replace(/\[\[(\d*d\d+[\d\s+|\-]*)\]\]/gi, '$1');


				log('type ' + type + ' --  ' + type.indexOf('Bonus Action'));

				if(type.indexOf('Bonus Action') === 1) {
					log('Bonus Action ' + name + ' changed to a normal action');
					actions[name] = combinedText;
				} else if(type.indexOf('Legendary Action') === 1) {
					log('Legendary Action ' + name);
					legendaryActions[name] = (combinedText);
				} else if(type.indexOf('Reaction') === 1) {
					log('Reaction ' + name);
					reactions.push(combinedText);
				} else if(type.indexOf('Lair Action') === 1) {
					log('Lair Action ' + name);
					lairActions[name] = (combinedText);
				} else if(type.indexOf('Special Action') === 1) {
					log('Special Action ' + name + ' changed to a normal action');
					actions[name] = combinedText;
				} else {
					log('Action ' + name);
					actions[name] = combinedText;
				}
			}
		}
		if(Object.keys(actions).length > 0) {
			parseActions(actions);
		}
		if(Object.keys(legendaryActions).length > 0) {
			parseActions(legendaryActions, 'legendary_');
		}
		if(reactions.length > 0) {
			setAttribute('reactions', reactions.join('\n'));
			setAttribute('npc_action_toggle_reactions', 'on');
		}
		if(Object.keys(lairActions).length > 0) {
			parseActions(lairActions, 'lair_');
		}


	}

	function convertAttrFromNPCtoPC(npc_attr_name, attr_name) {
		var npc_attr = getAttrByName(characterId, npc_attr_name),
				attr = getAttrByName(characterId, attr_name);

		if(npc_attr && !attr) {
			log('convert from ' + npc_attr_name + ' to ' + attr_name);
			npc_attr = sanitizeText(npc_attr);
			setAttribute(attr_name, npc_attr);
		}
	}

	shaped.parseOldToNew = function(token) {
		log('---- Parsing old attributes to new ----');

		characterId = token.attributes.represents;


		convertAttrFromNPCtoPC('npc_initiative', 'initiative');
		convertAttrFromNPCtoPC('npc_initiative_overall', 'initiative_overall');


		convertAttrFromNPCtoPC('npc_strength', 'strength');
		convertAttrFromNPCtoPC('npc_strength_save_bonus', 'strength_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_strength_bonus', 'basic_strength_bonus');
		convertAttrFromNPCtoPC('npc_dexterity', 'dexterity');
		convertAttrFromNPCtoPC('npc_dexterity_save_bonus', 'dexterity_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_dexterity_bonus', 'basic_dexterity_bonus');
		convertAttrFromNPCtoPC('npc_constitution', 'constitution');
		convertAttrFromNPCtoPC('npc_constitution_save_bonus', 'constitution_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_constitution_bonus', 'basic_constitution_bonus');
		convertAttrFromNPCtoPC('npc_intelligence', 'intelligence');
		convertAttrFromNPCtoPC('npc_intelligence_save_bonus', 'intelligence_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_intelligence_bonus', 'basic_intelligence_bonus');
		convertAttrFromNPCtoPC('npc_wisdom', 'wisdom');
		convertAttrFromNPCtoPC('npc_wisdom_save_bonus', 'wisdom_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_wisdom_bonus', 'basic_wisdom_bonus');
		convertAttrFromNPCtoPC('npc_charisma', 'charisma');
		convertAttrFromNPCtoPC('npc_charisma_save_bonus', 'charisma_save_bonus');
		convertAttrFromNPCtoPC('npc_basic_charisma_bonus', 'basic_charisma_bonus');


		convertAttrFromNPCtoPC('npc_alignment', 'alignment');


		var npc_HP = getAttrByName(characterId, 'npc_HP'),
				HP = getAttrByName(characterId, 'HP'),
				npc_HP_max = getAttrByName(characterId, 'npc_HP', 'max'),
				HP_max = getAttrByName(characterId, 'HP', 'max');
		if(npc_HP && !HP && npc_HP_max && !HP_max) {
			setAttribute('HP', npc_HP, npc_HP_max);
		} else if (npc_HP && !HP) {
			setAttribute('HP', npc_HP);
		} else if (npc_HP_max && !HP_max) {
			setAttribute('HP', 0, npc_HP_max);
		}
		convertAttrFromNPCtoPC('npc_temp_HP', 'temp_HP');

		var npc_hd = getAttrByName(characterId, 'npc_HP_hit_dice');
		if(npc_hd) {
			parseHD(npc_hd);
		}

		var speedConvertToOrig = [];
				speed = getAttrByName(characterId, 'npc_speed'),
				speed_fly = getAttrByName(characterId, 'npc_speed_fly'),
				speed_climb = getAttrByName(characterId, 'npc_speed_climb'),
				speed_swim = getAttrByName(characterId, 'npc_speed_swim');

		if(speed) speedConvertToOrig.push(speed);
		if(speed_fly) speedConvertToOrig.push('fly ' + speed_fly);
		if(speed_climb) speedConvertToOrig.push('climb' + speed_climb);
		if(speed_swim) speedConvertToOrig.push('swim' + speed_swim);

		parseSpeed(speedConvertToOrig.join(', '));

		convertAttrFromNPCtoPC('npc_xp', 'xp');
		convertAttrFromNPCtoPC('npc_challenge', 'challenge');
		convertAttrFromNPCtoPC('npc_size', 'size');
		parseSenses(sanitizeText(getAttrByName(characterId, 'npc_senses')));
		convertAttrFromNPCtoPC('npc_languages', 'prolanguages');


		convertAttrFromNPCtoPC('npc_damage_resistance', 'damage_resistance');
		convertAttrFromNPCtoPC('npc_damage_vulnerability', 'damage_vulnerability');
		convertAttrFromNPCtoPC('npc_damage_immunity', 'damage_immunity');
		convertAttrFromNPCtoPC('npc_condition_immunity', 'condition_immunity');


		convertAttrFromNPCtoPC('npc_acrobatics_bonus', 'acrobatics_bonus');
		convertAttrFromNPCtoPC('npc_animalhandling_bonus', 'animalhandling_bonus');
		convertAttrFromNPCtoPC('npc_arcana_bonus', 'arcana_bonus');
		convertAttrFromNPCtoPC('npc_athletics_bonus', 'athletics_bonus');
		convertAttrFromNPCtoPC('npc_deception_bonus', 'deception_bonus');
		convertAttrFromNPCtoPC('npc_history_bonus', 'history_bonus');
		convertAttrFromNPCtoPC('npc_insight_bonus', 'insight_bonus');
		convertAttrFromNPCtoPC('npc_intimidation_bonus', 'intimidation_bonus');
		convertAttrFromNPCtoPC('npc_investigation_bonus', 'investigation_bonus');
		convertAttrFromNPCtoPC('npc_medicine_bonus', 'medicine_bonus');
		convertAttrFromNPCtoPC('npc_nature_bonus', 'nature_bonus');
		convertAttrFromNPCtoPC('npc_perception_bonus', 'perception_bonus');
		convertAttrFromNPCtoPC('npc_performance_bonus', 'performance_bonus');
		convertAttrFromNPCtoPC('npc_persuasion_bonus', 'persuasion_bonus');
		convertAttrFromNPCtoPC('npc_religion_bonus', 'religion_bonus');
		convertAttrFromNPCtoPC('npc_sleightofhand_bonus', 'sleightofhand_bonus');
		convertAttrFromNPCtoPC('npc_stealth_bonus', 'stealth_bonus');
		convertAttrFromNPCtoPC('npc_survival_bonus', 'survival_bonus');

		setUserDefinedScriptSettings();

		parseActionsForConvert();

		shaped.setBars(token);

		if(shaped.showName) {
			token.set('showname', true);
		}

		log('Character ' + token.attributes.name + ' converted');
		sendChat('Shaped', '/w gm Character ' + token.attributes.name + ' converted');
	};

	function setBarValueAfterConvert(token, bar, obj) {
		if(obj) {
			log('Setting ' + bar + ' to:');
			if(shaped['parse' + bar + '_link'] && obj.id) {
				log('id: ' + obj.id);
				token.set(bar + '_link', obj.id);
			}
			if(obj.attributes.current) {
				log('current: ' + obj.attributes.current);
				token.set(bar + '_value', obj.attributes.current);
			}
			if(shaped['parse' + bar + 'Max'] && obj.attributes.max) {
				log('max: ' + obj.attributes.max);
				token.set(bar + '_max', obj.attributes.max);
			} else {
				token.set(bar + '_max', '');
			}
		} else {
			log('Can\'t set empty object to bar ' + bar);
		}
	}

	function getAndSetBarInfo(token, bar) {
		var bar_link = token.get(bar + '_link');
		if(!bar_link) {
			var parsebar = shaped['parse' + bar];
			if(parsebar) {
				var objOfParsebar = findObjs({
					name: parsebar,
					_type: 'attribute',
					_characterid: characterId
				}, {caseInsensitive: true})[0];
				setBarValueAfterConvert(token, bar, objOfParsebar);
			} else {
				token.set(bar + '_link', '');
				token.set(bar + '_value', '');
				token.set(bar + '_max', '');
			}
		} else {
			objOfBar = {
				id: bar_link,
				attributes: {}
			};
			var bar_value = token.get(bar + '_value');
			if(bar_value) {
				objOfBar.attributes.current = bar_value;
			}
			var bar_max = token.get(bar + '_max');
			if(bar_max) {
				objOfBar.attributes.max = bar_max;
			}
			setBarValueAfterConvert(token, bar, objOfBar);
		}
	}


	shaped.setBars = function(token) {
		getAndSetBarInfo(token, 'bar1');
		getAndSetBarInfo(token, 'bar2');
		getAndSetBarInfo(token, 'bar3');
	};

	shaped.cloneToken = function (msg, number) {
		number = parseInt(number, 10) || 1;

		shaped.getSelectedToken(msg, function(token){
			var match = token.get('imgsrc').match(/images\/.*\/(thumb|max)/i);
			if(match == null) {
				throw('The token imgsrc do not come from you library. Unable to clone');
			}

			var imgsrc = token.get('imgsrc').replace('/max.', '/thumb.'),
					name = token.get('name') + ' ';
			log('Cloning ' + number + ' ' + name);

			token.set({'name': name + randomInteger(99), showname: true});

			for(var i = 0; i < number; i++){

				var left = (parseInt(token.get('left')) + (70 * (i+1))),
						obj = createObj('graphic', {
							name: name + randomInteger(99),
							controlledby: token.get('controlledby'),
							left: left,
							top: token.get('top'),
							width: token.get('width'),
							height: token.get('height'),
							showname: true,
							imgsrc: imgsrc,
							pageid: token.get('pageid'),
							represents: token.get('represents'),
							//showplayers_name: true,
							//showplayers_bar1: true,
							bar1_value: token.get('bar1_value'),
							bar1_max: token.get('bar1_max'),
							bar2_value: token.get('bar2_value'),
							bar2_max: token.get('bar2_max'),
							bar3_value: token.get('bar3_value'),
							bar3_max: token.get('bar3_max'),
							layer: 'objects'
						});
				if(shaped.rollMonsterHpOnDrop == true)
					shaped.rollTokenHp(obj);
			}
		}, 1);
	};

}(typeof shaped === 'undefined' ? shaped = {} : shaped));

on('ready', function() {
	'use strict';
	shaped.statblock.RegisterHandlers();
});