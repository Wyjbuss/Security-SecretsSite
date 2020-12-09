require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption")

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
	extended: true
}));

const port = 3000 || process.env.PORT;

// DATABASE setup ************************************************************
mongoose.set('useUnifiedTopology', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.connect("mongodb://localhost:27017/userDB", {
	useNewUrlParser: true
});
// encryption requires us to creat a full fledged mongoose schema
// and not just a javascrip object
const userSchema = new mongoose.Schema({
	email: String,
	password: String
});

//ENCRYPTING
const secret = process.env.SECRET;
userSchema.plugin(encrypt, {
	secret: secret,
	encryptedFields: ["password"] // to encrypt multiple feilds add it to this
	// like ['password',"username","somethingElse"]
});

// add this last after the encription
// or it wont encrypt
// add the plugin to the userSchema before creating the mongoose model
// like I have done
// because we are creating the User model from the userSchema
// the User model then will be encrypted.
const User = mongoose.model("User", userSchema);
// // DATABASE setup *******************************************************


app.get("/", function(req, res) {
	res.render("home");
});


app.route("/login")
	.get(function(req, res) {
		res.render("login");
	})
	.post(function(req, res) {
		const usersEmail = req.body.username;
		const usersPassword = req.body.password;
		User.findOne({
			email: usersEmail
		}, function(err, foundUser) {
			if (err) {
				console.log(err);
			} else {
				if (foundUser) {
					if (foundUser.password === usersPassword) {
						res.render("secrets");
					} else {
						res.send("Password incorrect")
					}

				}
			}
		});
	});

app.route("/register")
	.get(function(req, res) {
		res.render("register");
	})
	.post(function(req, res) {
		User.findOne({ // if user already exists ...
			email: req.body.username
		}, function(err, foundUser) { // check to see if user already exists
			if (err) {
				console.log(err);
			} else
			if (foundUser) { // if user was found then user must log in with longin pg
				res.send("User already exists. Try logging in.");
			} else
			if (!foundUser) { // if user wasnt found then make one
				const newUser = new User({
					email: req.body.username,
					password: req.body.password
				}); //end database entry
				//save data
				newUser.save(function(err) {
					if (err) {
						console.log(err);
					} else {
						res.render("secrets");
					}
				});
			}


		});

	});

app.route("/submit")
	.get(function(req, res) {
		res.render("submit");
	})
	.post(function(req, res) {
		const usersSecret = req.body.secret;
		console.log(usersSecret);
		res.send("Secret submitted. Thanks!")
	});





app.listen(port, function() {
	console.log(`Server started on port ${port}`);
});
