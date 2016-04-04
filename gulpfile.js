var gulp = require('gulp');
var inject = require('gulp-inject');
var uglify = require('gulp-uglify');
var fs = require('fs');
var rename = require('gulp-rename');
var jsoncombine = require('gulp-jsoncombine');

function entitySorter(a, b) {
  if (a.name < b.name) {
    return -1;
  } else if (a.name > b.name) {
    return 1;
  }
  return 0;
}

function compileSources(sources, arrayProp, patch) {
  var entities = {};
  entities[arrayProp] = [];
  Object.keys(sources).forEach(function (sourceName) {
    var source = sources[sourceName];
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
}

function makeJSOutput(entityLists) {
  var output = "on('ready', function() {\n";
  entityLists.forEach(function (entityList) {
    output += 'ShapedScripts.addEntities(' + JSON.stringify(entityList) + ');\n';
  });
  output += '});\n';
  return output;
}

gulp.task('compileSpells', function () {
  gulp.src('./data/spellSourceFiles/spellData.json')
      .pipe(jsoncombine('5e-spells.js', function (sources) {
        return new Buffer(makeJSOutput([compileSources(sources, 'spells')]));
      }))
      .pipe(gulp.dest('./data/'));
});

gulp.task('compileHouseruledSpells', function () {
  gulp.src('./data/spellSourceFiles/*.json')
      .pipe(jsoncombine('5e-spells-houserules.js', function (sources) {
        var houseRuled = Object.keys(sources)
            .filter(function (sourceKey) {
              return sourceKey !== 'spellData';
            })
            .map(function(sourceKey) {
              return sources[sourceKey];
            });
        var output = makeJSOutput([
          compileSources([sources.spellData], 'spells'),
          compileSources(houseRuled, 'spells', true)
        ]);

        return new Buffer(output);
      }))
      .pipe(gulp.dest('./data/'));
});

gulp.task('compileMonsters', function () {
  gulp.src('./data/monsterSourceFiles/*.json')
      .pipe(jsoncombine('5e-monsters.js', function (sources) {
        return new Buffer(makeJSOutput([compileSources(sources, 'monsters')]));
      }))
      .pipe(gulp.dest('./data/'));
});

gulp.task('compileAll', ['compileSpells', 'compileHouseruledSpells', 'compileMonsters']);

gulp.task('default', ['compileAll']);
