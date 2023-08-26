const mysql = require("mysql");

// Connection parameters
let connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

exports.view = (req, res) => {
  // Use the connection
  connection.query(
    "CREATE TABLE IF NOT EXISTS user ( id INT PRIMARY KEY AUTO_INCREMENT, first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, phone VARCHAR(20), status VARCHAR(20) DEFAULT 'active');",
    (err, result) => {
      if (err) throw err;
      console.log("User Table created");
    }
  );

  connection.query(
    "CREATE TABLE IF NOT EXISTS remarks (user_id INT, remark TEXT, FOREIGN KEY (user_id) REFERENCES user(id));",
    (err, result) => {
      if (err) throw err;
      console.log("Remarks Table created");
    }
  );

  connection.query(
    // "SELECT * FROM remarks r INNER JOIN user u ON r.user_id = u.id",
    "SELECT u.*, r.remark FROM user u LEFT JOIN remarks r ON u.id = r.user_id;",
    (err, rows) => {
      // When done with the connection, release it
      if (!err) {
        let removedUser = req.query.removed;
        res.render("home", { rows, removedUser });
      } else {
        console.log(err);
      }
      console.log("The data from user table: \n", rows);
    }
  );
};

// Find User by Search
exports.find = (req, res) => {
  let searchTerm = req.body.search;
  // User the connection
  connection.query(
    "SELECT * FROM user WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?",
    [
      "%" + searchTerm + "%",
      "%" + searchTerm + "%",
      searchTerm + "%",
      searchTerm + "%",
    ],
    (err, rows) => {
      if (!err) {
        res.render("home", { rows });
      } else {
        console.log(err);
      }
      console.log("The data from user table: \n", rows);
    }
  );
};

exports.form = (req, res) => {
  res.render("add-user");
};

exports.create = (req, res) => {
  const { first_name, last_name, email, phone, comments } = req.body;

  // Check if the email already exists
  connection.query(
    "SELECT COUNT(*) AS count FROM user WHERE email = ?",
    [email],
    (err, emailCheckResult) => {
      if (err) {
        console.log(err);
        return;
      }

      const emailCount = emailCheckResult[0].count;

      if (emailCount > 0) {
        res.render("add-user", { alert: "Email already exists." });
        return;
      }

      // If email doesn't exist, insert the new user
      connection.query(
        "INSERT INTO user SET first_name = ?, last_name = ?, email = ?, phone = ?",
        [first_name, last_name, email, phone],
        (err, insertResult) => {
          if (err) {
            console.log(err);
            return;
          }

          // Insert the comment as a remark into the remarks table
          connection.query(
            "INSERT INTO remarks (user_id, remark) VALUES (?, ?)",
            [insertResult.insertId, comments],
            (remarkErr, remarkInsertResult) => {
              if (remarkErr) {
                console.log(remarkErr);
                return;
              }

              res.render("add-user", { alert: "User added successfully." });
            }
          );
        }
      );
    }
  );
};

// Edit user
exports.edit = (req, res) => {
  // User the connection
  connection.query(
    "SELECT * FROM remarks r INNER JOIN user u ON r.user_id = u.id WHERE id = ?",
    // "SELECT u.*, r.remark FROM user u LEFT JOIN remarks r ON u.id = r.user_id;",
    [req.params.id],
    (err, rows) => {
      if (!err) {
        res.render("edit-user", { rows });
      } else {
        console.log(err);
      }
      console.log("The data from user table: \n", rows);
    }
  );
};

exports.update = (req, res) => {
  const { first_name, last_name, email, phone, comments } = req.body;
  const userId = req.params.id; // Capture the user ID

  // Check if the updated email already exists
  connection.query(
    "SELECT COUNT(*) AS count FROM user WHERE email = ? AND id != ?",
    [email, userId],
    (emailCheckErr, emailCheckResult) => {
      if (emailCheckErr) {
        console.log(emailCheckErr);
        return;
      }

      const emailCount = emailCheckResult[0].count;

      if (emailCount > 0) {
        // If email already exists, render an alert message
        connection.query(
          "SELECT * FROM user WHERE id = ?",
          [userId],
          (selectErr, userRows) => {
            if (selectErr) {
              console.log(selectErr);
              return;
            }

            res.render("edit-user", {
              rows: userRows,
              alert: "Email already exists.",
            });
          }
        );
        return;
      }

      // Update user data
      connection.query(
        "UPDATE user SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?",
        [first_name, last_name, email, phone, userId],
        (err, updateResult) => {
          if (err) {
            console.log(err);
            return;
          }

          // Update the remark in the remarks table
          connection.query(
            "UPDATE remarks SET remark = ? WHERE user_id = ?",
            [comments, userId],
            (remarkErr, remarkUpdateResult) => {
              if (remarkErr) {
                console.log(remarkErr);
                return;
              }

              // Retrieve the updated user data
              connection.query(
                "SELECT * FROM remarks r INNER JOIN user u ON r.user_id = u.id WHERE id = ?",
                [userId],
                (selectErr, userRows) => {
                  if (selectErr) {
                    console.log(selectErr);
                    return;
                  }

                  res.render("edit-user", {
                    rows: userRows,
                    alert: `${first_name} has been updated.`,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
};

// Delete User
exports.delete = (req, res) => {
  const userId = req.params.id; // Capture the user ID

  // Use the connection
  connection.query(
    "DELETE FROM remarks WHERE user_id = ?",
    [userId],
    (remarksErr, remarksResult) => {
      if (remarksErr) {
        console.log(remarksErr);
        return;
      }

      connection.query(
        "DELETE FROM user WHERE id = ?",
        [userId],
        (userErr, userResult) => {
          if (userErr) {
            console.log(userErr);
            return;
          }

          let removedUser = encodeURIComponent(
            "User and related remarks successfully removed."
          );
          res.redirect("/?removed=" + removedUser);
        }
      );
    }
  );
};

// View Users
exports.viewall = (req, res) => {
  connection.query(
    "SELECT * FROM remarks r INNER JOIN user u ON r.user_id = u.id WHERE id = ?",
    // "SELECT u.*, r.remark FROM user u LEFT JOIN remarks r ON u.id = r.user_id;",
    [req.params.id],
    (err, rows) => {
      if (!err) {
        res.render("view-user", { rows });
      } else {
        console.log(err);
      }
      console.log("The data from user table: \n", rows);
    }
  );
};
