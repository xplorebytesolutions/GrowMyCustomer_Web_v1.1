import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Eye,
  EyeOff,
  CheckCircle,
  Gift,
  MessageCircle,
  Megaphone,
  Shield,
  ArrowRight,
  Star,
} from "lucide-react";
import TypewriterHeadline from "../../components/TypewriterHeadline";
import axiosClient from "../../api/axiosClient";

const SignupForTrial = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: "",
    mobileNumber: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleInputChange = e => {
    const { name, value } = e.target;

    if (name === "mobileNumber") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: digitsOnly,
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    if (formData.mobileNumber.length !== 10) {
      setError("Mobile number must be exactly 10 digits");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
      };

      const response = await axiosClient.post(
        "/auth/business-user-signup",
        payload
      );

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Signup failed. Try again.");
      }

      toast.success(
        "Account created successfully! Welcome to XploreByte!"
      );
      navigate("/login");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "❌ Signup failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.companyName &&
    formData.mobileNumber.length === 10 &&
    formData.email &&
    formData.password &&
    acceptTerms;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-4">
      <div className="flex flex-col lg:flex-row w-full max-w-6xl shadow-2xl rounded-2xl overflow-hidden bg-white">
        {/* Left Section - Marketing Panel */}
        <div className="lg:w-1/2 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6 lg:p-8 flex flex-col justify-center overflow-hidden">
          {/* Logo */}
          <div className="mb-6">
            <div className="flex items-center gap-0.5">
              <img
                src="/logo/favicon.svg"
                alt="Logo"
                className="h-14 w-14 p-2.5 object-contain"
              />
              <span className="text-[22px] font-medium font-brand leading-[36px] text-[#111827] tracking-tight">
                XploreByte
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="mb-6 overflow-hidden">
            <div className="w-full">
              <TypewriterHeadline
                phrases={[
                  "WhatsApp Marketing",
                  "WhatsApp Automation",
                  "No-code chatbot builder",
                  "Auto Reply",
                ]}
                baseText="Transform your business with "
                className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3"
              />
            </div>
          </div>

          {/* Promotional Offer */}
          <div className="bg-gradient-to-r from-emerald-600 to-sapphire-600 rounded-xl p-4 mb-6 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Gift className="w-5 h-5" />
              <span className="text-lg font-bold">1 Month FREE Trial</span>
            </div>
            <p className="text-emerald-100 text-sm">
              Start your WhatsApp Business journey with our XploreByte platform
            </p>
          </div>

          {/* Features Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              YOUR FREE TRIAL INCLUDES
            </h3>
            <div className="space-y-3">
              {/* Feature 1 */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      FREE WhatsApp Business API
                    </h4>
                    <p className="text-xs text-gray-600">
                      Instant verification & setup with Meta
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      Advanced AI Campaign Manager
                    </h4>
                    <p className="text-xs text-gray-600">
                      AI-powered campaign optimization & targeting
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-sapphire-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-sapphire-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      FREE Verification Application
                    </h4>
                    <p className="text-xs text-gray-600">
                      Apply for verified WhatsApp Business Account
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          {/* <div className="mt-auto">
            <p className="text-xs text-gray-600 mb-3">Trusted by 700+ Brands</p>
            <div className="flex items-center space-x-4 opacity-60">
              <div className="text-xs font-semibold text-gray-500">
                PhysicsWallah
              </div>
              <div className="text-xs font-semibold text-gray-500">
                Rentomojo
              </div>
              <div className="text-xs font-semibold text-gray-500">
                Skullcandy
              </div>
              <div className="text-xs font-semibold text-gray-500">Vivo</div>
            </div>
          </div> */}
        </div>

        {/* Right Section - Signup Form */}
        <div className="lg:w-1/2 bg-white p-6 lg:p-8 flex flex-col justify-center">
          {/* Top Navigation */}
          <div className="flex justify-end mb-6">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-sapphire-600 transition"
            >
              Already a member?{" "}
              <span className="text-sapphire-600 font-medium">Log in</span>
            </Link>
          </div>

          {/* Form Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Create Your XploreByte Account
            </h2>
            <p className="text-gray-600 text-sm">
              Start your 1-month free trial today
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Personal Information Section */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                placeholder="Enter your company name"
                required
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number *
              </label>
              <div className="flex space-x-1">
                <select
                  name="countryCode"
                  className="px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                >
                  <option value="+91">IN +91</option>
                  <option value="+1">US +1</option>
                  <option value="+44">UK +44</option>
                  <option value="+61">AU +61</option>
                </select>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                  placeholder="Enter 10-digit mobile number"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                placeholder="Enter your email address"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start space-x-3 mt-3">
              <div className="flex items-center h-5">
                <input
                  id="accept-terms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                  required
                />
              </div>
              <div className="text-sm">
                <label htmlFor="accept-terms" className="text-gray-700">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-sapphire-600 hover:underline font-medium"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="text-sapphire-600 hover:underline font-medium"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center space-x-2 ${
                isFormValid && !loading
                  ? "bg-gradient-to-r from-emerald-600 to-sapphire-600 hover:from-emerald-700 hover:to-sapphire-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Start Your FREE Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupForTrial;
