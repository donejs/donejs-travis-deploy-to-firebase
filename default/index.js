var yaml = require('js-yaml');
var includes = require('lodash.includes');
var Generator = require('yeoman-generator');

module.exports = Generator.extend({
  constructor: function constructor(args, opts) {
    Generator.call(this, args, opts);
    this.deployStep = 'npm run deploy:ci';
    this.travisConfigPath = this.destinationPath('.travis.yml');
  },

  initializing: function initializing() {
    var travisConfigExists = this.fs.exists(this.travisConfigPath);
    if (!travisConfigExists) {
      this.abort = true;
      this.log.error(
        'Travis config file not found!. Please run "donejs add travis" first.'
      );
      return;
    }

    this.travisYml = yaml.safeLoad(this.fs.read(this.travisConfigPath));
    if (includes(this.travisYml.before_deploy, this.deployStep)) { //jshint ignore:line
      this.abort = true;
      this.log('Firebase deploy step already found in .travis.yml');
      return;
    }
  },

  writing: function writing() {
    if (!this.abort) {
      this.log('Adding firebase deploy step to ' + this.travisConfigPath);

      /* jshint ignore:start */
      if (typeof this.travisYml.before_deploy == 'undefined') {
        this.travisYml.before_deploy = this.deployStep;
      } else if (typeof this.travisYml.before_deploy == 'string') {
        this.travisYml.before_deploy = [
          this.travisYml.before_deploy,
          this.deployStep
        ];
      } else if (Array.isArray(this.travisYml.before_deploy)) {
        this.travisYml.before_deploy.push(this.deployStep);
      }
      /* jshint ignore:end */

      this.fs.write(this.travisConfigPath, yaml.safeDump(this.travisYml));
    }
  }
});
