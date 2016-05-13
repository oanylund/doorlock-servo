var path = require('path');
var express = require('express');
var app = express();

var doorlock = require('./doorlock.js');
var MainLock = new doorlock();

var alarmBuzzer = require('./alarm.js');
var AlarmBuzzer = new alarmBuzzer();
var rfid = require("rc522-rfid");

rfid(function(rfidSerialNumber){
    console.log(rfidSerialNumber);
    if( rfidSerialNumber === 'e8b513b9' ) {
      console.log('User, Ony008!');
      if( MainLock.IsLocked() ) {
        MainLock.Unlock();
        console.log('Open door!');
        AlarmBuzzer.openSequence();
      }
      else {
        MainLock.Lock();
        console.log('Close door!');
        AlarmBuzzer.closeSequence();
      }

    }
});

// app.use(express.static(path.join(__dirname, 'public')));
//
// app.get('/', function(req,res) {
//     res.sendFile(path.join(__dirname, 'index.html'));
// });
//
// app.get('/open', function(req,res) {
//   if( MainLock.IsLocked() ) {
//     MainLock.Unlock();
//     AlarmBuzzer.openSequence();
//   }
//   res.redirect('/');
// });
//
// app.get('/close', function(req,res) {
//   if( !MainLock.IsLocked() ) {
//     MainLock.Lock();
//     AlarmBuzzer.closeSequence();
//   }
//   res.redirect('/');
// });
//
// app.listen(3000, function() {
// 	console.log('Server started on port 3000');
// });

process.on('SIGINT', function () {
  console.log('\nService stopped by user. Bye');

  // Release GPIO pins used by onoff
  MainLock.release();

  if( rfid.isOpen() ) {
    // Close serialport if open before closing
    rfid.close((err) => {
      if(err) console.log(err);
      process.exit();
    });
  }
});
