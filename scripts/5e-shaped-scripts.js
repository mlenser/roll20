(function (shaped) {
  /****Import Options***/
  shaped.settings = {
    createAbilityAsToken: true,
    rollMonsterHpOnDrop: true, // will roll HP when character are dropped on map

    showName: true, //show the name on the map (not to players)
    showNameToPlayers: false, //show the name to players
    showCharacterNameOnRollTemplate: false, //show the character's name on their roll templates
    //useAaronsNumberedScript: true, //add numbers at the end if using his script

    //defaultTab: 'actions', //core is default. uncomment if you want the actions page. Change to 'spellbook' if you want the spellbook page. Change to 'all_npc' if you want to "Show All" for the NPC pages.
    sheetOutput: '', //change to 'hidden' if you wish the sheet to whisper all commands to the GM
    whisperDeathSaves: true, //change to false if you wish NPC death saves to be rolled openly
    initiativeTieBreaker: true, //change to true if you want to add the initiative modifier as a tie breaker for initiatives. (I use it)
    whisperInitiative: true, //always whisper initiative
    initiativeAddsToTracker: true, //change to false if you do not want to add the initiative to the tracker (mainly for the app)
    addInitiativeTokenAbility: true, //change to false if you do not want a macro "Init" on every token

    attacksVsTargetAC: false, //show the target's AC when using attacks
    attacksVsTargetName: false, //show the target's AC when using attacks

    useAmmoAutomatically: true,

    bar: [
      /* Setting these to a sheet value will set the token bar value. If they are set to '' or not set then it will use whatever you already have set on the token
       Do not use npc_HP, use HP instead
       */
      {
        name: 'npc_AC', // Green bar
        max: false,
        link: true,
        show: false
      }, {
        name: '', //Blue bar 'speed'
        max: false,
        link: false,
        show: false
      }, {
        name: 'HP', // Red bar
        max: true,
        link: false,
        show: false
      },
    ]
  };

  var spellsData = [];

  shaped.statblock = {
    version: '1.88',
    RegisterHandlers: function () {
      on('chat:message', HandleInput);

      if(shaped.settings.rollMonsterHpOnDrop) {
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

  function capitalizeFirstLetter (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  function HandleInput(msg) {
    if(shaped.settings.useAmmoAutomatically && msg.rolltemplate === '5eDefault' && msg.content.indexOf('{{ammo_auto=1}}') !== -1) {
      var character_name,
        attribute,
        match,
        regex = /\{\{(.*?)\}\}/gi;

      while(match = regex.exec(msg.content)) {
        if(match[1]) {
          var splitAttr = match[1].split('=');
          if(splitAttr[0] === 'character_name') {
            character_name = splitAttr[1];
          }
          if(splitAttr[0] === 'ammo_field') {
            attribute = splitAttr[1];
          }
        }
      }
      shaped.decrementAmmo(character_name, attribute);
    }

    if(msg.type !== 'api') {
      return;
    }
    log('msg.content: ' + msg.content);
    var args = msg.content.split(/\s+--/);
    switch(args[0]) {
      case '!build-monster':
      case '!shaped-parse':
      case '!shaped-import':
        if(args[1] && args[1] === 'clean') {
          shaped.getSelectedToken(msg, shaped.deleteOldSheet);
        }
        shaped.getSelectedToken(msg, shaped.ImportStatblock);
        break;
      case '!shaped-rollhp':
        shaped.getSelectedToken(msg, shaped.rollTokenHp);
        break;
      case '!shaped-settings':
        args.shift();
        shaped.changeSettings(args);
        break;
      case '!shaped-spell-import':
        args.shift();
        shaped.getSelectedToken(msg, shaped.spellImport, args);
        break;
      case '!shaped-convert':
        shaped.getSelectedToken(msg, shaped.parseOldToNew);
        break;
    }
  }

  function capitalizeEachWord(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  shaped.getSelectedToken = shaped.getSelectedToken || function(msg, callback) {
    try {
      if(!msg.selected || !msg.selected.length) {
        throw('No token selected');
      }

      for(var i = 0; i < msg.selected.length; i++) {
        if(msg.selected[i]._type === 'graphic') {
          var obj = getObj('graphic', msg.selected[i]._id);
          if(obj && obj.get('subtype') === 'token') {
            callback(obj, arguments[2]);
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
  };

  shaped.decrementAmmo = function (characterName, attributeName) {
    var obj = findObjs({
      _type: 'character',
      name: characterName
    })[0];
    var	attr = findObjs({
      _type: 'attribute',
      _characterid: obj.id,
      name: attributeName
    })[0];

    var val = parseInt(attr.get('current'), 10) || 0;

    attr.set({current: val - 1});
  };

  shaped.rollTokenHp = function(token) {
    var barOfHP;
    for(var i = 0; i < 3; i++) {
      if(shaped.settings.bar[i].name === 'HP') {
        barOfHP = i + 1;
        break;
      }
    }
    if(!barOfHP) {
      var message = 'One of the bar names has to be set to "HP" for random HP roll';
      log(message);
      sendChat('GM', '/w gm ' + message);
      return;
    }

    var barTokenName = 'bar' + (barOfHP),
      represent = token.get('represents');

    if(represent === '') {
      log('Token does not represent a character');
    } else if(token.get(barTokenName + '_link') !== '') {
      log('Token ' + barTokenName + ' is linked');
    } else {
      var isNPC = getAttrByName(represent, 'is_npc', 'current');
      if(isNPC === 1 || isNPC === '1') {
        rollCharacterHp(represent, function(total, average, formula) {
          token.set(barTokenName + '_value', total);
          token.set(barTokenName + '_max', total);
          var message = 'HP ('+ formula +') | average: ' + average + ' | rolled: ' + total;
          sendChat('GM', '/w gm ' +message);
        });
      }
    }
    log('Still working after trying to roll hp');
  };

  function rollCharacterHp(id, callback) {
    var hdArray = [4, 6, 8, 10, 12, 20],
      hdFormula = '',
      totalLevels = 0,
      hdAverage = 0;

    for (var i = 0; i < hdArray.length; i++) {
      var numOfHDRow = parseInt(getAttrByName(id, 'hd_d'+ hdArray[i], 'current'), 10);
      if(numOfHDRow) {
        if(hdFormula !== '') {
          hdFormula += ' + ';
        }
        totalLevels += numOfHDRow;
        hdFormula += numOfHDRow + 'd' + hdArray[i];

        hdAverage += (hdArray[i]/2 +.5) * numOfHDRow;
      }
    }

    var conToHp = totalLevels * Math.floor((getAttrByName(id, 'constitution', 'current') - 10) / 2);
    //add constitution mod
    hdFormula += ' + ' + conToHp;
    hdAverage += conToHp;

    hdAverage = Math.floor(hdAverage);

    sendChat('GM', '/roll ' + hdFormula, function(ops) {
      var rollResult = JSON.parse(ops[0].content);
      if(_.has(rollResult, 'total')) {
        callback(rollResult.total, hdAverage, hdFormula);
      }
    });
  }

  shaped.setCharacter = function(gmnotes) {
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

    characterId = obj.id;
    if(getAttrByName(characterId, 'is_npc') !== 1) {
      setAttribute('is_npc', 1);
    }

    return obj;
  };

  function setUserDefinedScriptSettings () {
    if(shaped.settings.defaultTab) {
      setAttribute('tab', shaped.settings.defaultTab);
    }
    if(shaped.settings.sheetOutput === 'hidden') {
      setAttribute('output_option', '@{output_to_gm}');
    } else {
      setAttribute('output_option', '@{output_to_all}');
    }
    if(shaped.settings.whisperDeathSaves) {
      setAttribute('death_save_output_option', '@{output_to_gm}');
    } else {
      setAttribute('death_save_output_option', '@{output_to_all}');
    }
    if(shaped.settings.whisperInitiative) {
      setAttribute('initiative_output_option', '@{output_to_gm}');
    } else {
      setAttribute('initiative_output_option', '@{output_to_all}');
    }
    if(shaped.settings.showCharacterNameOnRollTemplate) {
      setAttribute('show_character_name', '@{show_character_name_yes}');
    } else {
      setAttribute('show_character_name', '@{show_character_name_no}');
    }
    if(shaped.settings.initiativeTieBreaker) {
      setAttribute('initiative_tie_breaker', '((@{initiative_overall}) / 100)');
    } else {
      setAttribute('initiative_tie_breaker', '');
    }
    if(shaped.settings.initiativeAddsToTracker) {
      setAttribute('initiative_to_tracker', '@{initiative_to_tracker_yes}');
    } else {
      setAttribute('initiative_to_tracker', '@{initiative_to_tracker_no}');
    }
    if(shaped.settings.attacksVsTargetAC) {
      setAttribute('attacks_vs_target_ac', '@{attacks_vs_target_ac_yes}');
    } else {
      setAttribute('attacks_vs_target_ac', '@{attacks_vs_target_ac_no}');
    }
    if(shaped.settings.attacksVsTargetName) {
      setAttribute('attacks_vs_target_name', '@{attacks_vs_target_name_yes}');
    } else {
      setAttribute('attacks_vs_target_name', '@{attacks_vs_target_name_no}');
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
        if(shaped.settings.useAaronsNumberedScript && characterName.indexOf('%%NUMBERED%%') !== 1) {
          tokenName += ' %%NUMBERED%%';
        }
        token.set('name', tokenName);

        if(shaped.settings.showName) {
          token.set('showname', true);
        }
        if(shaped.settings.showNameToPlayers) {
          token.set('showplayers_name', true);
        }

        setUserDefinedScriptSettings();

        setBarValueAfterConvert(token);

        if(shaped.settings.bar[0].show) {
          token.set('showplayers_bar1', 'true');
        }
        if(shaped.settings.bar[1].show) {
          token.set('showplayers_bar2', 'true');
        }
        if(shaped.settings.bar[2].show) {
          token.set('showplayers_bar3', 'true');
        }

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

    characterName = capitalizeEachWord(section.attr.name.toLowerCase());

    shaped.setCharacter(text.replace(/#/g, '<br>'));
    processSection(section);
  };

  function clean(statblock) {
    return unescape(statblock)
      .replace(/\s\./g, '.')
      .replace(/–/g, '-')
      .replace(/<br[^>]*>/g, '#')
      .replace(/\s+#\s+/g, '#')
      .replace(/(<([^>]+)>)/gi, '')
      .replace(/#(?=[a-z]|DC)/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/#Hit:/gi, 'Hit:')
      .replace(/Hit:#/gi, 'Hit: ')
      .replace(/#Each /gi, 'Each ')
      .replace(/#On a successful save/gi, 'On a successful save')
      .replace(/DC#(\d+)/g, 'DC $1')
      .replace('LanguagesChallenge', 'Languages -#Challenge')
      .replace("' Speed", 'Speed')
      .replace(/#Medium or/gi, ' Medium or')
      .replace(/take#(\d+)/gi, 'take $1');
  }

  function sanitizeText (text) {
    if(typeof text !== 'string') {
      text = text.toString();
    }

    text = text.replace(/\,\./gi, ',').replace(/ft\s\./gi, 'ft.').replace(/ft\.\s\,/gi, 'ft').replace(/ft\./gi, 'ft').replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft').replace(/lOd/g, '10d').replace(/dl0/gi, 'd10').replace(/dlO/gi, 'd10').replace(/dl2/gi, 'd12').replace(/Sd(\d+)/gi, '5d$1').replace(/ld(\d+)/gi, '1d$1').replace(/ld\s+(\d+)/gi, '1d$1').replace(/(\d+)d\s+(\d+)/gi, '$1d$2').replace(/(\d+)\s+d(\d+)/gi, '$1d$2').replace(/(\d+)\s+d(\d+)/gi, '$1d$2').replace(/(\d+)d(\d)\s(\d)/gi, '$1d$2$3').replace(/(\d+)f(?:Day|day)/gi, '$1/Day').replace(/(\d+)f(\d+)/gi, '$1/$2').replace(/{/gi, '(').replace(/}/gi, ')').replace(/(\d+)\((\d+) ft/gi, '$1/$2 ft').replace(/• /gi, '').replace(/’/gi, '\'');
    text = text.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
    var replaceObj = {
      'ljday':'1/day',
      'abol eth':'aboleth',
      'ACT IONS':'ACTIONS',
      'Afrightened':'A frightened',
      'Alesser':'A lesser',
      'Aundefinedr':'After',
      'blindn ess':'blindness',
      'blind sight':'blindsight',
      'bofh':'both',
      'brea stplate':'breastplate',
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
      'lnt':'Int',
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
      'Spel/casting':'Spellcasting',
      'successfu l':'successful',
      'ta rget':'target',
      'Th e':'The',
      't_urns':'turns',
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
    regex = /(?:#)([A-Z][\w-\']+(?:\s(?:[A-Z][\w-\']+|[\(\)\d\-]|of|and|or|a)+)*)(?=\s*\.)/gi;
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

    for(var actionsKey in keyword.actions) {
      if (keyword.actions.hasOwnProperty(actionsKey)) {
        actionsPosArray.push(keyword.actions[actionsKey]);
      }
    }
    for(var legendaryKey in keyword.legendary) {
      if (keyword.legendary.hasOwnProperty(legendaryKey)) {
        actionsPosArray.push(keyword.legendary[legendaryKey]);
      }
    }
    for(var lairKey in keyword.lair) {
      if (keyword.lair.hasOwnProperty(lairKey)) {
        actionsPosArray.push(keyword.lair[lairKey]);
      }
    }
    actionsPosArray.sort(sortNumber);

    var lastActionIndex = actionsPosArray[actionsPosArray.length - 1] + 1,
      lastItemIndex;

    while(i < 6) {
      lastItem = splitStatblock[splitStatblock.length - i];
      lastItemIndex = statblock.indexOf(lastItem);
      if(lastItemIndex > lastActionIndex) {
        keyword.traits.Description = lastItemIndex - 1; //-1 to include the #
      }
      i++;
    }

    return keyword;
  }

  function splitStatblock(statblock, keyword) {
    var indexArray = [];

    for(var section in keyword) {
      if (keyword.hasOwnProperty(section)) {
        var obj = keyword[section];
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            indexArray.push(obj[key]);
          }
        }
      }
    }

    indexArray.sort(sortNumber);

    keyword.attr.name = extractSection(statblock.substring(0, indexArray[0]), 'name');

    for(var section in keyword) {
      if (keyword.hasOwnProperty(section)) {
        var obj = keyword[section];
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            var start = obj[key],
              nextPos = indexArray.indexOf(start) + 1,
              end = indexArray[nextPos] || statblock.length;

            keyword[section][key] = extractSection(statblock.substring(start, end), key);
          }
        }
      }
    }

    delete keyword.actions.Actions;
    delete keyword.legendary.Legendary;
    delete keyword.reactions.Reactions;

    // Patch for multiline abilities
    var abilitiesName = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    var abilities = '';
    for(var i = 0, len = abilitiesName.length; i < len; ++i) {
      if(keyword.attr.hasOwnProperty([abilitiesName[i]])) {
        abilities += keyword.attr[abilitiesName[i]] + ' ';
        delete keyword.attr[abilitiesName[i]];
      }
    }
    keyword.attr.abilities = abilities;

    // Size attribute:
    var sizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
    for(i = 0, len = sizes.length; i < len; ++i) {
      if(keyword.attr.hasOwnProperty([sizes[i]])) {
        keyword.attr.size = sizes[i] + ' ' + keyword.attr[sizes[i]];
        delete keyword.attr[sizes[i]];
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

  //Section parsing function
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
    if(!match || !match[1] || !match[2] || !match[3]) {
      throw 'Character doesn\'t have valid type/size/alignment format';
    }
    setAttribute('size', capitalizeEachWord(match[1]));
    setAttribute('npc_type', capitalizeEachWord(match[2]));
    setAttribute('alignment', capitalizeEachWord(match[3]));
  }

  function parseArmorClass(ac) {
    var match = ac.match(/(\d+)\s?(.*)/);
    if(!match || !match[1]) {
      throw 'Character doesn\'t have valid AC format';
    }
    setAttribute('npc_AC', match[1]);
    if(match[2]) {
      setAttribute('npc_AC_note', match[2].replace(/\(|\)/g, ''));
    }
  }

  function parseHD(hd) {
    var regex = (/(\d+)d(\d+)/gi),
      splitHD;

    while(splitHD = regex.exec(hd)) {
      if(!splitHD || !splitHD[1] || !splitHD[2]) {
        throw 'Character doesn\'t have valid hd format';
      }

      var numHD = splitHD[1],
        HDsize = 'd' + splitHD[2];

      setAttribute('hd_' + HDsize, numHD, numHD);
      setAttribute('hd_' + HDsize + '_toggle', 'on');
    }
  }

  function parseHp(hp) {
    var match = hp.match(/(\d+)\s?\(([\dd\s\+\-]*)\)/i);
    if(!match || !match[1] || !match[2]) {
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
      if (!match || !match[1] || !match[2]) {
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
      'acrobatics':'dexterity',
      'animal handling':'wisdom',
      'arcana':'intelligence',
      'athletics':'strength',
      'deception':'charisma',
      'history':'intelligence',
      'insight':'wisdom',
      'intimidation':'charisma',
      'investigation':'intelligence',
      'medicine':'wisdom',
      'nature':'intelligence',
      'perception':'wisdom',
      'performance':'charisma',
      'persuasion':'charisma',
      'religion':'intelligence',
      'sleight of hand':'dexterity',
      'stealth':'dexterity',
      'survival':'wisdom'
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
          setAttribute('repeating_' + actionType + 'actions_' + actionNum + '_' + attribute, value.trim());
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
        setNPCActionToggle('target');
      }
      function setRange(type) {
        setNPCActionAttribute('range', type);
        setNPCActionToggle('range');
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
        saveSuccessTwo = /(?:On a successful save,)?(.*)?/,
        saveFailure = /(?:On a (?:failure|failed save))\,\s(?:(.*). On a success,\s(.*)?)?(.*)?/,
        andAnythingElse = /(\s?and.*)?/,
        orAnythingElseNoTake = /(or\s(?!take).*)/,
        anythingElse = /(.*)?/,
        damageRegex = new RegExp(hit.source + damageSyntax.source + damageType.source + commaPeriodSpace.source + andAnythingElse.source, 'i'),
        damagePlusRegex = new RegExp(plus.source + damageSyntax.source + damageType.source + commaPeriodSpace.source + anythingElse.source, 'i'),
        altDamageRegex = new RegExp(altDamageSyntax.source + damageSyntax.source + damageType.source + commaPeriodSpace.source + altDamageReasonSyntax.source + commaPeriodOneSpace.source + altDamageExtraSyntax.source, 'i'),
        hitEffectRegex = new RegExp(hit.source + anythingElse.source, 'i'),
        saveDamageRegex = new RegExp(savingThrow.source + takeOrTaking.source + damageSyntax.source + damageType.source + saveSuccess.source + commaPeriodSpace.source + anythingElse.source + saveSuccessTwo.source, 'i'),
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
          parsedSave = false,
          parsedDamage = false,
          parsed,
          pos = key.indexOf('(');

        if(pos > 1) {
          actionPosition[actionNum] = key.substring(0, pos - 1).toLowerCase();
        } else {
          actionPosition[actionNum] = key.toLowerCase();
        }

        var keyRegex = /\s*?\((?:Recharge\s*?(\d+\-\d+|\d+)|Recharges\safter\sa\s(.*))\)/gi;
        while(keyResult = keyRegex.exec(key)) {
          var recharge = keyResult[1] || keyResult[2];
          setNPCActionAttribute('recharge', recharge);
          setNPCActionToggle('recharge');
          if(recharge) {
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
            setType(capitalizeEachWord(type[1]));
          }
          if(type[2]) {
            var attackWeaponOrSpell = capitalizeEachWord(type[2]);
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
          }
          parsedAttack = true;
        }
        var reachRegex = /(?:reach)\s?(\d+)\s?(?:ft)/gi;
        while(reach = reachRegex.exec(splitAttack[1])) {
          if(reach[1]) {
            setNPCActionAttribute('reach', reach[1] + ' ft', reach[1]);
            setNPCActionToggle('reach');
          }
          parsedAttack = true;
        }
        var rangeRegex = /(?:range)\s?(\d+)\/(\d+)\s?(ft)/gi;
        while(range = rangeRegex.exec(splitAttack[1])) {
          if(range[1] && range[2]) {
            setRange(range[1] + '/' + range[2] + ' ft');
          }
          parsedAttack = true;
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
          //9 is the other form of save success

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
          if(saveDmg[9]) {
            saveDmg[7] = saveDmg[9];
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

        var saveRangeRegex = /((?:Each | a | an | one ).*(?:creature|target).*)\s(?:within|in)\s*?a?\s*?(\d+)\s*?(?:feet|ft)/gi;
        while(saveRange = saveRangeRegex.exec(value)) {
          if(saveRange[1]) {
            setTarget(saveRange[1].trim());
          }
          if(saveRange[2]) {
            setRange(saveRange[2] + ' ft', saveRange[2]);
          }
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
        }

        var lineTargetRegex = /\.\s*(.*in that line)/gi;
        while(lineTarget = lineTargetRegex.exec(value)) {
          setTarget(lineTarget[1]);
        }


        function createTokenAction() {
          // Create token action
          setAbility(key, '', '%{'+characterName+'|repeating_' + actionType + 'actions_' + actionNum + '_action}', shaped.settings.createAbilityAsToken);
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
    if(shaped.settings.addInitiativeTokenAbility) {
      setAbility('Init', '', '%{'+characterName+'|Initiative}', shaped.settings.createAbilityAsToken);
    }

    for(var key in actions) {
      var multiattackRegex = /Multiattack(?:\s*(\(.*\)))?/gi,
        multi = multiattackRegex.exec(key),
        multiAttackText = '';
      if(multi) {
        if(multi[1]) {
          multiAttackText = multi[1] + ': ';
        }
        multiAttackText += actions[key];
        setAttribute('multiattack', multiAttackText);
        delete actions[key];

        setAttribute('toggle_multiattack', 'on');

        setAbility('MultiAtk', '', '%{'+characterName+'|multiattack}', shaped.settings.createAbilityAsToken);
        break;
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

    if(shaped.settings.showName) {
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

  function setBarValueAfterConvert(token) {
    for(var i = 0; i < 3; i++) {
      var barName = shaped.settings.bar[i].name,
        barTokenName = 'bar' + (i + 1);

      if(barName !== '') {
        var objOfBar = findObjs({
            name: barName,
            _type: 'attribute',
            _characterid: characterId
          }, {caseInsensitive: true})[0],
          barLink, barCurrent, barMax;

        if(objOfBar) {
          barLink = objOfBar.id;
          barCurrent = objOfBar.attributes.current;
          barMax = objOfBar.attributes.max;
        } else {
          barLink = 'sheetattr_' + barName;
          /*
          barCurrent = parseValuesViaSendChat(barName);
          barMax = parseValuesViaSendChat(barName);
          */
        }

        if(shaped.settings.bar[i].link) {
          log(barTokenName + ': setting link to: ' + barLink);
          token.set(barTokenName + '_link', barLink);
        } else {
          if(token.get(barTokenName + '_link')) {
            log(barTokenName + ': link isn\'t set in the bar settings, clearing link');
            token.set(barTokenName + '_link', '');
          }
        }
        if(barName) {
          log(barTokenName + ': setting current to: ' + barCurrent);
          token.set(barTokenName + '_value', barCurrent);
        } else {
          if(token.get(barTokenName + '_value')) {
            log(barTokenName + ': current isn\'t set in the bar settings, clearing current');
            token.set(barTokenName + '_value', '');
          }
        }
        if(shaped.settings.bar[i].max) {
          log(barTokenName + ': setting max to: ' + barMax);
          token.set(barTokenName + '_max', barMax);
        } else {
          if(token.get(barTokenName + '_max')) {
            log(barTokenName + ': max isn\'t set in the bar settings, clearing max');
            token.set(barTokenName + '_max', '');
          }
        }
      } else {
        log(barTokenName + ': no defined bar setting in shaped-scripts (at the top of the page), clearing ' + barTokenName + '.');
        clearBar(token, barTokenName);
      }
    }
  }

  shaped.setBars = function(token) {
    setBarValueAfterConvert(token);
  };

  shaped.changeSettings = function(args) {
    log(args);
    var changeNPCs = false,
      changePCs = false,
      attributeName,
      attributeValue;

    if (args[0] === 'npcs') {
      changeNPCs = true;
    } else if (args[0] === 'pcs') {
      changePCs = true;
    } else if (args[0] === 'all') {
      changeNPCs = true;
      changePCs = true;
    } else {
      var errorMessage = "invalid target. Please send 'npcs', 'pcs', or 'all'";
      log(errorMessage);
      sendChat('GM', '/w GM ' + errorMessage);
    }

    var validAttributeName = ['output_option', 'death_save_output_option', 'initiative_output_option', 'show_character_name', 'initiative_tie_breaker', 'initiative_to_tracker', 'attacks_vs_target_ac', 'attacks_vs_target_name'];
    if (validAttributeName.indexOf(args[1]) !== -1) {
      attributeName = args[1];
    } else {
      var errorMessage = 'invalid attribute. Please use one of the following: ' + validAttributeName.join(', ');
      log(errorMessage);
      sendChat('GM', '/w GM ' + errorMessage);
      return
    }

    var validAttributeValue = ['hide', 'show', 'yes', 'no'];
    if (validAttributeValue.indexOf(args[2]) !== -1) {
      if(attributeName === 'output_option' || attributeName === 'death_save_output_option' || attributeName === 'initiative_output_option') {
        if(args[2] === 'show') {
          attributeValue = '@{output_to_all}';
        } else if(args[2] === 'hide') {
          attributeValue = '@{output_to_gm}';
        }
      }
      if(attributeName === 'show_character_name') {
        if(args[2] === 'no') {
          attributeValue = '@{show_character_name_no}';
        } else if(args[2] === 'yes') {
          attributeValue = '@{show_character_name_yes}';
        }
      }
      if(attributeName === 'initiative_tie_breaker') {
        if(args[2] === 'no') {
          attributeValue = '';
        } else if(args[2] === 'yes') {
          attributeValue = '((@{initiative_overall}) / 100)';
        }
      }
      if(attributeName === 'initiative_to_tracker') {
        if(args[2] === 'no') {
          attributeValue = '@{initiative_to_tracker_no}';
        } else if(args[2] === 'yes') {
          attributeValue = '@{initiative_to_tracker_yes}';
        }
      }
      if(attributeName === 'attacks_vs_target_ac') {
        if(args[2] === 'no') {
          attributeValue = '@{attacks_vs_target_ac_no}';
        } else if(args[2] === 'yes') {
          attributeValue = '@{attacks_vs_target_ac_yes}';
        }
      }
      if(attributeName === 'attacks_vs_target_name') {
        if(args[2] === 'no') {
          attributeValue = '@{attacks_vs_target_name_no}';
        } else if(args[2] === 'yes') {
          attributeValue = '@{attacks_vs_target_name_yes}';
        }
      }
    } else {
      var errorMessage = 'invalid value. Please use one of the following: ' + validAttributeValue.join(', ');
      log(errorMessage);
      sendChat('GM', '/w GM ' + errorMessage);
      return;
    }


    var creaturesToChange = filterObjs(function (obj) {
      if(obj.get('type') === 'character') {
        var is_npc = parseInt(getAttrByName(obj.id, 'is_npc'), 10);

        return changeNPCs && is_npc === 1 || changePCs && is_npc === 0;
      }
      return null;
    });

    creaturesToChange.forEach(function (obj) {
      var attr = findObjs({
        _type: 'attribute',
        _characterid: obj.id,
        name: attributeName
      })[0];

      if(!attr) {
        createObj('attribute', {
          name: attributeName,
          current: attributeValue,
          characterid: obj.id
        });
      } else if(!attr.get('current') || attr.get('current').toString() !== attributeValue) {
        attr.set({
          current: attributeValue
        });
      }
    });

    if(creaturesToChange.length > 0) {
      log('changed ' + attributeName + ' to ' + attributeValue + ' for ' + creaturesToChange.length + ' creatures');
      sendChat('GM', '/w GM changed "' + attributeName + '" to ' + attributeValue.replace('@{', '"').replace('}', '"') + ' for ' + creaturesToChange.length + ' creatures');
    } else {
      var errorMessage = 'no creatures match those parameters';
      log(errorMessage);
      sendChat('GM', '/w GM ' + errorMessage);
    }
  };

  shaped.importSpell = function(character, characterName, spellName) {
    var spell = spellsData.filter(function ( obj ) {
        return obj.name.toLowerCase() === spellName.toLowerCase();
      })[0],
      spellBase = 'repeating_spellbook',
      spellIndex;

    if(!spell) {
      var message = 'Error: cannot find a spell by the name of "' + spellName + '".';
      log(message);
      sendChat('GM', '/w gm ' + message);
      return
    }
    if(typeof(character) === 'undefined') {
      var message = 'Error: cannot find a character by the name of "' + characterName + '".';
      log(message);
      sendChat('GM', '/w gm ' + message);
      return
    }
    characterId = character.id;

    if(spell.level === 0) {
      spellBase += 'cantrip_';
    } else {
      spellBase += 'level' + spell.level + '_';
    }

    for (var i = 0; i < 100; i++) {
      var attr = findObjs({
        _type: 'attribute',
        _characterid: characterId,
        name: spellBase + i + '_' + 'spellname'
      })[0];

      if(!attr) {
        spellIndex = i;
        spellBase += spellIndex + '_';
        break;
      }
    }

    setAttribute(spellBase + 'spellname', spell.name);
    if(spell.ritual) {
      setAttribute(spellBase + 'spellritual', '{{spellritual=1}}');
    }
    if(spell.concentration) {
      setAttribute(spellBase + 'spellconcentration', '{{spellconcentration=1}}');
    }
    if(spell.school) {
      setAttribute(spellBase + 'spellschool', spell.school);
    }
    if(spell.castingTime) {
      setAttribute(spellBase + 'spellcasttime', spell.castingTime);
    }
    if(spell.range) {
      setAttribute(spellBase + 'spellrange', spell.range);
    }
    if(spell.target) {
      setAttribute(spellBase + 'spelltarget', spell.target);
    }
    if(spell.aoe) {
      setAttribute(spellBase + 'spellaoe', spell.aoe);
    }
    if(spell.components) {
      if(spell.components.verbal) {
        setAttribute(spellBase + 'spellcomponents_verbal', '@{spellcomponents_verbal_var}');
      }
      if(spell.components.somatic) {
        setAttribute(spellBase + 'spellcomponents_somatic', '@{spellcomponents_somatic_var}');
      }
      if(spell.components.material) {
        setAttribute(spellBase + 'spellcomponents_material', '@{spellcomponents_material_var}');
      }
      if(spell.components.materialMaterial) {
        setAttribute(spellBase + 'spellcomponents', '(' + spell.components.materialMaterial + ')');
      }
    }
    if(spell.duration) {
      setAttribute(spellBase + 'spellduration', spell.duration);
    }
    if(spell.source) {
      setAttribute(spellBase + 'spellsource', spell.source);
      setAttribute(spellBase + 'spellshowsource', '@{spellshowsource_var}');

    }

    if(spell.description) {
      var spellDescription = spell.description.replace('<br>', '\n');
      setAttribute(spellBase + 'spelldescription', spellDescription);
      setAttribute(spellBase + 'spellshowdesc', '{{spellshowdesc=1}} {{spelldescription=@{spelldescription}}}');
    }
    if(spell.higherLevel) {
      setAttribute(spellBase + 'spellhighersloteffect', spell.higherLevel);
      setAttribute(spellBase + 'spellshowhigherlvl', '{{spellshowhigherlvl=1}} {{spellhigherlevel=@{spellhighersloteffect}}}');
    }
    if(spell.emote) {
      setAttribute(spellBase + 'spellemote', spell.emote);
      setAttribute(spellBase + 'spellshowemote', '@{spellshowemotevar}');
    }

    if(spell.save) {
      setAttribute(spellBase + 'spellshowsavethrow', '@{spellshowsavethrowvar}');
      if(spell.save.ability) {
        setAttribute(spellBase + 'savestat', capitalizeFirstLetter(spell.save.ability.substring(0, 3)));
        setAttribute(spellBase + 'spellsavedc', '');
      }
      if(spell.save.saveFailure) {
        setAttribute(spellBase + 'savefailure', spell.save.saveFailure);
      }
      if(spell.save.saveSuccess) {
        setAttribute(spellBase + 'savesuccess', spell.save.saveSuccess);
      }
    }

    if(spell.heal) {
      setAttribute(spellBase + 'spell_toggle_healing', '@{@{spell_var_healing}}');
      setAttribute(spellBase + 'spellhealamount', spell.heal.amount);
      if(spell.heal.castingStat) {
        setAttribute(spellBase + 'spellhealamount', spell.heal.castingStat);
      }
    }


    //TODO: {{GENDER_PRONOUN_HE_SHE}}, {{GENDER_PRONOUN_HIM_HER}}, {{GENDER_PRONOUN_HIS_HER}}, {{GENDER_PRONOUN_HIMSELF_HERSELF}}


    var message = spell.name + ' imported for ' + characterName + ' on spell level ' + spell.level + ' at index ' + spellIndex;
    log(message);
    sendChat('GM', '/w gm ' + message);
  };

  shaped.spellImport = function(token, args) {
    var spells = args[0].split(', '),
      id = token.get('represents'),
      character = findObjs({
        _type: 'character',
        id: id
      })[0],
      characterName = getAttrByName(id, 'character_name', 'current');

    for(var i = 0; i < spells.length; i++) {
      shaped.importSpell(character, characterName, spells[i]);
    }
  };

}(typeof shaped === 'undefined' ? shaped = {} : shaped));

on('ready', function() {
  'use strict';
  shaped.statblock.RegisterHandlers();
});