var csa = require('csa'),
    moment = require('moment-timezone');

module.exports = function (request, response, next) {
  if (!request.query.departureTime) {
    response.status(400).send('Please provide us with a parseable ISO8601 departureTime as a GET parameter');
  } else {
    var departureTime = moment.tz(request.query.departureTime,request.locals.config.defaultTimezone || 'Europe/Brussels');
    departureTime = departureTime.toDate();
    var planner = new csa.BasicCSA({departureStop: request.query.departureStop, arrivalStop: request.query.arrivalStop,departureTime: departureTime});
    var connectionsStream = request.db.getConnectionsStream(departureTime);
    connectionsStream.on('error', function (error) {
      next('MongoDB error ' + error);
    });
    var resultStream = connectionsStream.pipe(planner);
    var result = false;
    var countMST = 0;
    var countTotal = 0;
    var maxJourneyTime = request.locals.config.maxJourneyTime || 60*60*1000*4;
    connectionsStream.on('data', function (data) {
      countTotal++;
      if ((data.departureTime - departureTime) > maxJourneyTime) {
        connectionsStream.unpipe(planner);
        connectionsStream.end();
        planner.end();
      }
    });
    resultStream.on('data', function (connection) {
      countMST++;
    });
    resultStream.on('result', function (path) {
      result = true;
      console.log('Path found after relaxing',countTotal,'connections');
      connectionsStream.unpipe(planner);
      connectionsStream.end();
      planner.end();
      var responseObject = {
        "@id" : "todo",
        "@context" : {
        },
        "@graph" : path,
        connectionsMST: countMST,
        connectionsProcessed: countTotal
      };
      response.send(responseObject);
      next();
    });

    resultStream.on('end', function () {
      if (!result) {
        response.status(404).send({
          "@id" : "todo",
          "@context" : {
          },
          "error" : "no path found within the maxJourneyTime",
          connectionsMST: countMST,
          connectionsProcessed: countTotal
        });
        next();
      }
    });
  }
};
