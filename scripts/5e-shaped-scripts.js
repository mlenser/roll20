(function (shaped, undefined) {

	/* Options */
	shaped.createAbilityAsToken = true;
	shaped.monsterAsMinHp = false; // generated token hp can't be lower than the average hp
	shaped.rollMonsterHpOnDrop = true; // will roll HP when character are dropped on map

	/* Setting these to a sheet value will set the token bar value. If they are set to '' or not set then it will use whatever you already have set on the token
	 Do not use npc_HP, use HP instead
	 */
	// Green bar
	shaped.parsebar1 = 'npc_AC';
	shaped.parsebar1Max = false;
	shaped.parsebar1_link = true;
	// Blue bar
	shaped.parsebar2 = 'passive_perception'; //'speed'
	shaped.parsebar2Max = false;
	shaped.parsebar2_link = false;
	// Red bar
	shaped.parsebar3 = 'HP';
	shaped.parsebar3Max = true;
	shaped.parsebar3_link = false;




	shaped.showName = true; //show the name on the map (not to players)
	shaped.useAaronsNumberedScript = false;

	//optional Settings tab
	//shaped.defaultTab = 10; //1 is the core sheet. Uncomment to 10 if you want the actions page. Change to 6 if you want the spellbook page. Change to 98 if you want to "Show All" for the NPC pages.
	shaped.sheetOutput = ''; //change to 'hidden' if you wish the sheet to whisper all commands to the GM
	shaped.whisperDeathSaves = true; //change to false if you wish NPC death saves to be rolled openly
	//shaped.initiativeTieBreaker = true; //change to true if you want to add the initiative modifier as a tie breaker for initiatives. (I use it)
	shaped.initiativeAddsToTracker = true; //change to false if you do not want to add the initiative to the tracker (mainly for the app)

	shaped.addInitiativeTokenAbility = true; //change to false if you do not want a macro "Init" on every token


	shaped.statblock = {
		version: '1.75',
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
			characterId = null,
			characterName = null;

	function HandleInput(msg) {
		if(msg.type !== 'api') {
			return;
		}
		log('msg.content: ' + msg.content);
		var args = msg.content.split(/\s+--/);
		if(args[1] && args[1] === 'clean') {
			shaped.getSelectedToken(msg, shaped.deleteOldSheet);
		}
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

			for(var i = 0; i < limit; i++) {
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

	shaped.deleteOldSheet = function(token) {
		var id = token.get('represents'),
				obj = findObjs({
					_type: 'character',
					id: id
				})[0];
		if(obj) {
			obj.remove();
			log('old sheet removed before importing');
		}
	}

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

			rollCharacterHp(represent, function(total, original, formula) {
				token.set(bar + '_value', total);
				token.set(bar + '_max', total);
				var message = '/w GM Hp ('+ formula +') rolled: ' + total;
				log('original: ' + original);
				if(original > 0) {
					log('if');
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

		var match = hd.match(/^(\d+)d(\d+)/);
		if(!match || !match[1] || !match[2]) {
			throw 'Character doesn\'t have valid Hit Dice format';
		}

		var nb_dice = parseInt(match[1], 10),
				nb_face = parseInt(match[2], 10),
				total = 0,
				original = 0;

		sendChat('GM', '/roll ' + nb_dice + 'd' + nb_face, function(ops) {
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
				callback(total, original,  nb_dice + 'd' + nb_face);
			}
		});
	}

	shaped.capitalizeEachWord = function(str) {
		return str.replace(/\w\S*/g, function(txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	};

	shaped.setCharacter = function(gmnotes, bio) {
		if(!characterName) {
			throw('Name require to get or create character');
		}

		var obj = findObjs({
			_type: 'character',
			name: characterName
		});

		if(obj.length === 0) {
			obj = createObj('character', {
				name: characterName
			});
			status = characterName + ' created';
		} else {
			obj = getObj('character', obj[0].id);
			status = characterName + ' updated';
		}

		if(!obj) {
			throw('Something prevent script to create or find character ' + characterName);
		}

		if(gmnotes) {
			obj.set({
				gmnotes: gmnotes
			});
		}

		if(bio) {
			obj.set({
				bio: bio
			});
		}

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
		for(var k in obj) {
			if(obj.hasOwnProperty(k)) {
				logObject(obj[k]);
			} else {
				log('logObj: ' + k + '->' + obj[k]);
			}
		}
	}

	function sortNumber(a,b) {
		return a - b;
	}

	shaped.ImportStatblock = function(token) {
		status = 'Nothing modified';
		errors = [];
		try {
			var statblock = token.get('gmnotes').trim();

			if(statblock === '') {
				throw('Selected token GM Notes was empty.');
			}

			shaped.parseStatblock(statblock);
			if(characterId) {
				token.set('represents', characterId);
				var tokenName = characterName;
				if(shaped.useAaronsNumberedScript && characterName.indexOf('%%NUMBERED%%') !== 1) {
					tokenName += ' %%NUMBERED%%';
				}
				token.set('name', tokenName);

				if(shaped.showName) {
					token.set('showname', true);
				}

				setUserDefinedScriptSettings();

				setBarValueAfterConvert(token, 'bar1');
				setBarValueAfterConvert(token, 'bar2');
				setBarValueAfterConvert(token, 'bar3');

				setTokenVision(token);
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

		characterName = shaped.capitalizeEachWord(section.attr.name.toLowerCase());

		shaped.setCharacter(text.replace(/#/g, '<br>'), section.bio);
		processSection(section);
	};

	function clean(statblock) {
		return unescape(statblock)
				.replace(/–/g, '-')
				.replace(/<br[^>]*>/g, '#')
				.replace(/\s+#\s+/g, '#')
				.replace(/(<([^>]+)>)/gi, '')
				.replace(/#(?=[a-z]|DC)/g, ' ')
				.replace(/\s+/g, ' ')
				.replace(/#Hit:/g, 'Hit:')
				.replace(/DC#(\d+)/g, 'DC $1')
				.replace('LanguagesChallenge', 'Languages -#Challenge')
				.replace("' Speed", 'Speed');
	}


	function sanitizeText (text) {
		if(typeof text !== 'string') {
			text = text.toString();
		}

		text = text.replace(/\,\./gi, ',').replace(/ft\s\./gi, 'ft.').replace(/ft\.\s\,/gi, 'ft').replace(/ft\./gi, 'ft').replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft').replace(/ld(\d+)/gi, '1d$1').replace(/ld\s+(\d+)/gi, '1d$1').replace('ldlO', '1d10').replace(/(\d+)d\s+(\d+)/gi, '$1d$2').replace(/(\d+)\s+d(\d+)/gi, '$1d$2').replace(/(\d+)\s+d(\d+)/gi, '$1d$2').replace(/(\d+)d(\d)\s(\d)/gi, '$1d$2$3').replace(/(\d+)f(?:Day|day)/gi, '$1/Day').replace(/(\d+)f(\d+)/gi, '$1/$2').replace(/{/gi, '(').replace(/}/gi, ')').replace(/(\d+)\((\d+)/gi, '$1/$2').replace(/• /gi, '');
		text = text.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
		var replaceObj = {
			'abol eth':'aboleth',
			'ACT IONS':'ACTIONS',
			'Afrightened':'A frightened',
			'Alesser':'A lesser',
			'Aundefinedr':'After',
			'blindn ess':'blindness',
			'blind sight':'blindsight',
			'bofh':'both',
			'choos in g':'choosing',
			'com muni cate':'communicate',
			'Constituti on':'Constitution',
			'creatu re':'creature',
			'darkvi sion':'darkvision',
			'dea ls':'deals',
			'di sease':'disease',
			'di stance':'distance',
			'fa lls':'falls',
			'fe et':'feet',
			'exha les':'exhales',
			'ex istence':'existence',
			'lfthe':'If the',
			'Ifthe':'If the',
			'magica lly':'magically',
			'minlilte':'minute',
			'natura l':'natural',
			'ofeach':'of each',
			'ofthe':'of the',
			"on'e":'one',
			'0n':'on',
			'pass ive':'passive',
			'Perce ption':'Perception',
			'radi us':'radius',
			'ra nge':'range',
			'rega ins':'regains',
			'rest.oration':'restoration',
			'savin g':'saving',
			'si lvery':'silvery',
			's lashing':'slashing',
			'slas hing':'slashing',
			'slash in g':'slashing',
			'slash ing':'slashing',
			'successfu l':'successful',
			'ta rget':'target',
			'Th e':'The',
			'unti l':'until',
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
			var key = match[1].toLowerCase();
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

		var splitStatblock = statblock.split('#'),
				lastItem = '',
				actionsPosArray = [],
				i = 1;

		for(var key in keyword.actions) {
			actionsPosArray.push(keyword.actions[key]);
		}
		actionsPosArray.sort(sortNumber);

		var lastActionIndex = actionsPosArray[actionsPosArray.length - 1] + 1,
				lastItemIndex;

		while(i < 6) {
			lastItem = splitStatblock[splitStatblock.length - i];
			lastItemIndex = statblock.indexOf(lastItem);
			if(lastItemIndex > lastActionIndex) {
				keyword.traits['Description'] = lastItemIndex - 1; //-1 to include the #
			}
			i++;
		}

		return keyword;
	}

	function splitStatblock(statblock, keyword) {
		// Check for bio (flavor text) at the end, separated by at least 3 line break.
		var bio,
				pos = statblock.indexOf('###');
		if(pos != -1) {
			bio = statblock.substring(pos + 3).replace(/^[#\s]/g, '');
			bio = bio.replace(/#/g, '<br>').trim();
			statblock = statblock.slice(0, pos);
		}

		var indexArray = [];

		for(var section in keyword) {
			var obj = keyword[section];
			for(var key in keyword[section]) {
				indexArray.push(obj[key]);
			}
		}

		indexArray.sort(sortNumber);

		keyword['attr']['name'] = extractSection(statblock.substring(0, indexArray[0]), 'name');

		for(var section in keyword) {
			var obj = keyword[section];
			for(var key in obj) {
				var start = obj[key],
						nextPos = indexArray.indexOf(start) + 1,
						end = indexArray[nextPos] || statblock.length;

				keyword[section][key] = extractSection(statblock.substring(start, end), key);
			}
		}

		delete keyword.actions.Actions;
		delete keyword.legendary.Legendary;
		delete keyword.reactions.Reactions;

		if(bio) {
			keyword.bio = bio;
		}

		// Patch for multiline abilities
		var abilitiesName = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
		var abilities = '';
		for(var i = 0, len = abilitiesName.length; i < len; ++i) {
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

	function extractSection(text, title) {
		// Remove action name from action description and clean.
		return text.replace(new RegExp('^[\\s\\.#]*' + title.replace(/([-()\\/])/g, '\\$1') + '?[\\s\\.#]*', 'i'), '').replace(/#/g, ' ');
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
		if(!match[1] || !match[2] || !match[3]) {
			throw 'Character doesn\'t have valid type/size/alignment format';
		}
		setAttribute('size', shaped.capitalizeEachWord(match[1]));
		setAttribute('npc_type', shaped.capitalizeEachWord(match[2]));
		setAttribute('alignment', shaped.capitalizeEachWord(match[3]));
	}

	function parseArmorClass(ac) {
		var match = ac.match(/(\d+)\s?(.*)/);
		if(!match[1]) {
			throw 'Character doesn\'t have valid AC format';
		}
		setAttribute('npc_AC', match[1]);
		if(match[2]) {
			setAttribute('npc_AC_note', match[2].replace(/\(|\)/g, ''));
		}
	}

	function parseHD(hd) {
		var splitHD = hd.match(/(\d+)d(\d+)/i);
		if(!splitHD[1] || !splitHD[2]) {
			throw 'Character doesn\'t have valid hd format';
		}
		var numHD = splitHD[1],
				HDsize = 'd' + splitHD[2];

		setAttribute('hd_' + HDsize, numHD, numHD);
	}
	function parseHp(hp) {
		var match = hp.match(/(\d+)\s*\(([\dd\s\+\-]*)\)/i);
		if(!match[1] || !match[2]) {
			throw 'Character doesn\'t have valid HP/HD format';
		}

		setAttribute('HP', match[1], match[1]);
		setAttribute('npc_HP_hit_dice', match[2]);
		parseHD(match[2]);
	}

	function parseSpeed(speed) {
		var baseAttr = 'speed',
				regex = /(|burrow|climb|fly|swim|)\s*(\d+)\s*?(?:ft)?\s*(\(.*\))?/gi;

		while(match = regex.exec(speed)) {
			if(!match[2]) {
				throw 'Character doesn\'t have valid speed format';
			}
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
			if (!match[1] || !match[2]) {
				throw 'Character doesn\'t have valid senses format';
			}

			var attrName = match[1].toLowerCase(),
					value = match[2];

			if (match[3]) {
				if (match[3].indexOf('blind beyond')) {
					setAttribute('blindsight_blind_beyond', 'on');
				}
			}
			setAttribute(attrName, value);
		}
	}

	function setTokenVision(token) {
		var blindsight = parseInt(getAttrByName(characterId, 'blindsight'), 10) || 0,
				darkvision = parseInt(getAttrByName(characterId, 'darkvision'), 10) || 0,
				tremorsense = parseInt(getAttrByName(characterId, 'tremorsense'), 10) || 0,
				truesight = parseInt(getAttrByName(characterId, 'truesight'), 10) || 0,
				longestVisionRange = Math.max(blindsight, darkvision, tremorsense, truesight),
				longestVisionRangeForSecondaryDarkvision = Math.max(blindsight, tremorsense, truesight),
				lightRadius,
				dimRadius;

		if(longestVisionRange === blindsight) {
			lightRadius = blindsight;
			dimRadius = blindsight;
		} else if(longestVisionRange === tremorsense) {
			lightRadius = tremorsense;
			dimRadius = tremorsense;
		} else if(longestVisionRange === truesight) {
			lightRadius = truesight;
			dimRadius = truesight;
		} else if(longestVisionRange === darkvision) {
			lightRadius = Math.ceil(darkvision * 1.1666666);
			if(longestVisionRangeForSecondaryDarkvision > 0) {
				dimRadius = longestVisionRangeForSecondaryDarkvision;
			} else {
				dimRadius = -5;
			}
		}

		if(lightRadius > 0) {
			token.set('light_radius', lightRadius);
		}
		if(dimRadius) {
			token.set('light_dimradius', dimRadius);
		}
		token.set('light_hassight', true);
		token.set('light_angle', 360);
		token.set('light_losangle', 360);
	}


	function parseChallenge(cr) {
		var input = cr.replace(/[, ]/g, '');
		var match = input.match(/([\d/]+).*?(\d+)/);
		setAttribute('challenge', match[1]);

		var xp = parseInt(match[2]);
		if(getAttrByName(characterId, 'xp') !== xp) {
			setAttribute('xp', xp);
		}
	}

	function parseSavingThrow(save) {
		var regex = /(STR|DEX|CON|INT|WIS|CHA).*?(\d+)/gi,
				attr;
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

			var proficiencyBonus = (2 + Math.floor(Math.abs((eval(getAttrByName(characterId, 'challenge'))-1)/4))),
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


				var proficiencyBonus = (2 + Math.floor(Math.abs((eval(getAttrByName(characterId, 'challenge'))-1)/4))),
						totalSkillBonus = match[2] - Math.floor((getAttrByName(characterId, abilitymod) - 10) / 2);

				var expertise = proficiencyBonus * 2;

				if(totalSkillBonus >= expertise) {
					setAttribute(attr + '_prof_exp', '@{exp}');
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
			setAttribute('toggle_reactions', 'on');
		}
	}

	function parseActions(actions, actionType) {
		if(!actionType) {
			actionType = '';
		}
		var multiAttackText,
				actionPosition = []; // For use with multiattack.

		function processActions (actionList) {
			var actionNum = 0,
					legendaryActionsNotes = [];

			function setNPCActionAttribute(attribute, value, ifQuery) {
				if(typeof ifQuery === 'undefined') {
					ifQuery = value;
				}
				if(ifQuery) {
					setAttribute('repeating_' + actionType + 'actions_' + actionNum + '_' + attribute, value);
				}
			}
			function setNPCActionToggle(attribute, toggle) {
				if(typeof toggle === 'undefined' || toggle) {
					setAttribute('repeating_' + actionType + 'actions_' + actionNum + '_toggle_' + attribute, '@{repeating_' + actionType + 'actions_' + actionNum + '_var_' + attribute + '}');
				}
			}
			function parseCritDamage(damage) {
				return damage.replace(/\s?[\+\-]\s?\d+/g, '');
			}

			function setName(name) {
				setNPCActionAttribute('name', name);
			}
			function setType(type) {
				setNPCActionAttribute('type', type);
			}
			function setTarget(target) {
				setNPCActionAttribute('target', target);
			}
			function setRange(type) {
				setNPCActionAttribute('range', type);
			}

			function setDamage(damage, altSecondary) {
				setNPCActionAttribute(altSecondary + 'dmg', damage);
			}
			function toggleDamage(altSecondary) {
				setNPCActionToggle(altSecondary + 'damage');
			}
			function setDamageType(type, altSecondary) {
				setNPCActionAttribute(altSecondary + 'dmg_type', type);
			}
			function setCritDamage(critDamage, altSecondary) {
				setNPCActionAttribute(altSecondary + 'crit_dmg', critDamage);
			}
			function setAltDamageReason(damageReason) {
				setNPCActionAttribute('alt_' + 'dmg_reason', damageReason);
			}
			function setEffect(effect) {
				if(effect) {
					setNPCActionAttribute('effect', effect.replace(/(\s*?Hit:\s?)/gi, '').replace(/(\d+)d(\d+)/g, '[[$1d$2]]').replace(/\s(\d+)\s/g, ' [[$1]] '));
				}
				setNPCActionToggle('effects', effect);
			}

			function setSaveDC(saveDC) {
				setNPCActionAttribute('save_dc', saveDC);
			}
			function setSaveStat(saveStat) {
				if(saveStat) {
					setNPCActionAttribute('save_stat', saveStat.substring(0, 3));
				}
			}
			function toggleSave(toggle) {
				setNPCActionToggle('save', toggle);
			}
			function toggleSaveDamage(toggle) {
				setNPCActionToggle('save_damage', toggle);
			}
			function setSaveDamage(saveDamage) {
				setNPCActionAttribute('save_dmg', saveDamage);
			}
			function setSaveDamageType(saveDamageType) {
				setNPCActionAttribute('save_dmg_type', saveDamageType);
			}
			function setSaveSuccess(saveSuccess) {
				setNPCActionAttribute('save_success', saveSuccess);
			}
			function setSaveEffect(saveEffect) {
				setEffect(saveEffect);
			}

			var commaPeriodSpace = /\,?\.?\s*?/,
					commaPeriodDefinitiveSpace = /\,?\.?\s*/,
					commaPeriodOneSpace = /\,?\.?\s?/,
					hit = /Hit:.*?/,
					each = /(?: Each).*?/,
					damageType = /((?:[\w]+|[\w]+\s(?:or|and)\s[\w]+)(?:\s*?\([\w\s]+\))?)\s*?damage\s?(\([\w\'\s]+\))?/,
					damageSyntax = /(?:(\d+)|.*?\(([\dd\s\+\-]*)\).*?)\s*?/,
					altDamageSyntax = /(?:\,\s*?or\s*?)/,
					altDamageReasonSyntax = /((?:if|in)[\w\s]+)/,
					altDamageExtraSyntax = /(The.*|If the.*)?/,
					plus = /\s*?plus\s*?/,
					savingThrow = /(?:DC)\s*?(\d+)\s*?([a-zA-Z]*)\s*?(?:saving throw)/,
					takeOrTaking = /\,?\s*?(?:taking|or take)/,
					againstDisease = /(?: against disease)?/,
					saveSuccess = /(?:.*or\s(.*)?\son a successful one.)?/,
					saveFailure = /(?:On a (?:failure|failed save))\,\s(?:(.*). On a success,\s(.*)?)?(.*)?/,
					andAnythingElse = /(\s?and.*)?/,
					orAnythingElseNoTake = /(or\s(?!take).*)/,
					anythingElse = /(.*)?/,
					damageRegex = new RegExp(hit.source + damageSyntax.source + damageType.source + commaPeriodSpace.source + andAnythingElse.source, 'i'),
					damagePlusRegex = new RegExp(plus.source + damageSyntax.source + damageType.source + commaPeriodSpace.source + anythingElse.source, 'i'),
					altDamageRegex = new RegExp(altDamageSyntax.source + damageSyntax.source + damageType.source + commaPeriodSpace.source + altDamageReasonSyntax.source + commaPeriodOneSpace.source + altDamageExtraSyntax.source, 'i'),
					hitEffectRegex = new RegExp(hit.source + anythingElse.source, 'i'),
					saveDamageRegex = new RegExp(savingThrow.source + takeOrTaking.source + damageSyntax.source + damageType.source + saveSuccess.source + commaPeriodSpace.source + anythingElse.source, 'i'),
					saveOrRegex = new RegExp(savingThrow.source + againstDisease.source + commaPeriodDefinitiveSpace.source + orAnythingElseNoTake.source, 'i'),
					saveFailedSaveRegex = new RegExp(savingThrow.source + commaPeriodSpace.source + saveFailure.source, 'i');

			function parseDamage(damage, altSecondary) {
				//log('parseDamage: ' + damage);
				if(damage) {
					//1 is damage without dice. Example "1"
					//2 is damage with dice. Example "2d6+4"
					//3 is damage type. Example "slashing" or "lightning or thunder"
					//4 is damage type explanation. Example "(djinni's choice)"
					//5 is effects
					if(damage[1]) {
						damage[2] = damage[1];
					}
					if(damage[2]) {
						setDamage(damage[2], altSecondary);
						setCritDamage(parseCritDamage(damage[2]), altSecondary);
					}
					if(damage[4]) {
						damage[3] += ' ' + damage[4];
					}
					if(damage[3]) {
						setDamageType(damage[3], altSecondary);
					}
					if(damage[2] || damage[3]) {
						toggleDamage(altSecondary);
					}
					if(damage[5]) {
						setEffect(damage[5].trim());
					}
					if(damage[6]) {
						setAltDamageReason(damage[6]);
					}
				}
			}

			_.each(actionList, function(value, key) {
				var parsedAttack = false,
						parsedDetails = false,
						parsedSave = false,
						parsedDamage = false,
						parsed,
						pos = key.indexOf('(');

				if(pos > 1) {
					actionPosition[actionNum] = key.substring(0, pos - 1).toLowerCase();
				} else {
					actionPosition[actionNum] = key.toLowerCase();
				}

				var keyRegex = /\s*?\(Recharge\s*?(\d+\-\d+|\d+)\)/gi;
				while(keyResult = keyRegex.exec(key)) {
					setNPCActionAttribute('recharge', keyResult[1]);
					setNPCActionToggle('recharge', keyResult[1]);
					if(keyResult[1]) {
						key = key.replace(keyRegex, '');
					}
				}
				setName(key);

				var splitAction = value.split(/\.(.+)?/),
						attackInfo = splitAction[0],
						splitAttack = attackInfo.split(',');

				var typeRegex = /(melee|ranged|melee or ranged)\s*(spell|weapon)\s*/gi;
				while(type = typeRegex.exec(splitAttack[0])) {
					if(type[1]) {
						var meleeOrRanged = 'Melee or Ranged';
						if(type[1].toLowerCase() === meleeOrRanged.toLowerCase()) {
							type[1] = 'Thrown';
						}
						setType(shaped.capitalizeEachWord(type[1]));
					}
					if(type[2]) {
						var attackWeaponOrSpell = shaped.capitalizeEachWord(type[2]);
					}
					parsedAttack = true;
				}
				var toHitRegex = /\+\s?(\d+)\s*(?:to hit)/gi;
				while(toHit = toHitRegex.exec(splitAttack[0])) {
					if(toHit[1]) {
						setNPCActionAttribute('tohit', toHit[1]);
						setNPCActionToggle('attack');
						setNPCActionToggle('crit');
					}
					if(splitAttack[2]) {
						setTarget(splitAttack[2].trim().toLowerCase());
						parsedDetails = true;
					}
					parsedAttack = true;
				}
				var reachRegex = /(?:reach)\s?(\d+)\s?(?:ft)/gi;
				while(reach = reachRegex.exec(splitAttack[1])) {
					if(reach[1]) {
						setNPCActionAttribute('reach', reach[1] + ' ft', reach[1]);
					}
					parsedAttack = true;
					parsedDetails = true;
				}
				var rangeRegex = /(?:range)\s?(\d+)\/(\d+)\s?(ft)/gi;
				while(range = rangeRegex.exec(splitAttack[1])) {
					if(range[1] && range[2]) {
						setRange(range[1] + '/' + range[2] + ' ft');
					}
					parsedAttack = true;
					parsedDetails = true;
				}


				var damage = damageRegex.exec(value);
				if(damage) {
					parseDamage(damage, '');
				} else {
					var hitEffect = hitEffectRegex.exec(value);
					if(hitEffect) {
						if(hitEffect[1]) {
							setEffect(hitEffect[1].trim());
						}
					}
				}

				var damagePlus = damagePlusRegex.exec(value);
				if(damagePlus) {
					parseDamage(damagePlus, 'second_');
				}
				var altDamage = altDamageRegex.exec(value);
				if(altDamage) {
					altDamage[6] = [altDamage[5], altDamage[5] = altDamage[6]][0]; //swap 5 and 6
					parseDamage(altDamage, 'alt_');
				}

				var damage = damageRegex.exec(value);
				if(saveDmg) {
					parseDamage(damage, '');
				}

				var saveDmg = saveDamageRegex.exec(value);
				if(saveDmg) {
					//1 is save DC. Example "13"
					//2 is save stat. Example "Dexterity"
					//3 is damage without dice. Example "1"
					//4 is damage with dice. Example "2d6+4"
					//5 is damage type. Example "slashing" or "lightning or thunder"
					//6 is damage type explanation. Example "(djinni's choice)"
					//7 is save success. Example "half as much damage"
					//8 is effects

					if(saveDmg[1]) {
						setSaveDC(saveDmg[1]);
					}
					if(saveDmg[2]) {
						setSaveStat(saveDmg[2]);
					}
					if(saveDmg[3]) {
						saveDmg[4] = saveDmg[3];
					}
					if(saveDmg[4]) {
						setSaveDamage(saveDmg[4]);
					}
					if(saveDmg[6]) {
						saveDmg[5] += ' ' + saveDmg[6];
					}
					if(saveDmg[5]) {
						setSaveDamageType(saveDmg[5]);
					}
					if(saveDmg[7]) {
						setSaveSuccess(saveDmg[7]);
					}
					if(saveDmg[8]) {
						setSaveEffect(saveDmg[8]);
					}
					if(saveDmg[1] || saveDmg[2] || saveDmg[8]) {
						toggleSave();
					}
					if(saveDmg[4] || saveDmg[5] || saveDmg[7]) {
						toggleSaveDamage();
					}
					parsedSave = true;
				}

				var saveOr = saveOrRegex.exec(value);
				if(saveOr) {
					//1 is save DC. Example "13"
					//2 is save stat. Example "Dexterity"
					//3 is effects

					//log('saveOr: ' + saveOr);
					if(saveOr[1]) {
						setSaveDC(saveOr[1]);
					}
					if(saveOr[2]) {
						setSaveStat(saveOr[2]);
					}
					if(saveOr[3]) {
						setSaveEffect(saveOr[3]);
					}
					if(saveOr[1] || saveOr[2] || saveOr[3]) {
						toggleSave();
					}
					parsedSave = true;
				}

				var saveFailed = saveFailedSaveRegex.exec(value);
				if(saveFailed) {
					//1 is save DC. Example "13"
					//2 is save stat. Example "Dexterity"
					//3 is failure state (effects)
					//4 is success state
					//5 is failure state w/o success sate.

					//log('saveFailed: ' + saveFailed);
					if(saveFailed[1]) {
						setSaveDC(saveFailed[1]);
					}
					if(saveFailed[2]) {
						setSaveStat(saveFailed[2]);
					}
					if(saveFailed[5]) {
						saveFailed[3] = saveFailed[5];
					}
					if(saveFailed[3]) {
						setSaveEffect(saveFailed[3]);
					}
					if(saveFailed[4]) {
						setSaveSuccess(saveFailed[4]);
					}
					if(saveFailed[1] || saveFailed[2] || saveFailed[3] || saveFailed[4]) {
						toggleSave();
					}
					parsedSave = true;
				}

				var saveRangeRegex = /((?:Each | a | an | one ).*(?:creature|target).*)\swithin\s*?(\d+)\s*?(?:feet|ft)/gi;
				while(saveRange = saveRangeRegex.exec(value)) {
					if(saveRange[1]) {
						setTarget(saveRange[1].trim());
					}
					if(saveRange[2]) {
						setRange(saveRange[2] + ' ft', saveRange[2]);
					}
					parsedDetails = true;
				}

				var lineRangeFootRegex = /(\d+)\-foot line\s*?that is (\d+) feet wide/gi,
						lineRangeFoot = lineRangeFootRegex.exec(value),
						lineRangeFeetRegex = /line that is (\d+)\sfeet long\s*?and (\d+) feet wide/gi,
						lineRangeFeet = lineRangeFeetRegex.exec(value),
						lineRange = lineRangeFoot || lineRangeFeet;
				if(lineRange) {
					setType('Line');
					if(lineRange[1] && lineRange[2]) {
						setRange(lineRange[1] + '-foot line that is ' + lineRange[2] + ' feet wide');
					} else if(lineRange[1]) {
						setRange(lineRange[1]);
					}
					parsedDetails = true;
				}

				var lineTargetRegex = /\.\s*(.*in that line)/gi;
				while(lineTarget = lineTargetRegex.exec(value)) {
					setTarget(lineTarget[1]);
					parsedDetails = true;
				}
				setNPCActionToggle('details', parsedDetails);


				function createTokenAction() {
					// Create token action
					if(shaped.usePowerAbility) {
						setAbility(key, '', powercardAbility(id, actionNum), shaped.createAbilityAsToken);
					} else {
						setAbility(key, '', '%{'+characterName+'|repeating_' + actionType + 'actions_' + actionNum + '_action}', shaped.createAbilityAsToken);
					}
				}
				parsed = parsedAttack || parsedDamage || parsedSave;
				if(!parsed) {
					if(actionType === 'legendary_') {
						legendaryActionsNotes.push(key + '. ' + value);
					} else {
						setEffect(value);
						createTokenAction();
						actionNum++;
					}
				} else {
					if(actionType === 'legendary_') {
						legendaryActionsNotes.push(key + '. See below');
					}
					if(key.indexOf('Costs ') > 0) {
						key = key.replace(/\s*\(Costs\s*\d+\s*Actions\)/gi, '');
						setName(key);
					}
					createTokenAction();
					actionNum++;
				}
			});

			if(legendaryActionsNotes.length > 0) {
				setAttribute('legendary_action_notes', legendaryActionsNotes.join('\n'));
			}
		}
		if(shaped.addInitiativeTokenAbility) {
			setAbility('Init', '', '%{'+characterName+'|Initiative}', shaped.createAbilityAsToken);
		}

		if(actions.Multiattack) {
			multiAttackText = actions.Multiattack;
			setAttribute('multiattack', multiAttackText);
			delete actions.Multiattack;

			setAttribute('toggle_multiattack', 'on');

			if(shaped.usePowerAbility) {
				setAbility('MultiAtk', '', powercardAbility(id, actionNumber), shaped.createAbilityAsToken);
			} else {
				setAbility('MultiAtk', '', '%{'+characterName+'|multiattack}', shaped.createAbilityAsToken);
			}
		}

		processActions(actions);

		if(actionType === 'lair_' && Object.keys(actions).length > 0) {
			setAttribute('toggle_lair_actions', 'on');
		}
		if(actionType === 'legendary_' && Object.keys(actions).length > 0) {
			setAttribute('toggle_legendary_actions', 'on');
		}

		function addActionToMultiattack(actionNumber) {
			if(multiattackScript !== '') {
				multiattackScript += '\n';
			}
			multiattackScript += '%{'+characterName+'|repeating_actions_' + actionNumber + '_action}';
		}

		if(multiAttackText) {
			var actionList = actionPosition.join('|'),
					multiattackRegex = new RegExp('(one|two|three)? (?:with its )?(' + actionList + ')( or)?', 'gi'),
					multiattackScript = '',
					actionNumber;

			while(match = multiattackRegex.exec(multiAttackText)) {
				var action = match[2],
						nb = match[1] || 'one';

				actionNumber = actionPosition.indexOf(action.toLowerCase());

				if(actionNumber !== -1) {
					addActionToMultiattack(actionNumber);
					if(nb == 'two') {
						addActionToMultiattack(actionNumber);
					}
					if(nb == 'three') {
						addActionToMultiattack(actionNumber);
					}
					if(match[3]) {
						multiattackScript += 'or\n';
					}

					delete actionPosition[actionNumber]; // Remove
				}
			}

			setAttribute('multiattack_script', multiattackScript);

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
			setAttribute('toggle_reactions', 'on');
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

		var speedConvertToOrig = [],
				speed = getAttrByName(characterId, 'npc_speed'),
				speed_fly = getAttrByName(characterId, 'npc_speed_fly'),
				speed_climb = getAttrByName(characterId, 'npc_speed_climb'),
				speed_swim = getAttrByName(characterId, 'npc_speed_swim');

		if(speed) {
			if(speed.indexOf('ft') !== 1) {
				speed += ' ft';
			}
			speedConvertToOrig.push(speed );
		}
		if(speed_fly) {
			if(speed_fly.indexOf('ft') !== 1) {
				speed_fly += ' ft';
			}
			speedConvertToOrig.push('fly ' + speed_fly);
		}
		if(speed_climb) {
			if(speed_climb.indexOf('ft') !== 1) {
				speed_climb += ' ft';
			}
			speedConvertToOrig.push('climb' + speed_climb);
		}
		if(speed_swim) {
			if(speed_swim.indexOf('ft') !== 1) {
				speed_swim += ' ft';
			}
			speedConvertToOrig.push('swim' + speed_swim);
		}
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

		setTokenVision(token);

		if(shaped.showName) {
			token.set('showname', true);
		}

		log('Character ' + token.attributes.name + ' converted');
		sendChat('Shaped', '/w gm Character ' + token.attributes.name + ' converted');
	};

	function clearBar(token, bar) {
		token.set(bar + '_link', '');
		token.set(bar + '_value', '');
		token.set(bar + '_max', '');
	}


	function parseValuesViaSendChat(name) {
		/*
		log(name + '----');
		sendChat('GM', '[[10 + @{Ankheg|perception}]]', function(ops) {
			log('ops: ' + ops);
			var rollResult = JSON.parse(ops[0].content);
			log('rollResult: ' + rollResult);
			if(_.has(rollResult, 'total')) {
		 		log('rollResult.total: ' + rollResult.total);
		 		return rollResult.total;
		 	}
	 	});
	 	*/
		return '';
	}

	function setBarValueAfterConvert(token, bar) {
		var parsebar = shaped['parse' + bar];

		if(parsebar !== '') {
			var objOfParsebar = findObjs({
						name: parsebar,
						_type: 'attribute',
						_characterid: characterId
					}, {caseInsensitive: true})[0],
					barLink, barCurrent, barMax;

			if(objOfParsebar) {
				barLink = objOfParsebar.id;
				barCurrent = objOfParsebar.attributes.current;
				barMax = objOfParsebar.attributes.max;
			} else {
				barLink = 'sheetattr_' + parsebar;
				barCurrent = parseValuesViaSendChat('Ankheg');
				barMax = parseValuesViaSendChat('Ankheg');
			}

			//log('barCurrent: ' + barCurrent);
			//log('barMax: ' + barMax);


			if(shaped['parse' + bar + '_link']) {
				log(bar + ': setting link to: ' + barLink);
				token.set(bar + '_link', barLink);
			} else {
				if(token.get(bar + '_link')) {
					log(bar + ': link isn\'t set in the bar settings, clearing link');
					token.set(bar + '_link', '');
				}
			}
			if(shaped['parse' + bar] !== '') {
				log(bar + ': setting current to: ' + barCurrent);
				token.set(bar + '_value', barCurrent);
			} else {
				if(token.get(bar + '_value')) {
					log(bar + ': current isn\'t set in the bar settings, clearing current');
					token.set(bar + '_value', '');
				}
			}
			if(shaped['parse' + bar + 'Max']) {
				log(bar + ': setting max to: ' + barMax);
				token.set(bar + '_max', barMax);
			} else {
				if(token.get(bar + '_max')) {
					log(bar + ': max isn\'t set in the bar settings, clearing max');
					token.set(bar + '_max', '');
				}
			}
		} else {
			log(bar + ': no defined bar setting in shaped-scripts (at the top of the page), clearing ' + bar + '.');
			clearBar(token, bar);
		}
	}

	shaped.setBars = function(token) {
		setBarValueAfterConvert(token, 'bar1');
		setBarValueAfterConvert(token, 'bar2');
		setBarValueAfterConvert(token, 'bar3');
	};

	shaped.cloneToken = function (msg, number) {
		number = parseInt(number, 10) || 1;

		shaped.getSelectedToken(msg, function(token){
			var match = token.get('imgsrc').match(/images\/.*\/(thumb|max)/i);
			if(match === null) {
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
				if(shaped.rollMonsterHpOnDrop === true)
					shaped.rollTokenHp(obj);
			}
		}, 1);
	};

}(typeof shaped === 'undefined' ? shaped = {} : shaped));

on('ready', function() {
	'use strict';
	shaped.statblock.RegisterHandlers();
});