const express = require("express");
const exphbs = require("express-handlebars");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 2059;

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(express.static("public"));

const handlebars = exphbs.create({ extname: ".hbs" });
app.engine(".hbs", handlebars.engine);
app.set("view engine", ".hbs");

const routes = require("./server/routes/user");
app.use("/", routes);

app.listen(port, () => console.log(`Listening on port ${port}`));
