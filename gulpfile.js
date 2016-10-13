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


const makeJSOutput = (sources) => {
  let output = "on('ready', function() {\n";
  Object.keys(sources).forEach((sourceName) => {
    sources[sourceName].name = sourceName;
    output += '  ShapedScripts.addEntities(' + JSON.stringify(sources[sourceName]) + ');\n';
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
const replaceSkillsAndSaves = (monster) => {
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
const lowerCon = (monster) => {
  const originalCon = parseInt(monster.constitution, 10);
  const potentialNewCon = Math.floor(originalCon * .95);
  if (originalCon - potentialNewCon >= 2) {
    monster.constitution = potentialNewCon;
  }
};

const monsterHouserules = (json) => {
  json.monsters.forEach((monster) => {
    replaceSkillsAndSaves(monster);
    lowerCon(monster);
  });
};

gulp.task('compileSpells', () => {
  gulp.src('./data/spellSourceFiles/spellData.json')
    .pipe(jsoncombine('5e-spells.js', (sources) => {
      return new Buffer(makeJSOutput(sources));
    }))
    .pipe(eol())
    .pipe(gulp.dest('./data'));
});

gulp.task('compileHouseruledSpells', () => {
  gulp.src('./data/spellSourceFiles/*.json')
    .pipe(jsoncombine('5e-spells-houserules.js', (sources) => {
      const output = makeJSOutput(sources);

      return new Buffer(output);
    }))
    .pipe(eol())
    .pipe(gulp.dest('./data'));
});

gulp.task('compileMonsters', () => {
  gulp.src('./data/monsterSourceFiles/*.json')
    .pipe(jsoncombine('5e-monsters.js', (sources) => {
      return new Buffer(makeJSOutput(sources));
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
      return new Buffer(makeJSOutput(sources));
    }))
    .pipe(eol())
    .pipe(gulp.dest('./data'));
});

gulp.task('compileAll', ['compileSpells', 'compileHouseruledSpells', 'compileMonsters', 'compileHouseruledMonsters']);

gulp.task('default', ['compileAll']);
