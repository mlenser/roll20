"use strict";
const gulp = require('gulp');
const inject = require('gulp-inject');
const uglify = require('gulp-uglify');
const fs = require('fs');
const jsoncombine = require('gulp-jsoncombine');
const eol = require('gulp-eol');
const jeditor = require('gulp-json-editor');

const oldSkillToNew = {
  'Animal Handling': 'Nature',
  Deception: 'Influence',
  History: 'Society',
  Intimidation: 'Influence',
  Investigation: 'Perception',
  Medicine: 'Nature',
  Persuasion: 'Influence',
  Survival: 'Nature'
};
const oldSaveToNew = {
  Strength: 'Reflex',
  Dexterity: 'Reflex',
  Constitution: 'Fortitude',
  Intelligence: 'Will',
  Wisdom: 'Will',
  Charisma: 'Will'
};

if (typeof Array.prototype.reIndexOf === 'undefined') {
  Array.prototype.reIndexOf = function (rx) {
    for (var i in this) {
      if (this[i].toString().match(rx)) {
        return i;
      }
    }
    return -1;
  };
}

const entitySorter = (a, b) => {
  if (a.name < b.name) {
    return -1;
  } else if (a.name > b.name) {
    return 1;
  }
  return 0;
};

const compileSources = (sources, arrayProp, patch) => {
  const entities = {};
  entities[arrayProp] = [];
  Object.keys(sources).forEach((sourceName) => {
    const source = sources[sourceName];
    if (!source.version) {
      throw new Error('JSON file: ' + source + ' has no version number');
    }
    if (!entities.version) {
      entities.version = source.version;
    }
    else if (entities.version !== source.version) {
      throw new Error('JSON file: ' + source + ' has version number ' + source.version + ' that is incompatible with other files');
    }

    entities[arrayProp] = entities[arrayProp].concat(source[arrayProp]);
    entities.patch = patch;
  });

  entities[arrayProp].sort(entitySorter);
  return entities;
};

const makeJSOutput = (entityLists) => {
  let output = "on('ready', function() {\n";
  entityLists.forEach((entityList) => {
    output += '  ShapedScripts.addEntities(' + JSON.stringify(entityList) + ');\n';
  });
  output += '});\n';
  return output;
};

const replaceOldSkillAndSave = (text) => {
  for (const key in oldSkillToNew) {
    text = text.replace(new RegExp(key, 'g'), oldSkillToNew[key]);
  }
  for (const key in oldSaveToNew) {
    text = text.replace(new RegExp(key, 'g'), oldSaveToNew[key]);
  }
  return text;
};
const replaceSkills = (monster) => {
  if (monster.skills) {
    const skills = monster.skills.split(', ');
    const newSkills = [];
    for (const skill of skills) {
      const skillName = skill.replace(/\s\+\d+/g, '');

      if (oldSkillToNew[skillName]) {
        const skillSearch = `${oldSkillToNew[skillName]}\\s\\+\\d+`;
        const skillSearchRegex = new RegExp(skillSearch, 'g');
        if (newSkills.reIndexOf(skillSearchRegex) === -1) {
          newSkills.push(skill.replace(skillName, oldSkillToNew[skillName]));
        } else {
        }
      } else {
        newSkills.push(skill);
      }
    }
    monster.skills = newSkills.join(', ');
  }
  if (monster.traits) {
    for (const trait of monster.traits) {
      trait.text = replaceOldSkillAndSave(trait.text);
    }
  }
  if (monster.actions) {
    for (const action of monster.actions) {
      action.text = replaceOldSkillAndSave(action.text);
    }
  }
  if (monster.reactions) {
    for (const reaction of monster.reactions) {
      reaction.text = replaceOldSkillAndSave(reaction.text);
    }
  }
  if (monster.legendaryActions) {
    for (const legendaryAction of monster.legendaryActions) {
      legendaryAction.text = replaceOldSkillAndSave(legendaryAction.text);
    }
  }
  if (monster.lairActions) {
    const newLairActions = [];
    for (let lairAction of monster.lairActions) {
      newLairActions.push(replaceOldSkillAndSave(lairAction));
    }
    monster.lairActions = newLairActions;
  }
  if (monster.regionalEffects) {
    const newRegionalEffects = [];
    for (let regionalEffect of monster.regionalEffects) {
      newRegionalEffects.push(replaceOldSkillAndSave(regionalEffect));
    }
    monster.regionalEffects = newRegionalEffects;
  }
};
const monsterHouserules = (json) => {
  json.monsters.forEach((monster) => {
    replaceSkills(monster);
  });
};

gulp.task('compileSpells', () => {
  gulp.src('./data/spellSourceFiles/spellData.json')
    .pipe(jsoncombine('5e-spells.js', (sources) => {
      return new Buffer(makeJSOutput([compileSources(sources, 'spells')]));
    }))
    .pipe(eol())
    .pipe(gulp.dest('./data'));
});

gulp.task('compileHouseruledSpells', () => {
  gulp.src('./data/spellSourceFiles/*.json')
    .pipe(jsoncombine('5e-spells-houserules.js', (sources) => {
      const output = makeJSOutput([compileSources({ spellData: sources.spellData }, 'spells'), compileSources({ spellDataHouseruleAlterations: sources.spellDataHouseruleAlterations }, 'spells', true)]);

      return new Buffer(output);
    }))
    .pipe(eol())
    .pipe(gulp.dest('./data'));
});

gulp.task('compileMonsters', () => {
  gulp.src('./data/monsterSourceFiles/*.json')
    .pipe(jsoncombine('5e-monsters.js', (sources) => {
      return new Buffer(makeJSOutput([compileSources(sources, 'monsters')]));
    }))
    .pipe(eol())
    .pipe(gulp.dest('./data'));
});

gulp.task('compileHouseruledMonsters', () => {
  gulp.src('./data/monsterSourceFiles/*.json')
    .pipe(jeditor((json) => {
      monsterHouserules(json);
      return json;
    }))
    .pipe(jsoncombine('5e-monsters-houserules.js', (sources) => {
      return new Buffer(makeJSOutput([compileSources(sources, 'monsters')]));
    }))
    .pipe(eol())
    .pipe(gulp.dest('./data'));
});

gulp.task('compileAll', ['compileSpells', 'compileHouseruledSpells', 'compileMonsters', 'compileHouseruledMonsters']);

gulp.task('default', ['compileAll']);
