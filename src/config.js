const config = {
  all: {
    mongo: {
      uri: process.env.MONGODB_URI || "mongodb://localhost/etherdex",
      options: {
        db: {
          safe: true
        },
        debug: true
      }
    }
  }
};

module.exports = Object.assign(config.all, config[config.all.env]);
export default module.exports;
