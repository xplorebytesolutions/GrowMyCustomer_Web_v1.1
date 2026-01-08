import { useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient"; // ✅ Added axiosClient import

function BusinessSignup() {
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setError("");

    try {
      const response = await axiosClient.post(
        "/auth/business-user-signup",
        form
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Signup failed. Try again.");
      }

      setSuccessMsg(
        "✅ Signup successful! We'll review and approve your account."
      );
      setForm({ companyName: "", email: "", password: "" });
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "❌ Signup failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center px-6 md:px-20 lg:px-36">
      <div className="flex flex-col md:flex-row w-full max-w-6xl shadow-2xl rounded-3xl overflow-hidden bg-white">
        {/* Left Image Section */}
        <div className="md:w-1/2 hidden md:block">
          <img
            src="/loginpage_.png"
            alt="Marketing Visual"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Right Signup Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-8 sm:px-12 md:px-16 lg:px-20 py-12">
          <div className="flex items-center justify-center gap-0.5 mb-4">
            <img src="/logo/Transparent_logo.png" alt="Logo" className="h-10 w-auto" />
            <span className="text-[22px] font-medium font-brand leading-[36px] text-[#111827]">
              XploreByte
            </span>
          </div>

          <h2 className="text-2xl font-bold text-center text-purple-800 mb-6">
            Create Your <span className="text-purple-900">xByteChat</span>{" "}
            Profile
          </h2>

          {successMsg && (
            <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm text-center font-medium shadow">
              {successMsg}
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center font-medium shadow">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                required
                className="mt-1 w-full p-2 px-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-1 w-full p-2 px-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="mt-1 w-full p-2 px-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-60"
            >
              {loading ? "Creating profile..." : "Create Profile"}
            </button>
          </form>

          <div className="text-center mt-5 text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-purple-600 hover:underline font-medium"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessSignup;
