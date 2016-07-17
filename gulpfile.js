"use strict";
const gulp = require('gulp');
const inject = require('gulp-inject');
const uglify = require('gulp-uglify');
const fs = require('fs');
const jsoncombine = require('gulp-jsoncombine');
const eol = require('gulp-eol');

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

const replaceSkills = () => {

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
      var output = makeJSOutput([compileSources({ spellData: sources.spellData }, 'spells'), compileSources({ spellDataHouseruleAlterations: sources.spellDataHouseruleAlterations }, 'spells', true)]);

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
    .pipe(jsoncombine('5e-monsters-houserules.js', (sources) => {
      return new Buffer(makeJSOutput([compileSources(sources, 'monsters')]));
    }))
    .pipe(replaceSkills())
    .pipe(eol())
    .pipe(gulp.dest('./data'));
});

gulp.task('compileAll', ['compileSpells', 'compileHouseruledSpells', 'compileMonsters']);

gulp.task('default', ['compileAll']);
