var doorlock = require('./doorlock.js');
var MainLock = new doorlock();

var alarmBuzzer = require('./alarm.js');
var AlarmBuzzer = new alarmBuzzer();
var rfid = require('rc522-rfid');
var User = require('doorlock-models').User;

var newRegistration = false;

// Socket.io stuff for getting new studentCardId to admin ui on registration
var io = require('socket.io')(8080, { serveClient: false });

io.on('connection', function (socket) {
  console.log('client connected');
  socket.on('scanNewId', function(response) {
    console.log('scanNewId socket.io event happened');
    newRegistration = true;

    rfid(function(rfidSerialNumber) {
      console.log('new rfid card scanned');
      console.log(newRegistration);
      response(rfidSerialNumber);
      newRegistration = false;
      socket.disconnect();
    });
    setTimeout(function() {
      response(false);
      newRegistration = false;
      socket.disconnect();
    }, 10000);
  });
});

// Handle lock/unlock door
User.sync().then(function() {
  console.log('--------------------------------------------');
  console.log('User schema synced.');
  console.log(new Date());

  if( !newRegistration ) {

    rfid(function(rfidSerialNumber){
      console.log('doorlock rfid scanned happened');
      User.findOne({
        where: { studentCardId: rfidSerialNumber },
        attributes: ['firstName', 'lastName']
      }).then(function(user) {
        if( !user ) {
          console.log('--------------------------------------------');
          console.log('Unauthorized card: ' + rfidSerialNumber);
          console.log(new Date());
          AlarmBuzzer.errorSequence();
        }
        else {
          if( MainLock.IsLocked() ) {
            MainLock.Unlock();
            console.log('--------------------------------------------');
            console.log('Door opened for user ' + user.firstName + ' ' + user.lastName);
            console.log(new Date());
            AlarmBuzzer.openSequence();
          }
          else {
            MainLock.Lock();
            console.log('--------------------------------------------');
            console.log('Door closed for user ' + user.firstName + ' ' + user.lastName);
            console.log(new Date());
            AlarmBuzzer.closeSequence();
          }
        }
      });

    });

  }

});

process.on('SIGINT', function () {
  console.log('\nService stopped by user. Bye');
  // Release GPIO pins used by onoff
  MainLock.release();
});
