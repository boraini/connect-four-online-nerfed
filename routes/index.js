var express = require('express');

module.exports = function(stats) {
	var router = express.Router();
/* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('index', {
			title: 'Delftse Laga Competition',
			...stats
		});
  });
	
	return router;
};
