var yaml = require('js-yaml');
var Generator = require('yeoman-generator');

module.exports = Generator.extend({
  constructor: function constructor(args, opts) {
    Generator.call(this, args, opts);
    this.travisConfigPath = this.destinationPath('.travis.yml');
    this.beforeDeploySteps = [
      'git config --global user.email "me@example.com"',
      'git config --global user.name "firebase deploy bot"',
      'node build',
      'git add dist/ --force',
      'git commit -m "Updating build."',
      'npm run deploy:ci'
    ];
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
    if (this.travisYml.before_deploy) { //jshint ignore:line
      this.abort = true;
      this.log.error(
        'There are before_deploy steps in your .travis.yml already. ' +
          'Please delete the "before_deploy" section before running this command.'
      );
      return;
    }
  },

  writing: function writing() {
    if (!this.abort) {
      this.log('Adding before deploy steps to ' + this.travisConfigPath);
      this.travisYml.before_deploy = this.beforeDeploySteps; //jshint ignore:line

      this.fs.write(this.travisConfigPath, yaml.safeDump(this.travisYml));
    }
  }
});
