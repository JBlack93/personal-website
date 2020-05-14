const expressEdge = require("express-edge");
const express = require("express");
const edge = require("edge.js");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const expressSession = require('express-session');
const connectMongo = require('connect-mongo');
const connectFlash = require("connect-flash");

const app = new express();

const storePost = require('./middleware/storePost');
const auth = require("./middleware/auth");
const redirectIfAuthenticated = require('./middleware/redirectIfAuthenticated');

const logoutController = require("./controllers/logout");
const createPostController = require('./controllers/createPost');
const homePageController = require('./controllers/homePage');
const aboutPageController = require('./controllers/about');
const workPageController = require('./controllers/work');
const experienceController = require('./controllers/experience');
const recentTalksController = require('./controllers/recent-talks');
const blogController = require('./controllers/blog');
const storePostController = require('./controllers/storePost');
const getPostController = require('./controllers/getPost');
const createUserController = require("./controllers/createUser");
const storeUserController = require('./controllers/storeUser');
const loginController = require("./controllers/login");
const loginUserController = require('./controllers/loginUser');


mongoose.connect('mongodb://127.0.0.1:27017/node-blog', { useNewUrlParser: true,  useUnifiedTopology: true  })
    .then(() => 'You are now connected to Mongo!')
    .catch(err => console.error('Something went wrong', err))

const mongoStore = connectMongo(expressSession);
 
app.use(expressSession({
    resave: 'false',
    saveUninitialized: 'false',
    secret: 'UJBbi;l8sfs9OibkljN@)}-(FHJVk7P&*89;',
    store: new mongoStore({
        mongooseConnection: mongoose.connection
    })
}));

app.use(fileUpload());
app.use(express.static("public"));
app.use(expressEdge);
app.set('views', __dirname + '/views');

app.use('*', (req, res, next) => {
    edge.global('auth', req.session.userId)
    next()
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(connectFlash());

app.get("/", homePageController);
app.get("/about", aboutPageController);
app.get("/my-work", workPageController);
app.get("/experience", experienceController);
app.get("/recent-talks", recentTalksController);
app.get("/blog", blogController);
app.get("/post/:id", getPostController);
app.get("/posts/new", auth, createPostController);
app.post("/posts/store", auth, storePost, storePostController);
app.get("/auth/login", redirectIfAuthenticated, loginController);
app.post("/users/login", redirectIfAuthenticated, loginUserController);
app.get("/auth/register", redirectIfAuthenticated, createUserController);
app.post("/users/register", redirectIfAuthenticated, storeUserController);
app.get("/auth/logout", redirectIfAuthenticated, logoutController);


app.listen(4000, () => {
  console.log("App listening on port 4000");
});
