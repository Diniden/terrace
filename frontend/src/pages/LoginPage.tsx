import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { TextInput } from "../components/common/TextInput";
import "./LoginPage.css";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
      navigate("/projects");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (registerPassword !== registerConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (registerPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await register({ email: registerEmail, password: registerPassword });
      setShowRegister(false);
      navigate("/projects");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginPage">
      <div className="loginPage__card">
        <h1 className="loginPage__title">Terrace</h1>
        <form onSubmit={handleLogin}>
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="Enter your email"
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="Enter your password"
          />
          {error && <div className="loginPage__error">{error}</div>}
          <Button className="loginPage__submitButton" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
          <button
            type="button"
            className="loginPage__linkButton"
            onClick={() => setShowRegister(true)}
            disabled={loading}
          >
            Create New Account
          </button>
        </form>
      </div>

      <Modal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        title="Create New Account"
      >
        <form onSubmit={handleRegister}>
          <TextInput
            label="Email"
            type="email"
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="Enter your email"
          />
          <TextInput
            label="Password"
            type="password"
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            placeholder="At least 6 characters"
          />
          <TextInput
            label="Confirm Password"
            type="password"
            value={registerConfirmPassword}
            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="Re-enter your password"
          />
          {error && <div className="loginPage__error">{error}</div>}
          <div className="loginPage__modalActions">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowRegister(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
