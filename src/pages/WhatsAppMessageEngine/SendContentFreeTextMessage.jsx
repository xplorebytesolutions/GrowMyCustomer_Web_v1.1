import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import {
  Search,
  Send,
  MessageSquare,
  Phone,
  CheckCircle,
  AlertCircle,
  History,
  X,
  Users,
} from "lucide-react";

// 🎨 Helper for avatar colors
const getAvatarColor = (name) => {
  const colors = [
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name) => {
  return name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

// 📦 Token-style phone number input
function PhoneNumberInput({ numbers, setNumbers }) {
  const [input, setInput] = useState("");

  const handleInputChange = (e) => {
    const value = e.target.value;
    const lastChar = value.slice(-1);
    const isSeparator = /[\n, ]/.test(lastChar);

    if (isSeparator) {
      tryAddPhone(input.trim());
      setInput("");
    } else {
      setInput(value);
    }
  };

  const tryAddPhone = (value) => {
    let normalized = value.replace(/\D/g, "");

    // Auto-add +91 if it's a 10-digit number and no +
    if (/^\d{10}$/.test(normalized)) {
      normalized = "91" + normalized;
    }

    // Accept if it's a valid E.164 format (10–15 digits with optional +)
    if (/^\d{10,15}$/.test(normalized)) {
      if (!numbers.includes(normalized)) {
        setNumbers([...numbers, normalized]);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      tryAddPhone(input.trim());
      setInput("");
      e.preventDefault();
    } else if (e.key === "Backspace" && input === "") {
      setNumbers(numbers.slice(0, -1));
    }
  };

  const removeNumber = (num) => {
    setNumbers(numbers.filter((n) => n !== num));
  };

  return (
    <div className="w-full border border-gray-200 rounded-xl p-2 flex flex-wrap gap-2 min-h-[56px] bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all cursor-text">
      {numbers.map((num, idx) => (
        <span
          key={idx}
          className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full shadow-sm"
        >
          {num}
          <button
            type="button"
            className="text-gray-400 hover:text-red-500 transition-colors"
            onClick={() => removeNumber(num)}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="flex-grow min-w-[120px] bg-transparent p-1 text-sm outline-none placeholder:text-gray-400"
        placeholder="Type number & press Enter"
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default function SendTextMessagePage() {
  const [manualNumbers, setManualNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [messageLogs, setMessageLogs] = useState([]);
  const [saveContact, setSaveContact] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [manualContactName, setManualContactName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await axiosClient.get("/contacts/");
        setContacts(res.data?.data?.items || []);
      } catch (err) {
        console.error("❌ Error loading contacts", err);
        toast.error("Failed to load contacts.");
      }
    };

    const loadHistory = async () => {
      try {
        const res = await axiosClient.get(
          "/reporting/messages/recent?limit=10"
        );
        setMessageLogs(res.data?.data || []);
      } catch (err) {
        console.error("❌ Error loading history", err);
      }
    };

    loadContacts();
    loadHistory();
  }, [submitting]); // Reload history after sending

  const numbers = [...new Set([...manualNumbers, ...selectedNumbers])];

  const digitsOnly = (val) => String(val || "").replace(/\D/g, "");

  const getContactDisplayName = (contact) => {
    const name = String(contact?.name || "").trim();
    const profileName = String(
      contact?.profileName || contact?.ProfileName || ""
    ).trim();

    if (name && name !== "WhatsApp User") return name;
    if (profileName) return profileName;
    return name || "Unknown";
  };

  const findContactByNumber = (num) => {
    const targetDigits = digitsOnly(num);
    return contacts.find((c) => digitsOnly(c?.phoneNumber) === targetDigits);
  };

  const resolveContactNameForSave = (num) => {
    const contact = findContactByNumber(num);
    const displayName = getContactDisplayName(contact);
    if (
      displayName &&
      displayName !== "WhatsApp User" &&
      displayName !== "Unknown"
    ) {
      return displayName;
    }

    if (
      manualNumbers.length === 1 &&
      digitsOnly(manualNumbers[0]) === digitsOnly(num)
    ) {
      const manual = manualContactName.trim();
      return manual || undefined;
    }

    return undefined;
  };

  const handleSend = async () => {
    if (!message || numbers.length === 0) {
      toast.warn("⚠️ Please enter a message and at least one valid number.");
      return;
    }

    setSubmitting(true);
    let success = 0,
      failed = 0;

    for (const number of numbers) {
      try {
        const contactName =
          saveContact ? resolveContactNameForSave(number) : undefined;
        const res = await axiosClient.post(
          "/messageengine/send-contentfree-text",
          {
            recipientNumber: number,
            textContent: message,
            isSaveContact: saveContact,
            contactName,
          }
        );
        // Sometimes backend returns specific structure, fallback to typical checks
        if (res.data?.success || res.status === 200) {
            success++
        } else {
            failed++
        }
      } catch (err) {
        failed++;
        console.error("Send failed:", number, err);
      }
    }

    toast.success(`✅ Sent: ${success}, ❌ Failed: ${failed}`);
    setSubmitting(false);
    setMessage("");
    setManualNumbers([]);
    setSelectedNumbers([]);
    setManualContactName("");
  };

  // Filter contacts
  const filteredContacts = contacts.filter(
    (c) =>
      getContactDisplayName(c).toLowerCase().includes(contactSearch.toLowerCase()) ||
      String(c.phoneNumber || "").includes(contactSearch)
  );

  return (
    <div className="bg-[#F8F9FC] min-h-screen p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 🌟 Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Send className="text-emerald-600" size={24} />
              Send Direct Message
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Compose and send instant text messages to your contacts or new numbers.
            </p>
          </div>
          <button
            onClick={() => navigate("/messages/history")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <History size={16} />
            View Full History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 👈 Left Column: Recipients (Contacts & Manual) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 📇 Contact Selector Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users size={18} className="text-emerald-600" />
                    Select Contacts
                  </h3>
                  <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    {selectedNumbers.length} selected
                  </span>
                </div>
                {/* Search Input */}
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search name or number..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Contact List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedNumbers.includes(contact.phoneNumber);
                    return (
                      <label
                        key={contact.id}
                        className={`group flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border border-transparent ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-100"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={isSelected}
                            onChange={(e) => {
                              const value = contact.phoneNumber;
                              setSelectedNumbers((prev) =>
                                e.target.checked
                                  ? [...prev, value]
                                  : prev.filter((n) => n !== value)
                              );
                            }}
                          />
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-emerald-500 text-white shadow-md scale-105"
                                : getAvatarColor(getContactDisplayName(contact) || "?")
                            }`}
                          >
                            {isSelected ? (
                              <CheckCircle size={16} />
                            ) : (
                              getInitials(getContactDisplayName(contact) || "?")
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              isSelected ? "text-emerald-900" : "text-gray-700"
                            }`}
                          >
                            {getContactDisplayName(contact)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {contact.phoneNumber}
                          </p>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <Search size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">No contacts found</p>
                  </div>
                )}
              </div>
            </div>

            {/* ✍️ Manual Numbers Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Phone size={18} className="text-emerald-600" />
                Manual Entry
              </h3>
              <PhoneNumberInput
                numbers={manualNumbers}
                setNumbers={setManualNumbers}
              />
              <div className="mt-4 flex items-start gap-2">
                <div className="relative flex items-center h-5">
                  <input
                    id="saveContact"
                    type="checkbox"
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    checked={saveContact}
                    onChange={(e) => setSaveContact(e.target.checked)}
                  />
                </div>
                <label htmlFor="saveContact" className="text-xs text-gray-500 leading-tight cursor-pointer select-none">
                  Automatically save new manual numbers to your Contacts list after sending.
                </label>
              </div>

              {saveContact && manualNumbers.length === 1 && numbers.length === 1 && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">
                    Contact name (optional)
                  </label>
                  <input
                    type="text"
                    value={manualContactName}
                    onChange={(e) => setManualContactName(e.target.value)}
                    placeholder="Leave empty to use WhatsApp profile name if available"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              )}
            </div>

          </div>

          {/* 👉 Right Column: Composer & History */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 💬 Composer Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
              <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10">
                <MessageSquare size={120} />
              </div>
              
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 relative z-10">
                <MessageSquare size={18} className="text-emerald-600" />
                Compose Message
              </h3>
              
              <div className="relative z-10">
                <textarea
                  rows={6}
                  className="w-full p-4 text-sm text-gray-700 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none placeholder:text-gray-400"
                  placeholder="Type your message here... (Hit Shift+Enter for new line)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                   <span>
                    Format: 
                    <span className="font-mono mx-1">*bold*</span>
                    <span className="font-mono mx-1">_italic_</span>
                    <span className="font-mono mx-1">~strike~</span>
                   </span>
                   <span className={message.length > 1000 ? "text-amber-500" : ""}>
                     {message.length} characters
                   </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end items-center gap-4 relative z-10">
                <div className="text-right">
                   <p className="text-xs text-gray-500 mb-1">
                     Total Recipients: <strong className="text-gray-900">{numbers.length}</strong>
                   </p>
                </div>
                <button
                  onClick={handleSend}
                  disabled={submitting || numbers.length === 0 || !message}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all transform active:scale-95 ${
                    submitting || numbers.length === 0 || !message
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-xl hover:from-emerald-600 hover:to-teal-700"
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message <Send size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 🕰 Timeline History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <History size={18} className="text-emerald-600" />
                Recent Activity
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                        #
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">
                        Message
                      </th>
                       <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {messageLogs.length > 0 ? (
                      messageLogs.map((log, index) => {
                        const status = log.status?.toLowerCase() || "";
                        const isFailure = ["failed", "undelivered", "rejected", "error"].some(s => status.includes(s));
                        
                        return (
                          <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group text-sm">
                            <td className="px-4 py-3 text-center">
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isFailure ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                 {isFailure ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                               </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {log.recipientNumber}
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={log.messageContent}>
                               {log.messageContent || <span className="italic text-gray-400">No content</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${isFailure ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {log.status || "Unknown"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                              {log.sentAt ? new Date(log.sentAt).toLocaleString() : "Just now"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                             <History size={24} className="opacity-30" />
                             <p>No recent message history</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
