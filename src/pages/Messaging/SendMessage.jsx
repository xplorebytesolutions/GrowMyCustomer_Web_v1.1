import { useState } from "react";
import axiosClient from "../../api/axiosClient";
import { MessageSquare, Phone, Send, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

function SendMessage() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePhone = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleClear = () => {
    setPhone("");
    setMessage("");
    setSuccess(false);
    setError("");
    setErrorDetail("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSuccess(false);
    setError("");
    setErrorDetail("");

    if (!phone || !message) {
      setError("Please fill in all fields.");
      return;
    }

    if (!validatePhone(phone)) {
      setError("Please enter a valid phone number (10-15 digits).");
      return;
    }

    if (message.length > 1000) {
      setError("Message is too long. Maximum 1000 characters allowed.");
      return;
    }

    const payload = {
      recipientNumber: phone,
      messageContent: message,
      businessId: localStorage.getItem("businessId"),
      messageType: "text",
    };

    setLoading(true);

    try {
      const response = await axiosClient.post("/messages/send-text", payload);

      if (response.data.success) {
        setSuccess(true);
        setPhone("");
        setMessage("");
      } else {
        setError(response.data.message || "Message failed to send.");
        setErrorDetail(
          `Error: ${response.data.error || "Unknown"}\nRaw: ${
            response.data.response || "-"
          }`
        );
      }
    } catch (err) {
      console.error("API Error:", err);
      setError("Server error. Please try again.");
      setErrorDetail(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl border border-emerald-100">
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

          {/* Content */}
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-emerald-800">
                  Send WhatsApp Message
                </h2>
                <p className="text-sm text-gray-600">
                  Send instant text messages to your customers
                </p>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
                <div className="p-2 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-800">
                    Message sent successfully!
                  </p>
                  <p className="text-sm text-emerald-600 mt-1">
                    Your message was delivered
                  </p>
                </div>
                <button
                  onClick={() => setSuccess(false)}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-red-800">
                    Failed to send message
                  </p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                  {errorDetail && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
                        Technical details
                      </summary>
                      <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto whitespace-pre-wrap">
                        {errorDetail}
                      </pre>
                    </details>
                  )}
                </div>
                <button
                  onClick={() => {
                    setError("");
                    setErrorDetail("");
                  }}
                  className="text-red-600 hover:text-red-800 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone Number */}
              <div>
                <label
                  htmlFor="phone-input"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  WhatsApp Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-300"
                    placeholder="+91 98765 43210"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Include country code (e.g., +91 for India)
                </p>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message-input"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message
                </label>
                <div className="relative">
                  <textarea
                    id="message-input"
                    rows="5"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none hover:border-emerald-300"
                    placeholder="Type your message here..."
                    disabled={loading}
                    maxLength={1000}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {message.length} / 1000
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-sm text-gray-600 font-medium">
                  Sending your message...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SendMessage;
