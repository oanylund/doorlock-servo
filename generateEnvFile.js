'use strict';
var fs = require('fs');
fs.createReadStream('.env-template')
  .pipe(fs.createWriteStream('.env'));
