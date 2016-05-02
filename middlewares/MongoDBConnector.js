var MongoClient = require('mongodb').MongoClient,
    MongoDBFixStream = require('./MongoDBFixStream');
var MongoDBConnector = function () {
  return function (req, res, next) {
    req.db = MongoDBConnector;
    next();
  }
}

/**
 * Connect to the mongodb if not yet connected.
 * @param dbstring defines the mongoclient string to connect to mongodb
 * @param collections is an object of 
 * @param cb is a callback that needs to be called without parameters when the connection was succesful, or with 1 parameter when an error was encountered
 */
MongoDBConnector.connect = function (dbstring, collections, cb) {
  this.collections = collections;
  //check if we already have a db connection
  if (typeof this._db !== 'undefined') {
    cb();
  } else {
    var self = this;
    MongoClient.connect(dbstring, function(err, db) {
      if (err) {
        cb('Error connecting to the db: ' + err);
      }
      self._db = db;
      cb();
    });
  }
};

MongoDBConnector.getConnectionsStream = function (departureTime, endTime, cb) {
  var connectionsStream = this._db.collection(this.collections['connections'])
      .find({'departureTime': {'$gte': departureTime,'$lt': endTime}})
      .sort({'departureTime': 1})
      .stream();
  cb(connectionsStream.pipe(new MongoDBFixStream()), function () {
    connectionsStream.close();
  });
}

module.exports = MongoDBConnector;
