require('dotenv').config(); // allows us to use .env (enviornment verables)
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

//const encrypt = require("mongoose-encryption") // uninstalled
//const md5 = require("md5"); // hashing encryption md5 is a kind of hashing

//const bcrypt = require("bcrypt"); // hashing with salt meanding adding a random
// set of numbers refered to as salt
// and salt rounds is taking the outcome and adding salt to it multiple times.
//const saltRounds = 10;

const app = express();
const port = 3000 || process.env.PORT;
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
	extended: true
}));

//location of this must be below the other use statments
// and above the mongoose connect
app.use(session({
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// DATABASE setup ************************************************************
mongoose.set('useUnifiedTopology', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.connect("mongodb://localhost:27017/userDB", {
	useNewUrlParser: true
});
// encryption requires us to creat a full fledged mongoose schema
// and not just a javascrip object
const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	googleId: String,
	facebookId: String,
	secret: String
});

//ENCRYPTING with mongoose-encryption
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {
// 	secret: secret,
// 	encryptedFields: ["password"] // to encrypt multiple feilds add it to this
// 	// like ['password',"username","somethingElse"]
// });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// add this last after the encription
// or it wont encrypt
// add the plugin to the userSchema before creating the mongoose model
// like I have done
// because we are creating the User model from the userSchema
// the User model then will be encrypted.
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

//uses passport docs so that it serializes with any stratagey
passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});
//uses mongoose-local docs
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
// // DATABASE setup *******************************************************

passport.use(new GoogleStrategy({
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: "http://localhost:3000/auth/google/secrets"

	},
	function(accessToken, refreshToken, profile, cb) {
		//console.log(profile);

		User.findOrCreate({
			googleId: profile.id
		}, function(err, user) {
			return cb(err, user);
		});
	}
));

passport.use(new FacebookStrategy({

		clientID: process.env.FACEBOOK_APP_ID,
		clientSecret: process.env.FACEBOOK_APP_SECRET,
		callbackURL: "http://localhost:3000/auth/facebook/secrets"
	},
	function(accessToken, refreshToken, profile, cb) {
		//console.log(profile);
		User.findOrCreate({
			facebookId: profile.id
		}, function(err, user) {
			return cb(err, user);
		});

	}

));


app.get("/", function(req, res) {
	res.render("home");
});

app.get('/auth/google',
	passport.authenticate('google', {
		scope: ['profile']
	}));
app.get('/auth/google/secrets',
	passport.authenticate('google', {
		failureRedirect: '/login'
	}),
	function(req, res) {
		// Successful authentication, redirect secrets.
		res.redirect('/secrets');
	});

app.get("/auth/facebook",
	passport.authenticate("facebook"));

app.get('/auth/facebook/secrets',
	passport.authenticate('facebook', {
		failureRedirect: '/login'
	}),
	function(req, res) {
		// Successful authentication, redirect secrets.
		res.redirect('/secrets');
	});

// app.post('/deleteUserData', function(req, res) {
// 	const signed_request = req.body.request;
//
// 	//verify data initially, something like:
// 	if ((typeof signed_request !== 'string') || (signed_request.length < 3) || (!signed_request.includes('.'))) {
// 		return res.status(400).end();
// 	}
//
// 	//after that, use @Maysara answer to parse data:
// 	const data = parseRequest(signed_request, process.env.FACEBOOK_APP_SECRET);
// 	if (!data) {
// 		return res.status(400).end();
// 	}
// 	//use data
// });

app.route("/login")
	.get(function(req, res) {
		res.render("login");
	})
	.post(function(req, res) {
		const user = new User({
			username: req.body.username,
			password: req.body.password
		});

		req.login(user, function(err) {
			if (err) {
				console.log(err);

			} else {
				passport.authenticate("local")(req, res, function() {
					res.redirect("/secrets")
				});
			}
		});
	});
// .post(function(req, res) {
// 	const usersEmail = req.body.username;
// 	const usersPassword = req.body.password;
// 	User.findOne({
// 		email: usersEmail
// 	}, function(err, foundUser) {
// 		if (err) {
// 			console.log(err);
// 		} else {
// 			if (foundUser) {
// 				// Load hash from your password DB.
// 				bcrypt.compare(usersPassword, foundUser.password, function(err, result) {
// 					// result == true
// 					if (result === true) {
// 						res.render("secrets");
// 					} else {
// 						res.send("Password is incorrect")
// 					}
//
// 				});
//
// 			}
// 		}
// 	});
//});

app.get("/secrets", function(req, res) {
	User.find({
		"secret": {
			$ne: null
		}
	}, function(err, foundUsers) {
		if (err) {
			console.log(err);
		} else {
			if (foundUsers) {
				res.render("secrets", {
					usersWithSecrets: foundUsers
				});
			}
		}
	});
});

app.route("/register")
	.get(function(req, res) {
		res.render("register");
	})
	.post(function(req, res) {
		User.register({
			username: req.body.username
		}, req.body.password, function(err, user) {
			if (err) {
				console.log(err);
				res.redirect("/register");
			} else {
				passport.authenticate("local")(req, res, function() { // user was authenticatedd
					res.redirect("/secrets"); // redirecting instead of render so
					// the user will go to there secrets pgif they are still logged in
				});
			}
		});
	});
// .post(function(req, res) {
//
// 	User.findOne({ // if user already exists ...
// 		email: req.body.username
// 	}, function(err, foundUser) { // check to see if user already exists
// 		if (err) {
// 			console.log(err);
// 		} else
// 		if (foundUser) { // if user was found then user must log in with longin pg
// 			res.send("User already exists. Try logging in.");
// 		} else
// 		if (!foundUser) { // if user wasnt found then make one
// 			bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
// 				// Store hash in your password DB.
// 				const newUser = new User({
// 					email: req.body.username,
// 					password: hash
// 				}); //end database entry
// 				//save data
// 				newUser.save(function(err) {
// 					if (err) {
// 						console.log(err);
// 					} else {
// 						res.render("secrets");
// 					}
// 				});
// 			});
//
// 		}
//
//
// 	});
//
// });

app.route("/submit")
	.get(function(req, res) {
		if (req.isAuthenticated()) {
			res.render("submit");
		} else {
			res.redirect("/login");
		}

	})
	.post(function(req, res) {
		const usersSecret = req.body.secret;
		//console.log(usersSecret);

		User.findById(req.user.id, function(err, foundUser) {
			if (err) {
				console.log(err);
			} else {
				if (foundUser) {
					foundUser.secret = usersSecret;
					foundUser.save(function() {
						res.redirect("/secrets")
					});
				}
			}
		});
	});
app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});



app.listen(port, function() {
	console.log(`Server started on port ${port}`);
});
