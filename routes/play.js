var express = require('express');

module.exports = function(port) {
	var router = express.Router();
/* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('play', {
			websocketURL: `ws://localhost:${port}`
		});
  });
	
	return router;
};
