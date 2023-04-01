const autoconf = require("@backkit/autoconf");

autoconf('authorize')
.generator(self => ([
  {
    putFileOnce: self.serviceConfigMainYML,
    contentYml: self.config
  },
  {
    putFileOnce: self.serviceCodeMainJS,
    content: `module.exports = require('${self.npmModuleName}')`
  }
]))
.default(self => ({
  storageService: "mongoose"
}))
.prompt(self => ([
  {
    if: {
      fileNotFound: self.serviceConfigMainYML
    },
    type: 'input',
    name: 'storageService',
    message: "storage service",
    default: self.defaultConfig.storageService,
    validate: function(value) {
      return ['mongoose'].includes(value);
    }
  }
]))
.run()

