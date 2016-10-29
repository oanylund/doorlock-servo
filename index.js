require('dotenv').config({path: __dirname + '/.env'}); // Fetch local db environment vars from .env
var spawn = require('child_process').spawn;
var path = require('path');

var Doorlock = require('./doorlock.js');
var mainLock = new Doorlock();

var AlarmBuzzer = require('./alarm.js');
var alarmBuzzer = new AlarmBuzzer();

var User = require('doorlock-models').User;

var RfidReader = require('./rfid.js');
var rfidReader = new RfidReader();
var rfid = require('rc522-rfid');

// Register cardscan event
rfid(function(rfidSerNumber) {
  rfidReader.cardScan(rfidSerNumber);
});

// Logger util function
var logger = function(msg) {
  console.log('--------------------------------------------');
  console.log(msg);
  console.log(new Date());
}


// Log startup
logger('App started');

// Sound for user to know app has started
alarmBuzzer.verificationSequence();

// Socket.io stuff for getting new studentCardId to admin ui on registration
var io = require('socket.io')(8080, { serveClient: false });
var socketioJwt = require('socketio-jwt');
var secret = require('../config.js').secret;

var getId = io.of('/get-id');
var auth = io.of('/auth');

getId.on('connection', function (socket) {
  logger('New connection on socket 8080, namespace /get-id');

  socket.on('scanNewId', function(response) {

    logger('Request to scan new card recieved');
    rfidReader.setNewRegistration(true);

    var waitForScantimeout = setTimeout(function() {
      logger('Requester failed to scan card within timelimit');
      alarmBuzzer.errorSequence();
      response(false);
      rfidReader.setNewRegistration(false);
      socket.disconnect();
    }, 10000);

    rfidReader.once('newCardScanned', function(rfidSerialNumber) {
      logger('New card scanned, id ' + rfidSerialNumber + ' returned');
      alarmBuzzer.verificationSequence();
      response(rfidSerialNumber);
      rfidReader.setNewRegistration(false);
      clearTimeout(waitForScantimeout);
      socket.disconnect();
    });

  });
});

auth.on('connection', socketioJwt.authorize({
    secret: secret,
    timeout: 15000
}))
.on('authenticated', function(socket) {
  // Authenticated socket

  // Emit lockstatus on socket connection
  socket.emit('lockStatus', {
    isLocked: mainLock.IsLocked()
  });

  // Create a child process
  var logTail = spawn('tail',
      ['-f', '-n', 12, path.resolve(__dirname, '../logs/doorlock-servo-out.log')]);

  logTail.stdout.on('data', function (data) {
    socket.emit('logTail', data.toString());
  });

  var lockStatusCb = function(newStatus) {
    socket.emit('lockStatus', newStatus);
  }
  mainLock.on('lockStatusChanged', lockStatusCb);

  socket.on('forceOpen', function(fn) {
    if( mainLock.IsLocked() ) {
      logger('Lock opened from admin UI');
      mainLock.Unlock(function() {
        if(fn && typeof fn === 'function') {
          fn(true);
        }
      });
      alarmBuzzer.openSequence();
    }
    else {
      if(fn && typeof fn === 'function') {
        fn(false);
      }
    }
  });

  socket.on('forceClose', function(fn) {
    if( !mainLock.IsLocked() ) {
      logger('Lock closed from admin UI');
      mainLock.Lock(function() {
        if(fn && typeof fn === 'function') {
          fn(true);
        }
      });
      alarmBuzzer.closeSequence();
    }
    else {
      if(fn && typeof fn === 'function') {
        fn(false);
      }
    }
  });

  socket.on('disconnect', function() {
    logTail.kill();
    mainLock.removeListener('lockStatusChanged', lockStatusCb);
  });

});

// Handle lock/unlock door
rfidReader.on('cardScanned', function(rfidSerialNumber) {

  User.findOne({
    where: { studentCardId: rfidSerialNumber },
    attributes: ['firstName', 'lastName']
  }).then(function(user) {
    if( !user ) {
      logger('Unauthorized card: ' + rfidSerialNumber);
      alarmBuzzer.errorSequence();
    }
    else {
      if( mainLock.IsLocked() ) {
        mainLock.Unlock();
        logger('Lock opened for user ' + user.firstName + ' ' + user.lastName);
        alarmBuzzer.openSequence();
      }
      else {
        mainLock.Lock();
        logger('Lock closed for user ' + user.firstName + ' ' + user.lastName);
        alarmBuzzer.closeSequence();
      }
    }
  });

});


// Force process exit to only listen for exit event.
var cleanExit = function() { process.exit() };
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', function() { // catch kill
  logger('Terminated by parent process');
  cleanExit();
});

process.on('exit', function() {
  logger('App closing down');
  // All cleanup necessary on exit goes here
});
