import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  async function register() {
    setMessage("");
    setIsError(false);

    if (!username.trim() || !email.trim() || !password.trim()) {
      setMessage("All fields are required");
      setIsError(true);
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      setIsError(true);
      return;
    }

    try {
      const result = await apiClient.postText("/api/users/register", { username, email, password });

      if (result !== "Register successful") {
        setMessage(result);
        setIsError(true);
        return;
      }

      setMessage("Register successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1000);
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Register</h1>

        {message && <p className={isError ? "error-message" : "success-message"}>{message}</p>}

        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button onClick={register}>Register</button>

        <p>
          Already have account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
