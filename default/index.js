var yaml = require('js-yaml');
var has = require('lodash/has');
var find = require('lodash/find');
var encrypt = require('travis-encrypt');
var isArray = require('lodash/isArray');
var isObject = require('lodash/isObject');
var includes = require('lodash.includes');
var Generator = require('yeoman-generator');
var parseGithubUrl = require('parse-github-url');

module.exports = Generator.extend({
  constructor: function constructor(args, opts) {
    Generator.call(this, args, opts);
    this.deployStep = 'npm run deploy:ci';
    this.travisConfigPath = this.destinationPath('.travis.yml');
    this.pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
  },

  initializing: function initializing() {
    /* jshint camelcase: false */
    var travisConfigExists = this.fs.exists(this.travisConfigPath);
    if (!travisConfigExists) {
      this.abort = true;
      this.log.error(
        'Travis config file not found!. Please run "donejs add travis" first.'
      );
      return;
    }

    this.travisYml = yaml.safeLoad(this.fs.read(this.travisConfigPath));
    if (includes(this.travisYml.before_deploy, this.deployStep)) {
      this.abort = true;
      this.log(
        'Firebase deploy step already found in .travis.yml, aborting command.'
      );
      return;
    }
    if (this._hasGlobalEncryptedVariable()) {
      this.abort = true;
      this.log(
        'Encrypted variable already found in .travis.yml, aborting command.'
      );
    }
  },

  prompting: function prompting() {
    if (!this.abort) {
      var done = this.async();
      var repo = this._getParsedGitHubRepo();

      return this.prompt([
        {
          type: 'input',
          name: 'githubUsername',
          message: "What's your GitHub username?",
          default: (repo && repo.owner) ? repo.owner : null
        },
        {
          type: 'input',
          name: 'githubAppName',
          message: "What's your GitHub application name?",
          default: (repo && repo.name) ? repo.name : null
        },
        {
          type: 'input',
          name: 'firebaseCiToken',
          message: "What's your Firebase CI Token?"
        }
      ])
        .then(
          function onPromptAnswers(answers) {
            this.props = answers;
            done();
          }.bind(this)
        )
        .catch(done);
    }
  },

  writing: function writing() {
    if (!this.abort) {
      var done = this.async();

      this._encryptTravisToken()
        .then(this._addGlobalEncryptedVariable.bind(this))
        .then(this._addBeforeDeploySteps.bind(this))
        .then(
          function writeTravisChanges() {
            this.fs.write(this.travisConfigPath, yaml.safeDump(this.travisYml));
            done();
          }.bind(this)
        )
        .catch(done);
    }
  },

  // private helpers
  _hasGlobalEncryptedVariable: function hasGlobalEncryptedVariable() {
    var yml = this.travisYml;

    if (has(yml, 'env.global')) {
      return !!find(yml.env.global, function(g) {
        return has(g, 'secure');
      });
    } else {
      return false;
    }
  },

  _getParsedGitHubRepo: function getParsedGitHubRepo() {
    var repo = this.pkg.repository;
    return parseGithubUrl(isObject(repo) ? repo.url : repo);
  },

  _encryptTravisToken: function encryptTravisToken() {
    var props = this.props;

    this.log('Encrypting Travis CI Token...');
    return new Promise(function(resolve, reject) {
      encrypt(
        {
          repo: `${props.githubUsername}/${props.githubAppName}`,
          data: `FIREBASE_TOKEN="${props.travisCiToken}"`
        },
        function(err, blob) {
          if (err) {
            reject(err);
          } else {
            resolve(blob);
          }
        }
      );
    });
  },

  _addGlobalEncryptedVariable: function addGlobalEncryptedVariable(encrypted) {
    var yml = this.travisYml;

    if (!isObject(yml.env)) {
      yml.env = {};
    }

    if (!isArray(yml.env.global)) {
      yml.env.global = [];
    }

    yml.env.global.push({ secure: encrypted });
  },

  _addBeforeDeploySteps: function addBeforeDeploySteps() {
    /* jshint camelcase: false */
    this.log('Adding firebase deploy step to ' + this.travisConfigPath);

    if (typeof this.travisYml.before_deploy === 'undefined') {
      this.travisYml.before_deploy = this.deployStep;
    } else if (typeof this.travisYml.before_deploy === 'string') {
      this.travisYml.before_deploy = [
        this.travisYml.before_deploy,
        this.deployStep
      ];
    } else if (Array.isArray(this.travisYml.before_deploy)) {
      this.travisYml.before_deploy.push(this.deployStep);
    }
  }
});
