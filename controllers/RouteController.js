var csa = require('csa');

module.exports = function (request, response, next) {
  if (!request.query.departureTime) {
    response.redirect(400, 'Please provide us with a parseable ISO8601 departureTime as a GET parameter');
  } else {
    
    var planner = new csa.BasicCSA({departureStop: request.query.departureStop, arrivalStop: request.query.arrivalStop,departureTime: new Date(request.query.departureTime)});
    var connectionsStream = request.db.getConnectionsStream(new Date(request.query.departureTime));
    connectionsStream.on('error', function (error) {
      next('MongoDB error ' + error);
    });
    var resultStream = connectionsStream.pipe(planner);
    var result = false;
    var countMST = 0;
    var countTotal = 0;
    connectionsStream.on('data', function (data) {
      countTotal++;
    });
    resultStream.on('data', function (connection) {
      countMST++;
    });
    resultStream.on('result', function (path) {
      result = true;
      console.log('Path found after relaxing',countTotal,'connections');
      connectionsStream.unpipe(planner);
      planner.end();
      responseObject : {
        "@id" : "todo",
        "@context" : {
        },
        "@graph" : path,
        connectionsMST: countMST,
        connectionsProcessed: countTotal
      }
      response.send(path);
      next();
    });

    resultStream.on('end', function () {
      if (!result) {
        next('No route found');
      }
    });
    
  }
};
