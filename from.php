<?php
session_start();

// Database connection
$servername = "localhost";
$username = "deepak"; // Your MySQL username
$password = "1234"; // Your MySQL password
$dbname = "deep"; // Database name

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Registration Process
if (isset($_POST['register'])) {
    // Sanitize user input
    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $password = mysqli_real_escape_string($conn, $_POST['password']);
    $password_confirm = mysqli_real_escape_string($conn, $_POST['password_confirm']);

    // Check if passwords match
    if ($password !== $password_confirm) {
        echo "<div class='alert error'>Passwords do not match!</div>";
    } else {
        // Check password strength (minimum 8 characters, at least 1 number, 1 letter, and 1 special character)
        if (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password) || !preg_match('/[^\w]/', $password)) {
            echo "<div class='alert error'>Password must be at least 8 characters long, contain at least one letter, one number, and one special character!</div>";
        } else {
            // Hash the password
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);

            // Check if username already exists
            $sql_check = "SELECT * FROM users WHERE username='$username'";
            $result_check = $conn->query($sql_check);
            if ($result_check->num_rows > 0) {
                echo "<div class='alert error'>Username already exists. Please choose a different one.</div>";
            } else {
                // Insert into database
                $sql = "INSERT INTO users (username, password) VALUES ('$username', '$hashed_password')";
                if ($conn->query($sql) === TRUE) {
                    echo "<div class='alert success'>Registration successful! You can now <a href='?action=login'>login</a>.</div>";
                } else {
                    echo "<div class='alert error'>Error: " . $conn->error . "</div>";
                }
            }
        }
    }
}

// Login Process
if (isset($_POST['login'])) {
    // Sanitize user input
    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $password = mysqli_real_escape_string($conn, $_POST['password']);

    // Check if username or password is empty
    if (empty($username) || empty($password)) {
        echo "<div class='alert error'>Username and password cannot be empty!</div>";
    } else {
        // Check if user exists
        $sql = "SELECT id, username, password FROM users WHERE username='$username'";
        $result = $conn->query($sql);

        // Check if the query was successful
        if ($result === false) {
            echo "<div class='alert error'>Query failed: " . $conn->error . "</div>";
        } else {
            // Check if a user was found
            if ($result->num_rows > 0) {
                $row = $result->fetch_assoc();

                // Verify password
                if (password_verify($password, $row['password'])) {
                    $_SESSION['user_id'] = $row['id'];
                    $_SESSION['username'] = $row['username'];
                    header("Location: ?action=dashboard");
                    exit();
                } else {
                    echo "<div class='alert error'>Incorrect password!</div>";
                }
            } else {
                echo "<div class='alert error'>User not found!</div>";
            }
        }
    }
}

// Logout Process
if (isset($_GET['action']) && $_GET['action'] == 'logout') {
    session_destroy();
    header("Location: ?action=login");
    exit();
}

// Display Pages
if (isset($_GET['action'])) {
    switch ($_GET['action']) {
        case 'login':
            echo '
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Login</title>
                <link rel="stylesheet" href="styles.css">
            </head>
            <body>
                <div class="container">
                    <h2>Login</h2>
                    <form method="POST">
                        <label>Username:</label>
                        <input type="text" name="username" required><br>

                        <label>Password:</label>
                        <input type="password" name="password" required><br>

                        <button type="submit" name="login">Login</button>
                    </form>
                    <a href="?action=register">Don\'t have an account? Register here</a>
                </div>
            </body>
            </html>';
            break;

        case 'register':
            echo '
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Register</title>
                <link rel="stylesheet" href="styles.css">
            </head>
            <body>
                <div class="container">
                    <h2>Register</h2>
                    <form method="POST">
                        <label>Username:</label>
                        <input type="text" name="username" required><br>

                        <label>Password:</label>
                        <input type="password" name="password" required><br>

                        <label>Confirm Password:</label>
                        <input type="password" name="password_confirm" required><br>

                        <button type="submit" name="register">Register</button>
                    </form>
                    <a href="?action=login">Already have an account? Login here</a>
                </div>
            </body>
            </html>';
            break;

        case 'dashboard':
            // Check if user is logged in
            if (!isset($_SESSION['user_id'])) {
                header("Location: ?action=login");
                exit();
            }

            echo '<html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dashboard</title>
                <link rel="stylesheet" href="styles.css">
            </head>
            <body>
                <div class="container">
                    <h2>Welcome, ' . $_SESSION['username'] . '!</h2>
                    <p>You are logged in.</p>
                    <a href="?action=logout">Logout</a>
                </div>
            </body>
            </html>';
            break;

        default:
            echo 'Page not found!';
            break;
    }
} else {
    // Default to login page
    header("Location: ?action=login");
    exit();
}

?>

<!-- CSS for styling and animations -->
<style>
/* Basic Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    background-color: #f7f7f7;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background: linear-gradient(45deg, #ff7e5f, #feb47b);
    background-size: 400% 400%;
    animation: gradientAnimation 15s ease infinite;
}

/* Live Animated Background */
@keyframes gradientAnimation {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

h2 {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
}

/* Alerts (Error and Success Messages) */
.alert {
    padding: 15px;
    margin: 15px 0;
    border-radius: 8px;
    text-align: center;
}

.alert.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.alert.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

/* Form Styles */
form {
    background: #fff;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    width: 350px;
    animation: fadeIn 1s forwards;
}

label {
    font-weight: 600;
    margin-bottom: 8px;
    display: block;
    font-size: 16px;
}

input {
    width: 100%;
    padding: 12px;
    margin: 10px 0 20px 0;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 14px;
    transition: all 0.3s ease;
    background-color: #fafafa;
}

input:focus {
    border-color: #007bff;
    outline: none;
    background-color: #fff;
}

/* Button Styles */
button {
    width: 100%;
    padding: 12px;
    background-color: #007bff;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.3s ease, transform 0.2s ease-in-out;
}

button:hover {
    background-color: #0056b3;
    transform: translateY(-3px);
}

button:active {
    background-color: #004085;
    transform: translateY(0);
}

/* Links */
a {
    display: block;
    text-align: center;
    margin-top: 20px;
    color: #007bff;
    text-decoration: none;
    font-size: 14px;
    transition: color 0.3s;
}

a:hover {
    color: #0056b3;
}

/* Animations */
@keyframes fadeIn {
    0% {
        transform: translateY(-30px);
        opacity: 0;
    }
    100% {
        transform: translateY(0);
        opacity: 1;
    }
}

/* Responsive design */
@media (max-width: 600px) {
    form {
        width: 90%;
    }
}
</style>

