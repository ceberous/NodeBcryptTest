var bodyParser = require('body-parser');
var express = require('express');
var sessions = require('client-sessions');
var bcrypt = require('bcryptjs');
var csrf = require('csurf');

var mongoose = require('mongoose')
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

// Database Connection
var uristring =
process.env.MONGOLAB_URI ||
process.env.MONGOHQ_URL ||
'mongodb://heroku_app33567812:98otms4gvajli3iu5on7fk8eir@ds053688.mongolab.com:53688/heroku_app33567812';

// The http server will listen to an appropriate port, or default to
// port 5000.
var theport = process.env.PORT || 5000;

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + uristring);
  }
});



var User = mongoose.model('User' , new Schema({
	id: ObjectId,
	firstName: String,
	lastName: String,
	email: {type: String , unique: true},
	password: String,
}));


var app = express();
app.set('vew engine' , 'jade');
app.locals.pretty = true;



// Middle Ware
app.use(bodyParser.urlencoded({ extended: true }));

app.use(sessions({
	cookieName: 'session',
	secret: 'asdfadsfdskaslkjskjlasdfj',
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
	httpOnly: true , // Prevents Javascript
	secure: true , // Only use cooies over https
	ephemeral: true , // delete this cookie when browser is closed
}));

app.use(csrf());

app.use(function(req,res,next) {
	if (req.session && req.session.user) {
		User.findOne({email: req.session.user.email} , function(err,user){
			if (user) {
				req.user = user;
				delete req.user.password;
				req.session.user = req.user;
				res.locals.user = req.user;
			}
			next();
		});
	} else {
		next();
	}
});

function requireLogin(req,res,next) {
	if (!req.user) {
		res.redirect('/login');
	} else {
		next();
	}
}




// Routes
app.get('/' , function(req , res){
	res.render('index.jade');
});

app.get('/register' , function(req ,res){
	res.render('register.jade' , { csrfToken: req.csrfToken() } );
});

app.post('/register' , function(req ,res){

	var hash = bcrypt.hashSync(req.body.password , bcrypt.genSaltSync(10));

	var user = new User({
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email,
		password: hash,
	});

	user.save(function(err){

		if (err){
			var err = "Something Bad Happened";
			if (err.code === 11000) {
				error = "That Email is Already Registered";
			}
			res.render('register.jade' , {error: error});
		} else {
			res.redirect('/dashboard');
		}

	});
});

app.get('/login' , function(req , res){
	res.render('login.jade' , { csrfToken: req.csrfToken() } );
});

app.post('/login' , function(req , res) {
	User.findOne({email: req.body.email} ,function (err,user){
		if (!user){
			res.render('login.jade' , {error: "Invalid Email or Password"});
		} else {
			if (bcrypt.compareSync( req.body.password , user.password )) {
				req.session.user = user;
				res.redirect('/dashboard');
			} else {
				res.render('login.jade' , {error: "Invalid Email or Password"});
			}
		}
	});
});

app.get('/dashboard' , requireLogin , function(req , res){
	res.render('dashboard.jade');
});

app.get('/logout' , function(req , res){
	req.session.reset();
	res.redirect('/');
});



// Server Start
app.listen(3000);
console.log("lisening on port: 3000");